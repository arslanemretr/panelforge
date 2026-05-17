/**
 * CopperOrthographicPreview
 *
 * Dark-theme ortografik bakır (busbar) önizleme.
 * DeviceOrthographicPreview / PanelOrthographicPreview ile aynı stil.
 *
 * 4 görünüm: ÖN · YAN · ÜST · ARKA
 *
 * Koordinat sistemi (assembly, viewHelpers.ts ile aynı):
 *   X → sağ   (assembly sol dış duvarından)
 *   Y ↑ yukarı (zemin = 0; cabinet.bm + busbar_y_mm = bar altı)
 *   Z → derinlik (0 = ön yüzey)
 *
 * Bar boyutları:
 *   Genişlik  = main_width_mm     (Y ekseninde)
 *   Kalınlık  = main_thickness_mm (Z ekseninde; barlar Z'de yığılır)
 *   Uzunluk   = busbar_length_mm  (X ekseninde)
 */

import type { CopperSettings, Panel, ProjectPanel } from "../../types";
import {
  buildCabinetLayouts,
  computeBarTable,
  PHASE_COLORS,
  PHASE_LABELS,
  type BarRow,
} from "./viewHelpers";

// ── Renk paleti (diğer önizlemelerle aynı) ────────────────────────────────────
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
const VIEW_W = VW - 2 * PAD;
const VIEW_H = 150;
const LROW_H = 14;
const LROW_G = 5;
const INFO_H = 16;
const INFO_G = 4;
const SECT   = 28;

// 4 bölüm
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
const SVG_H = LEG_Y + 22 + PAD;

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  panel?: Panel | null;
  projectPanels: ProjectPanel[];
  copperSettings?: CopperSettings | null;
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────
function fit(dw: number, dh: number) {
  const sc = Math.min(
    (VIEW_W * 0.84) / Math.max(dw, 1),
    (VIEW_H * 0.84) / Math.max(dh, 1),
  );
  return { sc, ox: PAD + (VIEW_W - dw * sc) / 2, bh: dh * sc };
}

