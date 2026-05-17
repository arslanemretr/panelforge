/**
 * DeviceOrthographicPreview
 *
 * Dark-theme ortografik cihaz önizleme — PanelOrthographicPreview ile aynı stil.
 * 4 görünüm: ÖN · YAN · ÜST · ARKA
 *
 * Koordinat sistemi (assembly):
 *   X → sağ   (assembly sol dış duvarından)
 *   Y ↑ yukarı (cabinet.bm + cihaz y_mm)
 *   Z → derinlik, 0 = ön yüzey
 *
 * ARKA görünüm: X ekseni ayna (TW − x − w)
 */

import type { Panel, ProjectDevice, ProjectPanel } from "../../types";
import { buildCabinetLayouts, deviceBoxes, DEVICE_COLORS } from "./viewHelpers";

// ── Renk paleti ────────────────────────────────────────────────────────────────
const BG     = "#1a1f2b";
const C_BG2  = "#0d1117";
const C_OUT  = "#64748b";
const C_FILL = "rgba(100,116,139,0.08)";
const C_SEP  = "#334155";
const C_MAR  = "#f97316";
const C_MFIL = "rgba(249,115,22,0.06)";
const C_DIM  = "#94a3b8";
const C_MUT  = "#475569";

// ── Layout sabitleri ───────────────────────────────────────────────────────────
const VW     = 520;
const PAD    = 18;
const VIEW_W = VW - 2 * PAD;  // 484
const VIEW_H = 150;
const LROW_H = 14;
const LROW_G = 5;
const INFO_H = 16;
const INFO_G = 4;
const SECT   = 28;

// 4 bölüm: ÖN / YAN / ÜST / ARKA
const S1_LY = PAD;
const S1_VY = S1_LY + LROW_H + LROW_G;
const S1_IY = S1_VY + VIEW_H + INFO_G;
const S2_LY = S1_IY + INFO_H + SECT;
const S2_VY = S2_LY + LROW_H + LROW_G;
const S2_IY = S2_VY + VIEW_H + INFO_G;
const S3_LY = S2_IY + INFO_H + SECT;
const S3_VY = S3_LY + LROW_H + LROW_G;
const S3_IY = S3_VY + VIEW_H + INFO_G;
const S4_LY = S3_IY + INFO_H + SECT;
const S4_VY = S4_LY + LROW_H + LROW_G;
const S4_IY = S4_VY + VIEW_H + INFO_G;
const LEG_Y = S4_IY + INFO_H + SECT - 4;
const SVG_H = LEG_Y + 18 + PAD;

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  panel?: Panel | null;
  projectPanels: ProjectPanel[];
  devices: ProjectDevice[];
  /** Seçili cihaz vurgusu için ProjectDevice.id */
  highlightId?: number | null;
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────
function fit(dw: number, dh: number) {
  const sc = Math.min(
    (VIEW_W * 0.84) / Math.max(dw, 1),
    (VIEW_H * 0.84) / Math.max(dh, 1),
  );
  return {
    sc,
    ox: PAD + (VIEW_W - dw * sc) / 2,
    bh: dh * sc,
  };
}

