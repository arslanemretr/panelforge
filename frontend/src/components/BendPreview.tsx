/**
 * BendPreview — Büküm tipi önizleme v2
 *
 * Panel 1 — YAN GÖRÜNÜŞ
 *   • Gerçek kalınlıklı bakır gövde (dolgu + iç/dış kenar)
 *   • Büküm çizgileri (kesik + yay simgesi)
 *   • Merkez / İç / Dış ölçü gösterimi
 *   • Paralel bakır (6'ya kadar)
 *
 * Panel 2 — KESİM BOYU (Flat Pattern)
 *   • Düz segment blokları + büküm izin bölgeleri
 *   • BA (Bend Allowance) değerleri
 *   • Toplam kesim boyu
 */

import React from "react";
import type { BendParameter, BendSegment } from "../types";

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface Point { x: number; y: number }

export interface BendPreviewProps {
  segments: BendSegment[];
  parameters: BendParameter[];
  paramValues: Record<string, number>;
  thickness_mm: number;
  parallel_count: number;
  start_direction: "up" | "right";
  height?: number; // artık kullanılmıyor — panel doğal yüksekliğe göre büyür
}

// ─── Sabitler ─────────────────────────────────────────────────────────────────

/** Bakır için K faktörü (bükümde nötr eksen konumu) */
const K_FACTOR = 0.33;

const C = {
  paper:      "#f8fafc",
  border:     "#cbd5e1",
  grid:       "#e2e8f0",
  copper:     "#cd7f32",
  copperFill: "rgba(180,100,30,0.55)",
  copperEdge: "#7c4a1e",
  dimCenter:  "#2563eb",
  dimInner:   "#15803d",
  dimOuter:   "#dc2626",
  dimText:    "#1e40af",
  calc:       "#b91c1c",
  bendLine:   "#64748b",
  label:      "#1e293b",
  startPt:    "#2563eb",
  endPt:      "#16a34a",
  flatSeg:    "rgba(205,127,50,0.15)",
  flatBend:   "rgba(100,116,139,0.18)",
  flatEdge:   "#94a3b8",
};

const COPPER_OPACITY = [1, 0.72, 0.50, 0.36, 0.26, 0.18];

// ─── Geometri motoru ──────────────────────────────────────────────────────────

function evalExpr(expr: string, params: Record<string, number>): number {
  try {
    const sorted = Object.keys(params).sort((a, b) => b.length - a.length);
    let s = expr;
    for (const k of sorted) s = s.replaceAll(k, String(params[k]));
    if (/[^0-9+\-*/().\s]/.test(s)) return 0;
    // eslint-disable-next-line no-new-func
    return Number(Function(`"use strict"; return (${s})`)());
  } catch { return 0; }
}

/** Matematiksel koordinatta centerline noktaları üret (Y yukarı). */
function buildCenterline(
  segments: BendSegment[],
  params: Record<string, number>,
  startDir: "up" | "right",
): Point[] {
  const pts: Point[] = [{ x: 0, y: 0 }];
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

/** Sol normali (p1→p2'ye 90° CCW). */
function segNormal(p1: Point, p2: Point): Point {
  const dx = p2.x - p1.x; const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 0.0001) return { x: 0, y: 0 };
  return { x: -dy / len, y: dx / len };
}

/** Polyline'ı d kadar offset et; köşelerde miter birleşimi. */
function offsetPolyline(pts: Point[], d: number): Point[] {
  if (pts.length < 2) return [];
  const out: Point[] = [];
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) {
      const n = segNormal(pts[0], pts[1]);
      out.push({ x: pts[0].x + n.x * d, y: pts[0].y + n.y * d });
    } else if (i === pts.length - 1) {
      const n = segNormal(pts[i - 1], pts[i]);
      out.push({ x: pts[i].x + n.x * d, y: pts[i].y + n.y * d });
    } else {
      const n1 = segNormal(pts[i - 1], pts[i]);
      const n2 = segNormal(pts[i], pts[i + 1]);
      const mx = n1.x + n2.x; const my = n1.y + n2.y;
      const mlen = Math.hypot(mx, my);
      if (mlen < 0.0001) {
        out.push({ x: pts[i].x + n1.x * d, y: pts[i].y + n1.y * d });
      } else {
        const dot = (n1.x * mx + n1.y * my) / mlen;
        const scale = Math.abs(dot) > 0.15 ? d / dot : Math.sign(d) * Math.abs(d) * 3;
        out.push({ x: pts[i].x + (mx / mlen) * scale, y: pts[i].y + (my / mlen) * scale });
      }
    }
  }
  return out;
}

