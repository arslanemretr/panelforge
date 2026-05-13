/**
 * BendPreview — Büküm tipi canlı SVG önizlemesi
 *
 * Sadece YAN GÖRÜNÜŞ (2D profil). Backend'e istek atmaz.
 * Parametreler değişince anında yeniden render edilir.
 *
 * Koordinat sistemi:
 *   - Orijin: sol-alt (SVG'de Y ters olduğundan transform uygulanır)
 *   - start_direction="up"   → ilk segment yukarı gider (açı=90°)
 *   - start_direction="right"→ ilk segment sağa gider  (açı=0°)
 *
 * Paralel bakır:
 *   parallel_count > 1 ise polyline, thickness_mm + GAP kadar
 *   kaydırılarak çoğaltılır (her kopya farklı opaklıkta).
 */

import type { BendParameter, BendSegment } from "../types";

// ── Tipler ────────────────────────────────────────────────────────────────────

interface Point { x: number; y: number }

export interface BendPreviewProps {
  segments: BendSegment[];
  parameters: BendParameter[];
  /** Kullanıcının formdaki anlık parametre değerleri: { A1: 100, B: 60, … } */
  paramValues: Record<string, number>;
  thickness_mm: number;
  parallel_count: number;
  start_direction: "up" | "right";
  height?: number;
}

// ── Renk sabitleri ───────────────────────────────────────────────────────────

const C = {
  paper:   "#f4f6f8",
  border:  "#c8d4e0",
  copper:  "#b87333",
  copperS: "#8b5e3c",
  dim:     "#2d5a8e",
  dimText: "#1e3a5f",
  calc:    "#b03030",   // hesaplanan parametreler kırmızı
  grid:    "#dce6ef",
  label:   "#1a2e3d",
};

const COPPER_OPACITY = [1, 0.75, 0.55, 0.40]; // paralel bakır opaklıkları

// ── Geometri motoru ───────────────────────────────────────────────────────────

/** Parametre ifadesini sayıya çevirir. Güvenli: sadece +−×÷() ve rakam. */
function evalExpr(expr: string, params: Record<string, number>): number {
  try {
    // Parametre isimlerini (uzundan kısaya sıralı) değerleriyle değiştir
    const sorted = Object.keys(params).sort((a, b) => b.length - a.length);
    let s = expr;
    for (const k of sorted) {
      s = s.replaceAll(k, String(params[k]));
    }
    // Güvenlik: sadece sayı, boşluk, operatör ve paranteze izin ver
    if (/[^0-9+\-*/().\s]/.test(s)) return 0;
    // eslint-disable-next-line no-new-func
    return Number(Function(`"use strict"; return (${s})`)());
  } catch {
    return 0;
  }
}

/** Segmentlerden 2D polyline noktaları üretir (gerçek mm cinsinden). */
function buildPolyline(
  segments: BendSegment[],
  params: Record<string, number>,
  startDir: "up" | "right",
): Point[] {
  const pts: Point[] = [{ x: 0, y: 0 }];
  // SVG Y ekseni aşağı → math Y'yi çizim sonunda çevireceğiz;
  // burada matematiksel koordinat kullanıyoruz (Y yukarı pozitif).
  let angleDeg = startDir === "up" ? 90 : 0;

  for (const seg of segments) {
    angleDeg += Number(seg.angle_from_prev);
    const len = Math.max(0, evalExpr(seg.length_expr, params));
    const last = pts[pts.length - 1];
    pts.push({
      x: last.x + len * Math.cos((angleDeg * Math.PI) / 180),
      y: last.y + len * Math.sin((angleDeg * Math.PI) / 180),
    });
  }
  return pts;
}

/** Polyline noktalarını SVG viewBox'a sığdırmak için ölçekler ve çevirir. */
function fitToViewBox(
  pts: Point[],
  vbW: number,
  vbH: number,
  margin: number,
): { scaled: Point[]; scale: number } {
  if (pts.length === 0) return { scaled: [], scale: 1 };

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const scale = Math.min(
    (vbW - margin * 2) / rangeX,
    (vbH - margin * 2) / rangeY,
  );

  // Y ekseni çevirimi: math Y↑ → SVG Y↓
  const scaled = pts.map((p) => ({
    x: margin + (p.x - minX) * scale,
    y: vbH - margin - (p.y - minY) * scale,
  }));

  return { scaled, scale };
}

// ── SVG yardımcıları ──────────────────────────────────────────────────────────