function fmt(v: number) {
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export function DeviceOrthographicPreview({
  panel,
  projectPanels,
  devices,
  highlightId,
}: Props) {
  const { layouts, maxHeight, maxDepth } =
    buildCabinetLayouts(projectPanels, panel ?? null);

  // Kabin yoksa boş placeholder
  if (layouts.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${VW} 80`}
        width="100%"
        style={{ display: "block", background: BG, borderRadius: 8 }}
      >
        <text
          x={VW / 2} y={44}
          textAnchor="middle" fill={C_MUT}
          fontSize={12} fontFamily="monospace"
        >
          Kabin seçilmedi
        </text>
      </svg>
    );
  }

  const boxes    = deviceBoxes(devices, layouts);
  const TW       = layouts.reduce((acc, l) => Math.max(acc, l.assemblyX + l.cW), 0);
  const MH       = maxHeight > 0 ? maxHeight : 200;
  const MD       = maxDepth  > 0 ? maxDepth  : 300;
  const hasDepth = maxDepth > 0;

  // Vurgulanan cihazın colorIndex'i
  const highlightColorIdx = highlightId != null
    ? devices.findIndex((d) => d.id === highlightId)
    : -1;

  const deepestLayout = layouts.reduce(
    (a, b) => (b.cD > a.cD ? b : a),
    layouts[0],
  );

  // Scale / offset per view
  const f  = fit(TW, MH);          // ön
  const s  = hasDepth ? fit(MD, MH)  : null;  // yan
  const t  = hasDepth ? fit(TW, MD)  : null;  // üst
  const bk = fit(TW, MH);          // arka (ayna)

  const f_vy  = S1_VY + (VIEW_H - f.bh)  / 2;
  const s_vy  = s  ? S2_VY + (VIEW_H - s.bh)  / 2 : S2_VY + VIEW_H / 2;
  const t_vy  = t  ? S3_VY + (VIEW_H - t.bh)  / 2 : S3_VY + VIEW_H / 2;
  const bk_vy = S4_VY + (VIEW_H - bk.bh) / 2;

  // ── Kabin çizici (ön ve arka görünüm için) ─────────────────────────────────
  function Cabinet({
    assemblyX, cW, cH, lm, rm, tm, bm, idx, mirror,
    f: { sc, ox }, vy,
  }: {
    assemblyX: number; cW: number; cH: number;
    lm: number; rm: number; tm: number; bm: number;
    idx: number; mirror?: boolean;
    f: { sc: number; ox: number }; vy: number;
  }) {
    const mirX = mirror ? TW - assemblyX - cW : assemblyX;
    const bx   = ox + mirX * sc;
    const bw   = cW * sc;
    const bh   = cH * sc;
    const by   = vy + (MH - cH) * sc;
    const hasM = lm + rm + tm + bm > 0;
    // Doldurma alanı: back-view'da sol/sağ marjin yer değiştirir
    const intLm = mirror ? rm : lm;
    const intRm = mirror ? lm : rm;
    return (
      <g>
        <rect x={bx} y={by} width={bw} height={bh}
          fill={C_FILL} stroke={C_OUT} strokeWidth={1.5} />
        {/* Kabin ayırıcı çizgi — back-view'da sol kenara, ön-view'da sağ kenara */}
        {idx < layouts.length - 1 && (
          mirror
            ? <line x1={bx}    y1={vy} x2={bx}    y2={vy + MH * sc} stroke={C_SEP} strokeWidth={0.5} strokeDasharray="3 3" />
            : <line x1={bx+bw} y1={vy} x2={bx+bw} y2={vy + MH * sc} stroke={C_SEP} strokeWidth={0.5} strokeDasharray="3 3" />
        )}
        {hasM && (
          <rect
            x={bx + intLm * sc} y={by + tm * sc}
            width={(cW - lm - rm) * sc} height={(cH - tm - bm) * sc}
            fill={C_MFIL} stroke={C_MAR} strokeWidth={1} strokeDasharray="4 3"
          />
        )}
      </g>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${VW} ${SVG_H}`}
      width="100%"
      style={{ display: "block", background: BG, borderRadius: 8, userSelect: "none" }}
    >

      {/* ════════════════════════════════════════════════════════════════
          ÖN GÖRÜNÜM  (X → sağ, Y ↑)
      ════════════════════════════════════════════════════════════════ */}
      <text x={PAD} y={S1_LY+LROW_H-2} fill={C_MUT} fontSize={10} fontFamily="monospace" letterSpacing={1.2}>ÖN GÖRÜNÜM</text>
      <rect x={PAD} y={S1_VY} width={VIEW_W} height={VIEW_H} rx={4} fill={C_BG2} />

      {layouts.map((cl, idx) => (
        <Cabinet key={idx} {...cl} idx={idx} f={f} vy={f_vy} />
      ))}

      {boxes.map((box, idx) => {
        const { fill, stroke } = DEVICE_COLORS[box.colorIndex % DEVICE_COLORS.length];
        const isHL = box.colorIndex === highlightColorIdx;
        const bx   = f.ox + box.x * f.sc;
        const by   = f_vy + (MH - box.y - box.h) * f.sc;
        const bw   = Math.max(box.w * f.sc, 2);
        const bh   = Math.max(box.h * f.sc, 2);
        const fs   = Math.min(8, bh * 0.38, bw * 0.18);
        return (
          <g key={idx}>
            <rect x={bx} y={by} width={bw} height={bh}
              fill={fill} stroke={stroke}
              strokeWidth={isHL ? 2 : 0.8} rx={1} opacity={0.9}
            />
            {isHL && (
              <rect x={bx-1} y={by-1} width={bw+2} height={bh+2}
                fill="none" stroke="#22d3ee" strokeWidth={1.5} rx={2} />
            )}
            {fs >= 4 && bh > 10 && bw > 14 && (
              <text x={bx+bw/2} y={by+bh/2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={fs} fill={stroke} fontWeight="600" fontFamily="monospace">
                {box.label}
              </text>
            )}
          </g>
        );
      })}

      <text x={VW/2} y={S1_IY+INFO_H-2} textAnchor="middle" fill={C_DIM} fontSize={10} fontFamily="monospace">
        G: {fmt(TW)} mm  ×  Y: {fmt(MH)} mm
        {boxes.length > 0 ? `  ·  ${boxes.length} cihaz` : ""}
      </text>

      {/* ════════════════════════════════════════════════════════════════
          YAN GÖRÜNÜM  (Z → sağ, Y ↑)
      ════════════════════════════════════════════════════════════════ */}
      <text x={PAD} y={S2_LY+LROW_H-2} fill={C_MUT} fontSize={10} fontFamily="monospace" letterSpacing={1.2}>YAN GÖRÜNÜM</text>
      <rect x={PAD} y={S2_VY} width={VIEW_W} height={VIEW_H} rx={4} fill={C_BG2} />

      {hasDepth && s ? (
        <>
          {/* En derin kabinin profili */}
          <rect
            x={s.ox} y={s_vy}
            width={deepestLayout.cD * s.sc} height={deepestLayout.cH * s.sc}
            fill={C_FILL} stroke={C_OUT} strokeWidth={1.5}
          />
          {(deepestLayout.tm > 0 || deepestLayout.bm > 0) && (
            <rect
              x={s.ox} y={s_vy + deepestLayout.tm * s.sc}
              width={deepestLayout.cD * s.sc}
              height={(deepestLayout.cH - deepestLayout.tm - deepestLayout.bm) * s.sc}
              fill={C_MFIL} stroke={C_MAR} strokeWidth={1} strokeDasharray="4 3"
            />
          )}
          {/* Ön yüzey çizgisi */}
          <line
            x1={s.ox} y1={s_vy}
            x2={s.ox} y2={s_vy + deepestLayout.cH * s.sc}
            stroke={C_OUT} strokeWidth={2.5}
          />
          {/* Arka yüzey çizgisi */}
          <line
            x1={s.ox + deepestLayout.cD * s.sc} y1={s_vy}
            x2={s.ox + deepestLayout.cD * s.sc} y2={s_vy + deepestLayout.cH * s.sc}
            stroke={C_OUT} strokeWidth={1}
          />
          {/* "Ön" / "Arka" etiketleri */}
          <text x={s.ox + 3}                         y={s_vy + 10} fill={C_DIM} fontSize={8} fontFamily="monospace">Ön</text>
          <text x={s.ox + deepestLayout.cD * s.sc - 3} y={s_vy + 10} textAnchor="end" fill={C_DIM} fontSize={8} fontFamily="monospace">Arka</text>

          {/* Cihazlar — ZY projeksiyonu */}
          {boxes.map((box, idx) => {
            const { fill, stroke } = DEVICE_COLORS[box.colorIndex % DEVICE_COLORS.length];
            const bx = s.ox + box.z * s.sc;
            const by = s_vy + (MH - box.y - box.h) * s.sc;
            const bw = Math.max((box.d > 0 ? box.d : 2) * s.sc, 2);
            const bh = Math.max(box.h * s.sc, 2);
            return (
              <rect key={idx} x={bx} y={by} width={bw} height={bh}
                fill={fill} stroke={stroke} strokeWidth={0.8} rx={1} opacity={0.85}
              />
            );
          })}
        </>
      ) : (
        <text x={VW/2} y={S2_VY+VIEW_H/2+4} textAnchor="middle" fill={C_MUT} fontSize={11} fontFamily="monospace">
          derinlik girilmedi
        </text>
      )}

      <text x={VW/2} y={S2_IY+INFO_H-2} textAnchor="middle" fill={C_DIM} fontSize={10} fontFamily="monospace">
        D: {hasDepth ? `${fmt(MD)} mm` : "—"}  ×  Y: {fmt(MH)} mm
      </text>

      {/* ════════════════════════════════════════════════════════════════
          ÜST GÖRÜNÜM  (X → sağ, Z ↓=derinlik)
      ════════════════════════════════════════════════════════════════ */}
      <text x={PAD} y={S3_LY+LROW_H-2} fill={C_MUT} fontSize={10} fontFamily="monospace" letterSpacing={1.2}>ÜST GÖRÜNÜM</text>
      <rect x={PAD} y={S3_VY} width={VIEW_W} height={VIEW_H} rx={4} fill={C_BG2} />

      {hasDepth && t ? (
        <>
          {layouts.map((cl, idx) => {
            if (cl.cD <= 0) return null;
            const bx = t.ox + cl.assemblyX * t.sc;
            const bw = cl.cW * t.sc;
            const bh = cl.cD * t.sc;
            return (
              <g key={idx}>
                <rect x={bx} y={t_vy} width={bw} height={bh}
                  fill={C_FILL} stroke={C_OUT} strokeWidth={1.5} />
                {/* Ön yüzey vurgusu */}
                <rect x={bx} y={t_vy} width={bw} height={Math.max(2, 2 * t.sc)}
                  fill={C_OUT} opacity={0.4} />
                {idx < layouts.length - 1 && (
                  <line x1={bx+bw} y1={t_vy} x2={bx+bw} y2={t_vy+MD*t.sc}
                    stroke={C_SEP} strokeWidth={0.5} strokeDasharray="3 3" />
                )}
                {(cl.lm > 0 || cl.rm > 0) && (
                  <rect
                    x={bx + cl.lm * t.sc} y={t_vy}
                    width={(cl.cW - cl.lm - cl.rm) * t.sc} height={bh}
                    fill={C_MFIL} stroke={C_MAR} strokeWidth={1} strokeDasharray="4 3"
                  />
                )}
              </g>
            );
          })}
          {/* "Ön" / "Arka" etiketleri */}
          <text x={f.ox + 3}    y={t_vy + 9}          fill={C_DIM} fontSize={8} fontFamily="monospace">Ön</text>
          <text x={f.ox + 3}    y={t_vy + MD * t.sc - 3} fill={C_DIM} fontSize={8} fontFamily="monospace">Arka</text>

          {/* Cihazlar — XZ projeksiyonu */}
          {boxes.map((box, idx) => {
            const { fill, stroke } = DEVICE_COLORS[box.colorIndex % DEVICE_COLORS.length];
            const bx = t.ox + box.x * t.sc;
            const by = t_vy + box.z * t.sc;
            const bw = Math.max(box.w * t.sc, 2);
            const bh = Math.max((box.d > 0 ? box.d : 2) * t.sc, 2);
            return (
              <rect key={idx} x={bx} y={by} width={bw} height={bh}
                fill={fill} stroke={stroke} strokeWidth={0.8} rx={1} opacity={0.8}
              />
            );
          })}
        </>
      ) : (
        <text x={VW/2} y={S3_VY+VIEW_H/2+4} textAnchor="middle" fill={C_MUT} fontSize={11} fontFamily="monospace">
          derinlik girilmedi
        </text>
      )}

      <text x={VW/2} y={S3_IY+INFO_H-2} textAnchor="middle" fill={C_DIM} fontSize={10} fontFamily="monospace">
        G: {fmt(TW)} mm  ×  D: {hasDepth ? `${fmt(MD)} mm` : "—"}
      </text>

      {/* ════════════════════════════════════════════════════════════════
          ARKA GÖRÜNÜM  (X ayna, Y ↑)
      ════════════════════════════════════════════════════════════════ */}
      <text x={PAD} y={S4_LY+LROW_H-2} fill={C_MUT} fontSize={10} fontFamily="monospace" letterSpacing={1.2}>ARKA GÖRÜNÜM</text>
      <rect x={PAD} y={S4_VY} width={VIEW_W} height={VIEW_H} rx={4} fill={C_BG2} />

      {layouts.map((cl, idx) => (
        <Cabinet key={idx} {...cl} idx={idx} mirror f={bk} vy={bk_vy} />
      ))}

      {boxes.map((box, idx) => {
        const { fill, stroke } = DEVICE_COLORS[box.colorIndex % DEVICE_COLORS.length];
        const isHL  = box.colorIndex === highlightColorIdx;
        // Ayna X: sağdan soldan yer değiştirir
        const mirX  = TW - box.x - box.w;
        const bx    = bk.ox + mirX * bk.sc;
        const by    = bk_vy + (MH - box.y - box.h) * bk.sc;
        const bw    = Math.max(box.w * bk.sc, 2);
        const bh    = Math.max(box.h * bk.sc, 2);
        const fs    = Math.min(8, bh * 0.38, bw * 0.18);
        return (
          <g key={idx}>
            <rect x={bx} y={by} width={bw} height={bh}
              fill={fill} stroke={stroke}
              strokeWidth={isHL ? 2 : 0.8} rx={1} opacity={0.9}
            />
            {isHL && (
              <rect x={bx-1} y={by-1} width={bw+2} height={bh+2}
                fill="none" stroke="#22d3ee" strokeWidth={1.5} rx={2} />
            )}
            {fs >= 4 && bh > 10 && bw > 14 && (
              <text x={bx+bw/2} y={by+bh/2}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={fs} fill={stroke} fontWeight="600" fontFamily="monospace">
                {box.label}
              </text>
            )}
          </g>
        );
      })}

      <text x={VW/2} y={S4_IY+INFO_H-2} textAnchor="middle" fill={C_DIM} fontSize={10} fontFamily="monospace">
        G: {fmt(TW)} mm  ×  Y: {fmt(MH)} mm
      </text>

      {/* ════════════════════════════════════════════════════════════════
          LEJANT
      ════════════════════════════════════════════════════════════════ */}
      <g transform={`translate(${PAD},${LEG_Y})`}>
        <rect x={0}  y={0} width={10} height={10} fill={C_FILL} stroke={C_OUT}  strokeWidth={1.2} />
        <text x={14} y={9} fill={C_MUT} fontSize={9} fontFamily="monospace">Kabin</text>
        <rect x={60} y={0} width={10} height={10} fill={C_MFIL} stroke={C_MAR}  strokeWidth={1} strokeDasharray="3 2" />
        <text x={74} y={9} fill={C_MUT} fontSize={9} fontFamily="monospace">Kurulum Alanı</text>
        {boxes.length > 0 && (
          <>
            <rect x={180} y={0} width={10} height={10}
              fill={DEVICE_COLORS[0].fill} stroke={DEVICE_COLORS[0].stroke} strokeWidth={1} />
            <text x={194} y={9} fill={C_MUT} fontSize={9} fontFamily="monospace">Cihaz</text>
            {highlightColorIdx >= 0 && (
              <>
                <rect x={240} y={-1} width={10} height={12}
                  fill="none" stroke="#22d3ee" strokeWidth={1.5} rx={2} />
                <text x={254} y={9} fill={C_MUT} fontSize={9} fontFamily="monospace">Seçili</text>
              </>
            )}
          </>
        )}
      </g>
    </svg>
  );
}