/** Matematiksel koordinatlardan SVG viewBox'a ölçekle + Y eksenini çevir. */
function fitToViewBox(
  pts: Point[], vbW: number, vbH: number, margin: number,
): { scaled: Point[]; scale: number } {
  if (pts.length === 0) return { scaled: [], scale: 1 };
  const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1; const rangeY = maxY - minY || 1;
  const scale = Math.min((vbW - margin * 2) / rangeX, (vbH - margin * 2) / rangeY, 4);
  const cx = (minX + maxX) / 2; const cy = (minY + maxY) / 2;
  const scaled = pts.map((p) => ({
    x: vbW / 2 + (p.x - cx) * scale,
    y: vbH / 2 - (p.y - cy) * scale,   // Y flip
  }));
  return { scaled, scale };
}

function pStr(pts: Point[]): string {
  return pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

function closedPath(outer: Point[], inner: Point[]): string {
  const rev = [...inner].reverse();
  const o = outer.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
  const i = rev.map((p)  => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
  return `M ${o} L ${i} Z`;
}

/** Büküm izin uzunluğu (K faktörlü). */
function bendAllowance(angleDeg: number, thickness: number): number {
  const r = thickness; // varsayılan iç yarıçap = kalınlık
  return (Math.PI / 180) * Math.abs(angleDeg) * (r + K_FACTOR * thickness);
}

// ─── SVG yardımcıları ─────────────────────────────────────────────────────────

function Grid({ vbW, vbH }: { vbW: number; vbH: number }) {
  return (
    <g opacity={0.35}>
      {Array.from({ length: Math.ceil(vbW / 20) + 1 }, (_, i) => i * 20).map((x) => (
        <line key={`v${x}`} x1={x} y1={0} x2={x} y2={vbH} stroke={C.grid} strokeWidth={0.3} />
      ))}
      {Array.from({ length: Math.ceil(vbH / 20) + 1 }, (_, i) => i * 20).map((y) => (
        <line key={`h${y}`} x1={0} y1={y} x2={vbW} y2={y} stroke={C.grid} strokeWidth={0.3} />
      ))}
    </g>
  );
}

/** Segment boyunca yandan ofsetli boyut oku. */
function DimLine({
  p1, p2, label, color, offsetPx = 18, arrowSize = 4,
}: {
  p1: Point; p2: Point; label: string; color: string;
  offsetPx?: number; arrowSize?: number;
}) {
  const dx = p2.x - p1.x; const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 6) return null;
  const nx = -dy / len; const ny = dx / len;
  const ox = nx * offsetPx; const oy = ny * offsetPx;
  const ux = dx / len; const uy = dy / len;
  const mx = (p1.x + p2.x) / 2 + ox;
  const my = (p1.y + p2.y) / 2 + oy;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (angle > 90 || angle < -90) angle += 180;
  const labelW = Math.max(label.length * 5.5, 32);
  return (
    <g>
      {/* Uzatma uç çizgileri */}
      <line x1={p1.x + nx * (offsetPx - 6)} y1={p1.y + ny * (offsetPx - 6)}
        x2={p1.x + nx * (offsetPx + 6)} y2={p1.y + ny * (offsetPx + 6)}
        stroke={color} strokeWidth={0.5} />
      <line x1={p2.x + nx * (offsetPx - 6)} y1={p2.y + ny * (offsetPx - 6)}
        x2={p2.x + nx * (offsetPx + 6)} y2={p2.y + ny * (offsetPx + 6)}
        stroke={color} strokeWidth={0.5} />
      {/* Boyut çizgisi */}
      <line x1={p1.x + ox} y1={p1.y + oy} x2={p2.x + ox} y2={p2.y + oy}
        stroke={color} strokeWidth={0.7} />
      {/* Ok başları */}
      <polygon stroke="none" fill={color}
        points={`${p1.x + ox + ux * arrowSize},${p1.y + oy + uy * arrowSize} ${p1.x + ox},${p1.y + oy} ${p1.x + ox + nx * arrowSize * 0.6},${p1.y + oy + ny * arrowSize * 0.6}`} />
      <polygon stroke="none" fill={color}
        points={`${p2.x + ox - ux * arrowSize},${p2.y + oy - uy * arrowSize} ${p2.x + ox},${p2.y + oy} ${p2.x + ox - nx * arrowSize * 0.6},${p2.y + oy - ny * arrowSize * 0.6}`} />
      {/* Etiket arka planı */}
      <rect x={mx - labelW / 2} y={my - 6} width={labelW} height={12}
        fill={C.paper} stroke="none" rx={2} opacity={0.88} />
      <text x={mx} y={my} textAnchor="middle" dominantBaseline="central"
        fontSize={7} fill={color} fontFamily="monospace" fontWeight={600}
        transform={`rotate(${angle},${mx},${my})`}>
        {label}
      </text>
    </g>
  );
}

/** Köşedeki büküm çizgisi (kesik) + yay simgesi. */
function BendMark({
  p, prev, next, halfT,
}: { p: Point; prev: Point; next: Point; halfT: number }) {
  const d1x = p.x - prev.x; const d1y = p.y - prev.y;
  const d2x = next.x - p.x; const d2y = next.y - p.y;
  const l1 = Math.hypot(d1x, d1y); const l2 = Math.hypot(d2x, d2y);
  if (l1 < 0.01 || l2 < 0.01) return null;
  // Büküm çizgisi: bisektöre dik
  const n1x = -d1y / l1; const n1y = d1x / l1;
  const n2x = -d2y / l2; const n2y = d2x / l2;
  const bx = n1x + n2x; const by = n1y + n2y;
  const bl = Math.hypot(bx, by);
  if (bl < 0.01) return null;
  const px = bx / bl; const py = by / bl;
  const lineLen = halfT + 18;
  return (
    <g>
      <line
        x1={p.x - px * lineLen} y1={p.y - py * lineLen}
        x2={p.x + px * lineLen} y2={p.y + py * lineLen}
        stroke={C.bendLine} strokeWidth={0.9} strokeDasharray="5 3" opacity={0.75}
      />
      <circle cx={p.x} cy={p.y} r={Math.max(halfT * 0.55, 3)}
        fill="none" stroke={C.bendLine} strokeWidth={0.7} opacity={0.6} />
      <circle cx={p.x} cy={p.y} r={1.8} fill={C.bendLine} opacity={0.7} />
    </g>
  );
}

// ─── Panel 1: Profil ──────────────────────────────────────────────────────────

function ProfilePanel({
  segments, fullParams, thickness_mm, parallel_count, start_direction,
}: {
  segments: BendSegment[];
  fullParams: Record<string, number>;
  thickness_mm: number;
  parallel_count: number;
  start_direction: "up" | "right";
}) {
  const VBW = 520; const VBH = 320;
  const MARGIN = 54 + Math.max(0, parallel_count - 2) * 6;

  const rawPts   = buildCenterline(segments, fullParams, start_direction);
  const { scaled: basePts, scale } = fitToViewBox(rawPts, VBW, VBH, MARGIN);
  const halfT    = (thickness_mm / 2) * scale;

  const outerPts = offsetPolyline(basePts,  halfT);
  const innerPts = offsetPolyline(basePts, -halfT);

  const hasPoints = basePts.length >= 2;

  // Segment gerçek uzunlukları (mm)
  const segLens = segments.map((s) => Math.max(0, evalExpr(s.length_expr, fullParams)));

  // İç/Dış ölçü hesabı: her bükümde ±t/2 sapma
  const innerOuterMm = segments.map((seg, i) => {
    const L = segLens[i];
    const bStart = i > 0 && Number(segments[i].angle_from_prev) !== 0 ? 1 : 0;
    const bEnd   = i < segments.length - 1 && Number(segments[i + 1]?.angle_from_prev) !== 0 ? 1 : 0;
    const t = thickness_mm;
    return {
      inner: L - (bStart + bEnd) * t / 2,
      outer: L + (bStart + bEnd) * t / 2,
      hasBend: bStart + bEnd > 0,
    };
  });

  // Paralel bakır Y ofseti (SVG koordinat)
  const gapPx = (thickness_mm + 3) * scale;

  return (
    <div style={{ background: C.border, borderRadius: 8, padding: 1 }}>
      <div style={{
        padding: "4px 10px", fontSize: "0.72rem", color: "var(--muted)",
        background: "rgba(0,0,0,0.06)", borderRadius: "7px 7px 0 0",
        display: "flex", justifyContent: "space-between",
      }}>
        <span>YAN GÖRÜNÜŞ — Profil · Merkez / İç / Dış ölçü</span>
        <span>
          {parallel_count > 1 ? `${parallel_count}'li Paralel · ` : ""}
          {thickness_mm} mm kalınlık
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VBW} ${VBH}`} width="100%"
        style={{ display: "block", borderRadius: "0 0 7px 7px", background: C.paper }}
        fontFamily="'Courier New',Consolas,monospace"
      >
        <Grid vbW={VBW} vbH={VBH} />

        {!hasPoints && (
          <text x={VBW / 2} y={VBH / 2} textAnchor="middle" dominantBaseline="central"
            fill={C.label} fontSize={11} opacity={0.35}>
            Segment ekleyerek çizimi başlatın
          </text>
        )}

        {hasPoints && (
          <>
            {/* ── Paralel bakır kopyaları ──────────────────────────────── */}
            {Array.from({ length: parallel_count }, (_, ci) => {
              const dy = ci * gapPx;
              const shOuter = outerPts.map((p) => ({ x: p.x, y: p.y + dy }));
              const shInner = innerPts.map((p) => ({ x: p.x, y: p.y + dy }));
              return (
                <g key={ci} opacity={COPPER_OPACITY[ci] ?? 0.15}>
                  <path d={closedPath(shOuter, shInner)} fill={C.copperFill} stroke="none" />
                  <polyline points={pStr(shOuter)} fill="none" stroke={C.copperEdge} strokeWidth={0.9} />
                  <polyline points={pStr(shInner)} fill="none" stroke={C.copperEdge} strokeWidth={0.9} />
                </g>
              );
            })}

            {/* ── Merkez çizgi (ince kesik) ─────────────────────────────── */}
            <polyline points={pStr(basePts)}
              fill="none" stroke={C.copper} strokeWidth={0.6}
              strokeDasharray="5 4" opacity={0.45} />

            {/* ── Büküm çizgileri ve yay simgeleri ─────────────────────── */}
            {basePts.slice(1, -1).map((p, i) => (
              <BendMark key={i} p={p}
                prev={basePts[i]} next={basePts[i + 2]}
                halfT={halfT} />
            ))}

            {/* ── Başlangıç / Bitiş etiketleri ─────────────────────────── */}
            <circle cx={basePts[0].x} cy={basePts[0].y} r={4} fill={C.startPt} />
            <text x={basePts[0].x + 7} y={basePts[0].y + 4}
              fill={C.startPt} fontSize={7.5} fontWeight={700}>Terminal</text>

            <circle cx={basePts[basePts.length - 1].x} cy={basePts[basePts.length - 1].y} r={4} fill={C.endPt} />
            <text x={basePts[basePts.length - 1].x + 7} y={basePts[basePts.length - 1].y + 4}
              fill={C.endPt} fontSize={7.5} fontWeight={700}>Bara</text>

            {/* ── Boyut okları ─────────────────────────────────────────── */}
            {segments.map((seg, i) => {
              const p1 = basePts[i]; const p2 = basePts[i + 1];
              if (!p1 || !p2) return null;
              const isParamName = Object.prototype.hasOwnProperty.call(fullParams, seg.length_expr.trim());
              const centerLabel = isParamName
                ? `${seg.length_expr.trim()}=${segLens[i].toFixed(0)}`
                : `${segLens[i].toFixed(0)}`;
              const { inner, outer, hasBend } = innerOuterMm[i];
              return (
                <g key={i}>
                  {/* Merkez ölçü (mavi, dışa) */}
                  <DimLine p1={p1} p2={p2} label={centerLabel}
                    color={C.dimCenter} offsetPx={halfT + 16} />
                  {/* İç ölçü (yeşil, içe) */}
                  {hasBend && (
                    <DimLine p1={innerPts[i]} p2={innerPts[i + 1]}
                      label={`İç ${inner.toFixed(0)}`}
                      color={C.dimInner} offsetPx={-(halfT + 12)} />
                  )}
                  {/* Dış ölçü (kırmızı, daha dışa) */}
                  {hasBend && (
                    <DimLine p1={outerPts[i]} p2={outerPts[i + 1]}
                      label={`Dış ${outer.toFixed(0)}`}
                      color={C.dimOuter} offsetPx={halfT + 30} />
                  )}
                </g>
              );
            })}

            {/* ── Büküm açı etiketleri ──────────────────────────────────── */}
            {segments.slice(1).map((seg, i) => {
              const angle = Number(seg.angle_from_prev);
              if (!angle || !basePts[i + 1]) return null;
              return (
                <text key={i}
                  x={basePts[i + 1].x + 6} y={basePts[i + 1].y - 8}
                  fill={C.bendLine} fontSize={7} fontWeight={700} fontFamily="system-ui">
                  {angle > 0 ? `+${angle}°` : `${angle}°`}
                </text>
              );
            })}
          </>
        )}

        <rect x={0.5} y={0.5} width={VBW - 1} height={VBH - 1}
          fill="none" stroke={C.border} strokeWidth={0.8} />
      </svg>
    </div>
  );
}

// ─── Panel 2: Kesim Boyu (Flat Pattern) ──────────────────────────────────────

function FlatPatternPanel({
  segments, fullParams, thickness_mm,
}: {
  segments: BendSegment[];
  fullParams: Record<string, number>;
  thickness_mm: number;
}) {
  const VBW = 520; const VBH = 136;
  const STRIP_Y = 50; const STRIP_H = 46;
  const MARGIN_X = 22;

  // Blok listesi: [seg0, bend0→1, seg1, bend1→2, seg2, …]
  const blocks: {
    label: string; length: number; isBend: boolean; angle?: number;
  }[] = [];
  let totalMm = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const angle = Number(seg.angle_from_prev);

    // Büküm bloğu (i>0 ve dönüş varsa)
    if (i > 0 && angle !== 0) {
      const ba = bendAllowance(angle, thickness_mm);
      blocks.push({ label: `${Math.abs(angle)}°`, length: ba, isBend: true, angle });
      totalMm += ba;
    }

    // Düz segment bloğu
    const segLen = Math.max(0, evalExpr(seg.length_expr, fullParams));
    const isParam = Object.prototype.hasOwnProperty.call(fullParams, seg.length_expr.trim());
    const lbl = isParam
      ? `${seg.length_expr.trim()}=${segLen.toFixed(0)}`
      : `${seg.label ? seg.label.substring(0, 8) : "Seg"} ${segLen.toFixed(0)}`;
    blocks.push({ label: lbl, length: segLen, isBend: false });
    totalMm += segLen;
  }

  const hasData = totalMm > 0 && blocks.length > 0;
  const availW = VBW - MARGIN_X * 2;
  const pxPerMm = hasData ? availW / totalMm : 1;

  let curX = MARGIN_X;
  const drawn = blocks.map((b) => {
    const w = Math.max(b.length * pxPerMm, 2);
    const r = { ...b, x: curX, w };
    curX += w;
    return r;
  });

  return (
    <div style={{ background: C.border, borderRadius: 8, padding: 1 }}>
      <div style={{
        padding: "4px 10px", fontSize: "0.72rem", color: "var(--muted)",
        background: "rgba(0,0,0,0.06)", borderRadius: "7px 7px 0 0",
        display: "flex", justifyContent: "space-between",
      }}>
        <span>KESİM BOYU — Flat Pattern  (K={K_FACTOR}, r=t)</span>
        {hasData && (
          <span style={{ fontFamily: "monospace", color: C.dimOuter, fontWeight: 700 }}>
            Toplam: {totalMm.toFixed(1)} mm
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${VBW} ${VBH}`} width="100%"
        style={{ display: "block", borderRadius: "0 0 7px 7px", background: C.paper }}
        fontFamily="'Courier New',Consolas,monospace">

        {!hasData ? (
          <text x={VBW / 2} y={VBH / 2} textAnchor="middle" dominantBaseline="central"
            fill={C.label} fontSize={10} opacity={0.35}>
            Segment ekleyerek başlatın
          </text>
        ) : (
          <>
            {/* Toplam uzunluk oku */}
            <line x1={MARGIN_X} y1={STRIP_Y - 14} x2={MARGIN_X + availW} y2={STRIP_Y - 14}
              stroke={C.dimOuter} strokeWidth={0.8} />
            <polygon fill={C.dimOuter}
              points={`${MARGIN_X + 5},${STRIP_Y - 16} ${MARGIN_X},${STRIP_Y - 14} ${MARGIN_X + 5},${STRIP_Y - 12}`} />
            <polygon fill={C.dimOuter}
              points={`${MARGIN_X + availW - 5},${STRIP_Y - 16} ${MARGIN_X + availW},${STRIP_Y - 14} ${MARGIN_X + availW - 5},${STRIP_Y - 12}`} />
            <rect x={(VBW - 160) / 2} y={STRIP_Y - 24} width={160} height={12}
              fill={C.paper} stroke="none" rx={2} />
            <text x={VBW / 2} y={STRIP_Y - 18} textAnchor="middle" fontSize={8}
              fill={C.dimOuter} fontWeight={700}>
              KESİM BOYU = {totalMm.toFixed(1)} mm
            </text>

            {/* Bloklar */}
            {drawn.map((b, i) => (
              <g key={i}>
                {/* Arka plan */}
                <rect x={b.x} y={STRIP_Y} width={b.w} height={STRIP_H}
                  fill={b.isBend ? C.flatBend : C.flatSeg}
                  stroke={b.isBend ? C.flatEdge : C.copperEdge} strokeWidth={0.7} />

                {/* Büküm bölgesi — tarama çizgileri */}
                {b.isBend && b.w > 6 && (() => {
                  const step = 7;
                  const lines = [];
                  for (let k = -STRIP_H; k < b.w + STRIP_H; k += step) {
                    lines.push(
                      <line key={k}
                        x1={Math.max(b.x, b.x + k)}
                        y1={b.x + k >= b.x ? STRIP_Y : STRIP_Y + (b.x - (b.x + k))}
                        x2={Math.min(b.x + b.w, b.x + k + STRIP_H)}
                        y2={b.x + k + STRIP_H <= b.x + b.w ? STRIP_Y + STRIP_H : STRIP_Y + STRIP_H - ((b.x + k + STRIP_H) - (b.x + b.w))}
                        stroke={C.flatEdge} strokeWidth={0.6} opacity={0.45} />
                    );
                  }
                  return <g clipPath={`url(#bclip${i})`}>{lines}</g>;
                })()}
                {b.isBend && (
                  <defs>
                    <clipPath id={`bclip${i}`}>
                      <rect x={b.x} y={STRIP_Y} width={b.w} height={STRIP_H} />
                    </clipPath>
                  </defs>
                )}

                {/* Etiket */}
                {b.w > 12 && (
                  <text x={b.x + b.w / 2} y={STRIP_Y + STRIP_H / 2}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={Math.min(8, b.w / (b.label.length * 0.58 + 1))}
                    fill={b.isBend ? C.bendLine : C.label}
                    fontWeight={b.isBend ? 500 : 700}>
                    {b.isBend ? `∠${b.label}` : b.label}
                  </text>
                )}

                {/* Alt ek bilgi */}
                {b.w > 14 && (
                  <text x={b.x + b.w / 2} y={STRIP_Y + STRIP_H + 11}
                    textAnchor="middle" fontSize={6.5}
                    fill={b.isBend ? C.bendLine : C.dimCenter}>
                    {b.isBend
                      ? `BA=${b.length.toFixed(1)} mm`
                      : `${b.length.toFixed(0)} mm`}
                  </text>
                )}
              </g>
            ))}

            {/* Şerit üst / alt kenarı (tam genişlik) */}
            <line x1={MARGIN_X} y1={STRIP_Y} x2={MARGIN_X + availW} y2={STRIP_Y}
              stroke={C.copperEdge} strokeWidth={1.2} />
            <line x1={MARGIN_X} y1={STRIP_Y + STRIP_H} x2={MARGIN_X + availW} y2={STRIP_Y + STRIP_H}
              stroke={C.copperEdge} strokeWidth={1.2} />
          </>
        )}

        <rect x={0.5} y={0.5} width={VBW - 1} height={VBH - 1}
          fill="none" stroke={C.border} strokeWidth={0.8} />
      </svg>
    </div>
  );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────

export function BendPreview({
  segments,
  parameters,
  paramValues,
  thickness_mm,
  parallel_count,
  start_direction,
}: BendPreviewProps) {
  // Hesaplanan parametreleri çöz
  const fullParams = { ...paramValues };
  for (const p of parameters) {
    if (p.is_calculated && p.formula) {
      fullParams[p.name] = evalExpr(p.formula, fullParams);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <ProfilePanel
        segments={segments}
        fullParams={fullParams}
        thickness_mm={thickness_mm}
        parallel_count={parallel_count}
        start_direction={start_direction}
      />
      <FlatPatternPanel
        segments={segments}
        fullParams={fullParams}
        thickness_mm={thickness_mm}
      />
    </div>
  );
}