function polylineStr(pts: Point[]): string {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

/** Segment ortasına dik konumda boyut etiketi. */
function SegmentLabel({
  p1, p2, label, isCalc = false,
}: {
  p1: Point; p2: Point; label: string; isCalc?: boolean;
}) {
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return null;

  // Segmente dik yön (sol taraf offset)
  const nx = (-dy / len) * 14;
  const ny = (dx / len) * 14;

  // Metin rotasyonu — segment yönünde
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle > 90 || angle < -90) angle += 180; // her zaman okunabilir

  return (
    <g>
      {/* boyut çizgisi */}
      <line
        x1={p1.x + nx * 0.6} y1={p1.y + ny * 0.6}
        x2={p2.x + nx * 0.6} y2={p2.y + ny * 0.6}
        stroke={isCalc ? C.calc : C.dim}
        strokeWidth={0.6}
        strokeDasharray={isCalc ? "3 2" : undefined}
      />
      {/* uzatma uç çizgileri */}
      <line x1={p1.x} y1={p1.y} x2={p1.x + nx} y2={p1.y + ny}
        stroke={isCalc ? C.calc : C.dim} strokeWidth={0.4} />
      <line x1={p2.x} y1={p2.y} x2={p2.x + nx} y2={p2.y + ny}
        stroke={isCalc ? C.calc : C.dim} strokeWidth={0.4} />
      {/* etiket */}
      <text
        x={mx + nx} y={my + ny}
        fill={isCalc ? C.calc : C.dimText}
        fontSize={8}
        textAnchor="middle"
        dominantBaseline="central"
        transform={`rotate(${angle},${mx + nx},${my + ny})`}
        style={{ fontFamily: "monospace" }}
      >
        {label}
      </text>
    </g>
  );
}