function fmt(v: number) {
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export function CopperOrthographicPreview({ panel, projectPanels, copperSettings }: Props) {
  const { layouts, maxHeight, maxDepth } =
    buildCabinetLayouts(projectPanels, panel ?? null);

  if (layouts.length === 0) {
    return (
      <svg viewBox={`0 0 ${VW} 80`} width="100%"
        style={{ display: "block", background: BG, borderRadius: 8 }}>
        <text x={VW / 2} y={44} textAnchor="middle" fill={C_MUT} fontSize={12} fontFamily="monospace">
          Kabin seçilmedi
        </text>
      </svg>
    );
  }

  const barRows  = copperSettings ? computeBarTable(copperSettings) : [];
  const hasBars  = barRows.length > 0;

  const TW = layouts.reduce((acc, l) => Math.max(acc, l.assemblyX + l.cW), 0);
  const MH = maxHeight > 0 ? maxHeight : 200;
  const MD = maxDepth  > 0 ? maxDepth  : 300;
  const hasDepth = maxDepth > 0;

  // Bar boyutları (render için)
  const barW = Number(copperSettings?.main_width_mm    ?? 40);
  const barT = Number(copperSettings?.main_thickness_mm ?? 5);

  // İlk layout — bar Y offseti için (bm)
  const firstLayout  = layouts[0];
  const deepestLayout = layouts.reduce((a, b) => b.cD > a.cD ? b : a, layouts[0]);

  // Scale / offset
  const f  = fit(TW, MH);
  const s  = hasDepth ? fit(MD, MH) : null;
  const t  = hasDepth ? fit(TW, MD) : null;
  const bk = fit(TW, MH);

  const f_vy  = S1_VY + (VIEW_H - f.bh)  / 2;
  const s_vy  = s  ? S2_VY + (VIEW_H - s.bh)  / 2 : S2_VY + VIEW_H / 2;
  const t_vy  = t  ? S3_VY + (VIEW_H - t.bh)  / 2 : S3_VY + VIEW_H / 2;
  const bk_vy = S4_VY + (VIEW_H - bk.bh) / 2;

  // ── Lejant için benzersiz fazlar ──────────────────────────────────────────
  const phaseSet = Array.from(new Set(barRows.map((r) => r.phase)));

  // ── Render yardımcıları ───────────────────────────────────────────────────

  /** Kabin arka planları (ön ve arka görünüm için, mirror=true ise X ayna) */
  function drawCabinets(
    sc: number, ox: number, vy: number, mirror = false,
  ): React.ReactNode[] {
    return layouts.map((cl, idx) => {
      const mirX  = mirror ? TW - cl.assemblyX - cl.cW : cl.assemblyX;
      const bx    = ox + mirX * sc;
      const bw    = cl.cW * sc;
      const bh    = cl.cH * sc;
      const by    = vy + (MH - cl.cH) * sc;
      const hasM  = cl.lm + cl.rm + cl.tm + cl.bm > 0;
      const intLm = mirror ? cl.rm : cl.lm;
      return (
        <g key={`cab-${idx}`}>
          <rect x={bx} y={by} width={bw} height={bh}
            fill={C_FILL} stroke={C_OUT} strokeWidth={1.5} />
          {idx < layouts.length - 1 && (
            mirror
              ? <line x1={bx}    y1={vy} x2={bx}    y2={vy + MH * sc} stroke={C_SEP} strokeWidth={0.5} strokeDasharray="3 3" />
              : <line x1={bx+bw} y1={vy} x2={bx+bw} y2={vy + MH * sc} stroke={C_SEP} strokeWidth={0.5} strokeDasharray="3 3" />
          )}
          {hasM && (
            <rect
              x={bx + intLm * sc} y={by + cl.tm * sc}
              width={(cl.cW - cl.lm - cl.rm) * sc}
              height={(cl.cH - cl.tm - cl.bm) * sc}
              fill={C_MFIL} stroke={C_MAR} strokeWidth={1} strokeDasharray="4 3"
            />
          )}
        </g>
      );
    });
  }

  /**
   * Barlar — ÖN veya ARKA görünüm (XY projeksiyonu).
   * mirror=true → ARKA görünüm (X ayna)
   *
   * TechnicalDrawingView koordinat mantığı:
   *   SVG top-y = vy + (MH − bm − row.yCenter − barW/2) × sc
   *   (row.yCenter = busbar_y_mm + barW/2 → top-y = vy + (MH − bm − busbar_y_mm − barW) × sc)
   */
  function drawBarsXY(
    sc: number, ox: number, vy: number, mirror = false,
  ): React.ReactNode[] {
    return barRows.map((row: BarRow) => {
      const phaseIdx = PHASE_LABELS.indexOf(row.phase);
      const color    = PHASE_COLORS[phaseIdx] ?? PHASE_COLORS[0];

      const visStart = Math.max(row.xStart, 0);
      const visEnd   = Math.min(row.xStart + row.length, TW);
      if (visEnd <= visStart) return null;

      const bx = mirror
        ? ox + (TW - visEnd)   * sc
        : ox + visStart        * sc;
      const bw  = Math.max((visEnd - visStart) * sc, 3);
      const by  = vy + (MH - firstLayout.bm - row.yCenter - barW / 2) * sc;
      const bh  = Math.max(barW * sc, 3);

      return (
        <g key={`bar-xy-${row.key}-${mirror ? "b" : "f"}`}>
          <rect x={bx} y={by} width={bw} height={bh}
            fill={color} opacity={0.85} rx={1} stroke={color} strokeWidth={0.5} />
          {bh > 8 && bw > 20 && (
            <text x={bx + 4} y={by + bh / 2} dominantBaseline="middle"
              fontSize={Math.min(7, bh * 0.6)} fill="#fff" fontWeight="700" fontFamily="monospace">
              {row.key}
            </text>
          )}
        </g>
      );
    });
  }

  /**
   * Barlar — YAN görünüm (ZY projeksiyonu).
   * Z ekseninde barlar peş peşe dizildiğinden her bar farklı ZCenter'a sahip.
   */
  function drawBarsZY(
    sc: number, ox: number, vy: number,
  ): React.ReactNode[] {
    return barRows.map((row: BarRow) => {
      const phaseIdx = PHASE_LABELS.indexOf(row.phase);
      const color    = PHASE_COLORS[phaseIdx] ?? PHASE_COLORS[0];

      const bx = ox + (row.zCenter - barT / 2) * sc;
      const by = vy + (MH - firstLayout.bm - row.yCenter - barW / 2) * sc;
      const bw = Math.max(barT * sc, 2);
      const bh = Math.max(barW * sc, 3);

      return (
        <g key={`bar-zy-${row.key}`}>
          <rect x={bx} y={by} width={bw} height={bh}
            fill={color} opacity={0.85} rx={1} stroke={color} strokeWidth={0.5} />
          {bh > 8 && (
            <text x={bx + bw / 2} y={by + bh / 2}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={Math.min(6, bh * 0.5)} fill="#fff" fontWeight="700" fontFamily="monospace">
              {row.key}
            </text>
          )}
        </g>
      );
    });
  }

  /**
   * Barlar — ÜST görünüm (XZ projeksiyonu).
   * Barlar Z'de yığıldığından üstten ince yatay şeritler olarak görünür.
   */
  function drawBarsXZ(
    sc: number, ox: number, vy: number,
  ): React.ReactNode[] {
    return barRows.map((row: BarRow) => {
      const phaseIdx = PHASE_LABELS.indexOf(row.phase);
      const color    = PHASE_COLORS[phaseIdx] ?? PHASE_COLORS[0];

      const visStart = Math.max(row.xStart, 0);
      const visEnd   = Math.min(row.xStart + row.length, TW);
      if (visEnd <= visStart) return null;

      const bx = ox + visStart          * sc;
      const by = vy + (row.zCenter - barT / 2) * sc;
      const bw = Math.max((visEnd - visStart) * sc, 3);
      const bh = Math.max(barT * sc, 2);

      return (
        <g key={`bar-xz-${row.key}`}>
          <rect x={bx} y={by} width={bw} height={bh}
            fill={color} opacity={0.85} rx={1} stroke={color} strokeWidth={0.5} />
          {bh > 7 && bw > 20 && (
            <text x={bx + 4} y={by + bh / 2} dominantBaseline="middle"
              fontSize={Math.min(6, bh * 0.7)} fill="#fff" fontWeight="700" fontFamily="monospace">
              {row.key}
            </text>
          )}
        </g>
      );
    });
  }

  const noBarsHint = (vy: number) => (
    <text x={VW/2} y={vy + VIEW_H / 2 + 4} textAnchor="middle"
      fill={C_MUT} fontSize={10} fontFamily="monospace">
      Ana bakır tanımı bekleniyor
    </text>
  );

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
      {drawCabinets(f.sc, f.ox, f_vy)}
      {hasBars ? drawBarsXY(f.sc, f.ox, f_vy) : noBarsHint(S1_VY)}
      <text x={VW/2} y={S1_IY+INFO_H-2} textAnchor="middle" fill={C_DIM} fontSize={10} fontFamily="monospace">
        G: {fmt(TW)} mm  ×  Y: {fmt(MH)} mm
        {hasBars ? `  ·  ${barRows.length} bara` : ""}
      </text>

      {/* ════════════════════════════════════════════════════════════════
          YAN GÖRÜNÜM  (Z → sağ, Y ↑)
      ════════════════════════════════════════════════════════════════ */}
      <text x={PAD} y={S2_LY+LROW_H-2} fill={C_MUT} fontSize={10} fontFamily="monospace" letterSpacing={1.2}>YAN GÖRÜNÜM</text>
      <rect x={PAD} y={S2_VY} width={VIEW_W} height={VIEW_H} rx={4} fill={C_BG2} />

      {hasDepth && s ? (
        <>
          {/* En derin kabin profili */}
          <rect x={s.ox} y={s_vy}
            width={deepestLayout.cD * s.sc} height={deepestLayout.cH * s.sc}
            fill={C_FILL} stroke={C_OUT} strokeWidth={1.5} />
          {(deepestLayout.tm > 0 || deepestLayout.bm > 0) && (
            <rect x={s.ox} y={s_vy + deepestLayout.tm * s.sc}
              width={deepestLayout.cD * s.sc}
              height={(deepestLayout.cH - deepestLayout.tm - deepestLayout.bm) * s.sc}
              fill={C_MFIL} stroke={C_MAR} strokeWidth={1} strokeDasharray="4 3" />
          )}
          {/* Ön yüzey çizgisi */}
          <line x1={s.ox} y1={s_vy}
            x2={s.ox} y2={s_vy + deepestLayout.cH * s.sc}
            stroke={C_OUT} strokeWidth={2.5} />
          {/* Yön etiketleri */}
          <text x={s.ox + 3}                              y={s_vy + 10} fill={C_DIM} fontSize={8} fontFamily="monospace">Ön</text>
          <text x={s.ox + deepestLayout.cD * s.sc - 3}   y={s_vy + 10} textAnchor="end" fill={C_DIM} fontSize={8} fontFamily="monospace">Arka</text>
          {/* Barlar — her bar farklı Z konumunda kesit olarak görünür */}
          {hasBars && drawBarsZY(s.sc, s.ox, s_vy)}
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
          ÜST GÖRÜNÜM  (X → sağ, Z ↓)
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
              <g key={`tv-cab-${idx}`}>
                <rect x={bx} y={t_vy} width={bw} height={bh} fill={C_FILL} stroke={C_OUT} strokeWidth={1.5} />
                {/* Ön yüzey vurgusu (üst görünümde üst kenar = ön yüzey) */}
                <rect x={bx} y={t_vy} width={bw} height={Math.max(2, 2 * t.sc)} fill={C_OUT} opacity={0.4} />
                {idx < layouts.length - 1 && (
                  <line x1={bx+bw} y1={t_vy} x2={bx+bw} y2={t_vy + MD * t.sc}
                    stroke={C_SEP} strokeWidth={0.5} strokeDasharray="3 3" />
                )}
                {(cl.lm > 0 || cl.rm > 0) && (
                  <rect x={bx + cl.lm * t.sc} y={t_vy}
                    width={(cl.cW - cl.lm - cl.rm) * t.sc} height={bh}
                    fill={C_MFIL} stroke={C_MAR} strokeWidth={1} strokeDasharray="4 3" />
                )}
              </g>
            );
          })}
          {/* Yön etiketleri */}
          <text x={t.ox + 3} y={t_vy + 9}              fill={C_DIM} fontSize={8} fontFamily="monospace">Ön</text>
          <text x={t.ox + 3} y={t_vy + MD * t.sc - 3}  fill={C_DIM} fontSize={8} fontFamily="monospace">Arka</text>
          {/* Barlar — üstten bakışta yatay şeritler olarak görünür */}
          {hasBars && drawBarsXZ(t.sc, t.ox, t_vy)}
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
      {drawCabinets(bk.sc, bk.ox, bk_vy, true)}
      {hasBars ? drawBarsXY(bk.sc, bk.ox, bk_vy, true) : noBarsHint(S4_VY)}
      <text x={VW/2} y={S4_IY+INFO_H-2} textAnchor="middle" fill={C_DIM} fontSize={10} fontFamily="monospace">
        G: {fmt(TW)} mm  ×  Y: {fmt(MH)} mm
      </text>

      {/* ════════════════════════════════════════════════════════════════
          LEJANT — kabin + kurulum + bir chip per faz
      ════════════════════════════════════════════════════════════════ */}
      <g transform={`translate(${PAD},${LEG_Y})`}>
        <rect x={0}  y={0} width={10} height={10} fill={C_FILL} stroke={C_OUT}  strokeWidth={1.2} />
        <text x={14} y={9} fill={C_MUT} fontSize={9} fontFamily="monospace">Kabin</text>
        <rect x={60} y={0} width={10} height={10} fill={C_MFIL} stroke={C_MAR}  strokeWidth={1} strokeDasharray="3 2" />
        <text x={74} y={9} fill={C_MUT} fontSize={9} fontFamily="monospace">Kurulum Alanı</text>
        {phaseSet.map((phase, idx) => {
          const pi    = PHASE_LABELS.indexOf(phase);
          const color = PHASE_COLORS[pi] ?? PHASE_COLORS[0];
          const offX  = 172 + idx * 54;
          return (
            <g key={phase}>
              <rect x={offX} y={0} width={10} height={10} fill={color} opacity={0.85} rx={1} />
              <text x={offX + 14} y={9} fill={C_MUT} fontSize={9} fontFamily="monospace">{phase}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