/** Büküm köşesinde küçük yay simgesi. */
function BendArc({ p, r = 5 }: { p: Point; r?: number }) {
  return (
    <circle
      cx={p.x} cy={p.y} r={r}
      fill="none"
      stroke={C.copperS}
      strokeWidth={0.8}
      opacity={0.5}
    />
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export function BendPreview({
  segments,
  parameters,
  paramValues,
  thickness_mm,
  parallel_count,
  start_direction,
  height = 420,
}: BendPreviewProps) {
  const VBW = 320;
  const VBH = 300;
  const MARGIN = 36;
  const THICK_GAP = Math.max(thickness_mm, 3) + 3; // paralel bakır arası boşluk

  // Hesaplanan parametrelerin değerlerini paramValues üzerine uygula
  const fullParams = { ...paramValues };
  for (const p of parameters) {
    if (p.is_calculated && p.formula) {
      fullParams[p.name] = evalExpr(p.formula, fullParams);
    }
  }

  // Polyline oluştur
  const rawPts = buildPolyline(segments, fullParams, start_direction);
  const { scaled: basePts, scale } = fitToViewBox(
    rawPts,
    VBW,
    VBH,
    MARGIN + (parallel_count - 1) * THICK_GAP * 0.5,
  );

  // Paralel bakır kopyaları: orijinalden thickness_mm kadar dışarı kaydır
  // Kaydırma yönü: polyline'a dik, sağ taraf
  const parallelOffsets = Array.from({ length: parallel_count }, (_, i) => {
    // Her kopya sola doğru ofset alır
    return i * (thickness_mm + THICK_GAP) * scale;
  });

  // Kopya polyline'ları üret (orijinal + ekstralar)
  const allPolylines = parallelOffsets.map((offsetPx) =>
    basePts.map((p) => ({
      x: p.x - offsetPx * 0, // sadece düz kaydırma için
      y: p.y - offsetPx,     // dikey kaydırma (paralel)
    })),
  );

  // Segment etiketleri ve boyut okları
  const segmentLabels: Array<{
    p1: Point; p2: Point; label: string; isCalc: boolean;
  }> = [];

  for (let i = 0; i < segments.length; i++) {
    if (basePts[i] && basePts[i + 1]) {
      const seg = segments[i];
      const len = evalExpr(seg.length_expr, fullParams);
      // İfade, parametre adıysa direkt adı göster; değilse değeri göster
      const isParamName = parameters.some((p) => p.name === seg.length_expr);
      const displayLabel = isParamName
        ? `${seg.length_expr} = ${len.toFixed(0)}`
        : `${seg.label} = ${len.toFixed(0)}`;

      segmentLabels.push({
        p1: basePts[i],
        p2: basePts[i + 1],
        label: displayLabel,
        isCalc: false,
      });
    }
  }

  // Hesaplanan parametreler için özel gösterim (toplam yükseklik vs.)
  const calcLabels: Array<{ name: string; value: number }> = parameters
    .filter((p) => p.is_calculated && p.formula)
    .map((p) => ({ name: p.name, value: evalExpr(p.formula!, fullParams) }));

  const hasPoints = basePts.length >= 2;
  const copperStrokeW = Math.max(thickness_mm * scale * 0.4, 2);

  return (
    <div
      style={{
        width: "100%",
        height,
        background: C.border,
        borderRadius: 10,
        padding: 1,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Başlık şeridi */}
      <div
        style={{
          padding: "4px 10px",
          fontSize: "0.72rem",
          color: "var(--muted)",
          background: "rgba(0,0,0,0.06)",
          borderRadius: "9px 9px 0 0",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>YAN GÖRÜNÜŞ — Canlı Önizleme</span>
        <span>
          {parallel_count > 1 ? `${parallel_count}'li Paralel · ` : ""}
          {thickness_mm} mm kalınlık
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VBW} ${VBH}`}
        width="100%"
        style={{ flex: 1, display: "block", borderRadius: "0 0 9px 9px", background: C.paper }}
        fontFamily="'Courier New', Consolas, monospace"
      >
        {/* Grid */}
        <g opacity={0.35}>
          {Array.from({ length: Math.ceil(VBW / 20) + 1 }, (_, i) => i * 20).map((x) => (
            <line key={`gv${x}`} x1={x} y1={0} x2={x} y2={VBH}
              stroke={C.grid} strokeWidth={0.3} />
          ))}
          {Array.from({ length: Math.ceil(VBH / 20) + 1 }, (_, i) => i * 20).map((y) => (
            <line key={`gh${y}`} x1={0} y1={y} x2={VBW} y2={y}
              stroke={C.grid} strokeWidth={0.3} />
          ))}
        </g>

        {!hasPoints && (
          <text x={VBW / 2} y={VBH / 2} textAnchor="middle" fill={C.dimText}
            fontSize={11} dominantBaseline="central" opacity={0.5}>
            Segment ekleyerek çizimi başlatın
          </text>
        )}

        {hasPoints && (
          <>
            {/* Paralel bakır kopyaları (arka→ön sırasıyla) */}
            {allPolylines.map((pts, idx) => (
              <g key={idx} opacity={COPPER_OPACITY[idx] ?? 0.3}>
                {/* Dolgu gövde */}
                <polyline
                  points={polylineStr(pts)}
                  fill="none"
                  stroke={C.copper}
                  strokeWidth={copperStrokeW}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Kenarlık */}
                <polyline
                  points={polylineStr(pts)}
                  fill="none"
                  stroke={C.copperS}
                  strokeWidth={0.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ))}

            {/* Büküm köşe yayları (sadece ana kopya) */}
            {basePts.slice(1, -1).map((p, i) => (
              <BendArc key={i} p={p} r={Math.max(3, thickness_mm * scale * 0.3)} />
            ))}

            {/* Başlangıç noktası işareti */}
            <circle
              cx={basePts[0].x} cy={basePts[0].y} r={3}
              fill={C.dim} opacity={0.7}
            />
            <text
              x={basePts[0].x + 5} y={basePts[0].y + 3}
              fill={C.dim} fontSize={6.5}
            >
              Terminal
            </text>

            {/* Bitiş noktası işareti */}
            <circle
              cx={basePts[basePts.length - 1].x}
              cy={basePts[basePts.length - 1].y}
              r={3}
              fill="#2d8e2d" opacity={0.7}
            />
            <text
              x={basePts[basePts.length - 1].x + 5}
              y={basePts[basePts.length - 1].y + 3}
              fill="#2d8e2d" fontSize={6.5}
            >
              Bara
            </text>

            {/* Segment boyut etiketleri */}
            {segmentLabels.map((sl, i) => (
              <SegmentLabel key={i} p1={sl.p1} p2={sl.p2} label={sl.label} isCalc={sl.isCalc} />
            ))}

            {/* Hesaplanan parametreler — sağ üst köşede liste */}
            {calcLabels.length > 0 && (
              <g>
                <rect x={VBW - 90} y={6} width={84} height={calcLabels.length * 13 + 6}
                  fill="rgba(176,48,48,0.07)" stroke={C.calc} strokeWidth={0.5} rx={3} />
                {calcLabels.map((cl, i) => (
                  <text key={i} x={VBW - 84} y={14 + i * 13}
                    fill={C.calc} fontSize={7.5} dominantBaseline="central">
                    {cl.name} = {cl.value.toFixed(1)} mm
                  </text>
                ))}
              </g>
            )}
          </>
        )}

        {/* Dış çerçeve */}
        <rect x={0.5} y={0.5} width={VBW - 1} height={VBH - 1}
          fill="none" stroke={C.border} strokeWidth={0.8} />
      </svg>
    </div>
  );
}
