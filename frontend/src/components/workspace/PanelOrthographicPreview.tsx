/**
 * PanelOrthographicPreview
 * Dark-theme ortografik önizleme.
 *
 *  Tek kabin modu  → geo prop
 *  Çoklu kabin modu → items prop  (kabinler yan yana çizilir, adet × genişlik)
 *
 *  3 görünüm:
 *   - Ön  : W × H
 *   - Yan : D × H  (en derin kabin profili)
 *   - Üst : W × D  (tüm kabinler, yukarıdan)
 */

import type { ProjectPanel } from "../../types";

// ── Renk paleti ────────────────────────────────────────────────────────────────
const BG        = "#1a1f2b";
const C_BG2     = "#0d1117";
const C_OUTER   = "#64748b";
const C_FILL    = "rgba(100,116,139,0.08)";
const C_SEP     = "#334155";          // kabin arası ayırıcı çizgi
const C_MARGIN  = "#f97316";
const C_MFILL   = "rgba(249,115,22,0.06)";
const C_MOUNT   = "#0ea5e9";
const C_MNTFILL = "rgba(14,165,233,0.07)";
const C_DIM     = "#94a3b8";
const C_MUTED   = "#475569";
const C_LABEL   = "#64748b";          // kabin seq label

// ── Layout sabitler ────────────────────────────────────────────────────────────
const VW      = 520;
const PAD     = 18;
const VIEW_W  = VW - 2 * PAD;   // 484
const VIEW_H  = 150;
const LROW_H  = 14;
const LROW_G  = 5;
const INFO_H  = 16;
const INFO_G  = 4;
const SECT    = 28;

const S1_LY = PAD;
const S1_VY = S1_LY + LROW_H + LROW_G;
const S1_IY = S1_VY + VIEW_H + INFO_G;
const S2_LY = S1_IY + INFO_H + SECT;
const S2_VY = S2_LY + LROW_H + LROW_G;
const S2_IY = S2_VY + VIEW_H + INFO_G;
const S3_LY = S2_IY + INFO_H + SECT;
const S3_VY = S3_LY + LROW_H + LROW_G;
const S3_IY = S3_VY + VIEW_H + INFO_G;
const LEG_Y = S3_IY + INFO_H + SECT - 4;
const SVG_H = LEG_Y + 18 + PAD;

// ── Tipler ────────────────────────────────────────────────────────────────────
export interface PanelGeo {
  width_mm: number;
  height_mm: number;
  depth_mm?: number | null;
  mounting_plate_width_mm?: number | null;
  mounting_plate_height_mm?: number | null;
  left_margin_mm: number;
  right_margin_mm: number;
  top_margin_mm: number;
  bottom_margin_mm: number;
}

interface Props {
  geo?: PanelGeo;
  items?: ProjectPanel[];
  label?: string;
}

// ── Yardımcılar ────────────────────────────────────────────────────────────────
function fit(dw: number, dh: number) {
  const sc = Math.min((VIEW_W * 0.84) / Math.max(dw, 1), (VIEW_H * 0.84) / Math.max(dh, 1));
  const bw = dw * sc;
  const bh = dh * sc;
  const ox = PAD + (VIEW_W - bw) / 2;
  return { sc, ox, bw, bh };
}

function dim(v: number) {
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}

// Her birimi (adet genişletilmiş) temsil eden yapı
interface Unit {
  w: number; h: number; d: number;
  ml: number; mr: number; mt: number; mb: number;
  mpw: number; mph: number;
  seq: number; label: string;
  xMm: number;   // cumulative start in mm
}

function buildUnits(items: ProjectPanel[]): Unit[] {
  const units: Unit[] = [];
  let cursor = 0;
  for (const p of items) {
    const qty = Math.max(1, p.quantity);
    for (let q = 0; q < qty; q++) {
      units.push({
        w:   Number(p.width_mm),
        h:   Number(p.height_mm),
        d:   Number(p.depth_mm   ?? 0),
        ml:  Number(p.left_margin_mm),
        mr:  Number(p.right_margin_mm),
        mt:  Number(p.top_margin_mm),
        mb:  Number(p.bottom_margin_mm),
        mpw: Number(p.mounting_plate_width_mm  ?? 0),
        mph: Number(p.mounting_plate_height_mm ?? 0),
        seq:   p.seq,
        label: p.label ?? `Kabin ${p.seq}`,
        xMm: cursor,
      });
      cursor += Number(p.width_mm);
    }
  }
  return units;
}

// ── Ana bileşen ────────────────────────────────────────────────────────────────
export function PanelOrthographicPreview({ geo, items, label }: Props) {

  // Çok kabin modu
  if (items && items.length > 0) {
    return <MultiView items={items} label={label} />;
  }

  // Tek kabin modu
  if (!geo) return null;
  return <SingleView geo={geo} label={label} />;
}

// ────────────────────────────────────────────────────────────────────────────────
// TEK KABİN GÖRÜNÜMÜ
// ────────────────────────────────────────────────────────────────────────────────
function SingleView({ geo, label }: { geo: PanelGeo; label?: string }) {
  const W   = Number(geo.width_mm)  || 100;
  const H   = Number(geo.height_mm) || 200;
  const D   = Number(geo.depth_mm   ?? 0);
  const ML  = Number(geo.left_margin_mm)  || 0;
  const MR  = Number(geo.right_margin_mm) || 0;
  const MT  = Number(geo.top_margin_mm)   || 0;
  const MB  = Number(geo.bottom_margin_mm)|| 0;
  const MPW = Number(geo.mounting_plate_width_mm  ?? 0);
  const MPH = Number(geo.mounting_plate_height_mm ?? 0);

  const hasMargins = ML + MR + MT + MB > 0;
  const hasMount   = MPW > 0 && MPH > 0;
  const hasDepth   = D > 0;

  const f    = fit(W, H);
  const f_vy = S1_VY + (VIEW_H - f.bh) / 2;
  const s    = hasDepth ? fit(D, H) : null;
  const s_vy = s ? S2_VY + (VIEW_H - s.bh) / 2 : S2_VY + VIEW_H / 2;
  const t    = hasDepth ? fit(W, D) : null;
  const t_vy = t ? S3_VY + (VIEW_H - t.bh) / 2 : S3_VY + VIEW_H / 2;

  return (
    <svg viewBox={`0 0 ${VW} ${SVG_H}`} width="100%"
      style={{ display: "block", background: BG, borderRadius: 8, userSelect: "none" }}>
      {label && <text x={VW/2} y={PAD-4} textAnchor="middle" fill={C_MUTED} fontSize={10} fontFamily="monospace">{label}</text>}

      {/* ── Ön görünüm ── */}
      <text x={PAD} y={S1_LY+LROW_H-2} fill={C_MUTED} fontSize={10} fontFamily="monospace" letterSpacing={1.2}>ÖN GÖRÜNÜM</text>
      <rect x={PAD} y={S1_VY} width={VIEW_W} height={VIEW_H} rx={4} fill={C_BG2} />
      <rect x={f.ox} y={f_vy} width={f.bw} height={f.bh} fill={C_FILL} stroke={C_OUTER} strokeWidth={1.5} />
      {hasMargins && <rect x={f.ox+ML*f.sc} y={f_vy+MT*f.sc} width={(W-ML-MR)*f.sc} height={(H-MT-MB)*f.sc} fill={C_MFILL} stroke={C_MARGIN} strokeWidth={1} strokeDasharray="4 3" />}
      {hasMount   && <rect x={f.ox+(W-MPW)/2*f.sc} y={f_vy+(H-MPH)/2*f.sc} width={MPW*f.sc} height={MPH*f.sc} fill={C_MNTFILL} stroke={C_MOUNT} strokeWidth={1} strokeDasharray="6 4" />}
      <text x={VW/2} y={S1_IY+INFO_H-2} textAnchor="middle" fill={C_DIM} fontSize={10} fontFamily="monospace">G: {dim(W)} mm  ×  Y: {dim(H)} mm</text>

      {/* ── Yan görünüm ── */}
      <text x={PAD} y={S2_LY+LROW_H-2} fill={C_MUTED} fontSize={10} fontFamily="monospace" letterSpacing={1.2}>YAN GÖRÜNÜM</text>
      <rect x={PAD} y={S2_VY} width={VIEW_W} height={VIEW_H} rx={4} fill={C_BG2} />
      {hasDepth && s ? (
        <>
          <rect x={s.ox} y={s_vy} width={s.bw} height={s.bh} fill={C_FILL} stroke={C_OUTER} strokeWidth={1.5} />
          {(MT>0||MB>0) && <rect x={s.ox} y={s_vy+MT*s.sc} width={s.bw} height={(H-MT-MB)*s.sc} fill={C_MFILL} stroke={C_MARGIN} strokeWidth={1} strokeDasharray="4 3" />}
        </>
      ) : (
        <text x={VW/2} y={S2_VY+VIEW_H/2+4} textAnchor="middle" fill={C_MUTED} fontSize={11} fontFamily="monospace">derinlik girilmedi</text>
      )}
      <text x={VW/2} y={S2_IY+INFO_H-2} textAnchor="middle" fill={C_DIM} fontSize={10} fontFamily="monospace">D: {hasDepth?`${dim(D)} mm`:"—"}  ×  Y: {dim(H)} mm</text>

      {/* ── Üst görünüm ── */}
      <text x={PAD} y={S3_LY+LROW_H-2} fill={C_MUTED} fontSize={10} fontFamily="monospace" letterSpacing={1.2}>ÜST GÖRÜNÜM</text>
      <rect x={PAD} y={S3_VY} width={VIEW_W} height={VIEW_H} rx={4} fill={C_BG2} />
      {hasDepth && t ? (
        <>
          <rect x={t.ox} y={t_vy} width={t.bw} height={t.bh} fill={C_FILL} stroke={C_OUTER} strokeWidth={1.5} />
          {(ML>0||MR>0) && <rect x={t.ox+ML*t.sc} y={t_vy} width={(W-ML-MR)*t.sc} height={t.bh} fill={C_MFILL} stroke={C_MARGIN} strokeWidth={1} strokeDasharray="4 3" />}
        </>
      ) : (
        <text x={VW/2} y={S3_VY+VIEW_H/2+4} textAnchor="middle" fill={C_MUTED} fontSize={11} fontFamily="monospace">derinlik girilmedi</text>
      )}
      <text x={VW/2} y={S3_IY+INFO_H-2} textAnchor="middle" fill={C_DIM} fontSize={10} fontFamily="monospace">G: {dim(W)} mm  ×  D: {hasDepth?`${dim(D)} mm`:"—"}</text>

      {/* ── Lejant ── */}
      <g transform={`translate(${PAD},${LEG_Y})`}>
        <rect x={0}   y={0} width={10} height={10} fill={C_FILL}    stroke={C_OUTER}  strokeWidth={1.2} />
        <text x={14}  y={9} fill={C_MUTED} fontSize={9} fontFamily="monospace">Kabin</text>
        <rect x={60}  y={0} width={10} height={10} fill={C_MFILL}   stroke={C_MARGIN} strokeWidth={1} strokeDasharray="3 2" />
        <text x={74}  y={9} fill={C_MUTED} fontSize={9} fontFamily="monospace">Kurulum Alanı</text>
        {hasMount && <>
          <rect x={170} y={0} width={10} height={10} fill={C_MNTFILL} stroke={C_MOUNT} strokeWidth={1} strokeDasharray="4 3" />
          <text x={184} y={9} fill={C_MUTED} fontSize={9} fontFamily="monospace">Mont. Plaka</text>
        </>}
      </g>
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// ÇOK KABİN GÖRÜNÜMÜ — yan yana
// ────────────────────────────────────────────────────────────────────────────────
function MultiView({ items, label }: { items: ProjectPanel[]; label?: string }) {
  const units  = buildUnits(items);
  const totalW = units.reduce((s, u) => Math.max(s, u.xMm + u.w), 0);
  const maxH   = Math.max(...units.map((u) => u.h));
  const maxD   = Math.max(...units.map((u) => u.d));
  const hasDepth = maxD > 0;
  const hasMount = units.some((u) => u.mpw > 0 && u.mph > 0);

  // ── Ön görünüm scale ──────────────────────────────────────────────────────
  const f    = fit(totalW, maxH);
  const f_vy = S1_VY + (VIEW_H - f.bh) / 2;

  // ── Yan görünüm (en derin birim) ─────────────────────────────────────────
  const deepest = units.reduce((a, b) => b.d > a.d ? b : a, units[0]);
  const s    = hasDepth ? fit(deepest.d, deepest.h) : null;
  const s_vy = s ? S2_VY + (VIEW_H - s.bh) / 2 : S2_VY + VIEW_H / 2;

  // ── Üst görünüm scale ────────────────────────────────────────────────────
  const t    = hasDepth ? fit(totalW, maxD) : null;
  const t_vy = t ? S3_VY + (VIEW_H - t.bh) / 2 : S3_VY + VIEW_H / 2;

  return (
    <svg viewBox={`0 0 ${VW} ${SVG_H}`} width="100%"
      style={{ display: "block", background: BG, borderRadius: 8, userSelect: "none" }}>
      {label && <text x={VW/2} y={PAD-4} textAnchor="middle" fill={C_MUTED} fontSize={10} fontFamily="monospace">{label}</text>}

      {/* ════════════════ ÖN GÖRÜNÜM ════════════════ */}
      <text x={PAD} y={S1_LY+LROW_H-2} fill={C_MUTED} fontSize={10} fontFamily="monospace" letterSpacing={1.2}>ÖN GÖRÜNÜM</text>
      <rect x={PAD} y={S1_VY} width={VIEW_W} height={VIEW_H} rx={4} fill={C_BG2} />

      {units.map((u, i) => {
        const bx  = f.ox + u.xMm * f.sc;
        const bw  = u.w * f.sc;
        const bh  = u.h * f.sc;
        // Y: kabin alta hizalı (tüm kabinler aynı alta oturuyor)
        const by  = f_vy + (maxH - u.h) * f.sc;

        const hasM = u.ml+u.mr+u.mt+u.mb > 0;
        const hasMP = u.mpw > 0 && u.mph > 0;
        return (
          <g key={i}>
            {/* Kabin dış kutusu */}
            <rect x={bx} y={by} width={bw} height={bh} fill={C_FILL} stroke={C_OUTER} strokeWidth={1.5} />
            {/* Ayırıcı çizgi (sonraki kabin başlangıcında) */}
            {i < units.length - 1 && (
              <line x1={bx+bw} y1={f_vy} x2={bx+bw} y2={f_vy+maxH*f.sc} stroke={C_SEP} strokeWidth={0.5} strokeDasharray="3 3" />
            )}
            {/* Kurulum alanı */}
            {hasM && (
              <rect
                x={bx + u.ml * f.sc}
                y={by + u.mt * f.sc}
                width={(u.w - u.ml - u.mr) * f.sc}
                height={(u.h - u.mt - u.mb) * f.sc}
                fill={C_MFILL} stroke={C_MARGIN} strokeWidth={1} strokeDasharray="4 3"
              />
            )}
            {/* Montaj plakası */}
            {hasMP && (
              <rect
                x={bx + (u.w - u.mpw) / 2 * f.sc}
                y={by + (u.h - u.mph) / 2 * f.sc}
                width={u.mpw * f.sc}
                height={u.mph * f.sc}
                fill={C_MNTFILL} stroke={C_MOUNT} strokeWidth={1} strokeDasharray="6 4"
              />
            )}
            {/* Sıra numarası etiketi (sadece geniş kutularda) */}
            {bw > 18 && (
              <text
                x={bx + bw / 2}
                y={by + bh + 10}
                textAnchor="middle"
                fill={C_LABEL}
                fontSize={8}
                fontFamily="monospace"
              >
                {u.seq}
              </text>
            )}
          </g>
        );
      })}

      <text x={VW/2} y={S1_IY+INFO_H-2} textAnchor="middle" fill={C_DIM} fontSize={10} fontFamily="monospace">
        G: {dim(totalW)} mm  ×  Y: {dim(maxH)} mm  ({units.length} birim)
      </text>

      {/* ════════════════ YAN GÖRÜNÜM ════════════════ */}
      <text x={PAD} y={S2_LY+LROW_H-2} fill={C_MUTED} fontSize={10} fontFamily="monospace" letterSpacing={1.2}>YAN GÖRÜNÜM</text>
      <rect x={PAD} y={S2_VY} width={VIEW_W} height={VIEW_H} rx={4} fill={C_BG2} />
      {hasDepth && s ? (
        <>
          <rect x={s.ox} y={s_vy} width={s.bw} height={s.bh} fill={C_FILL} stroke={C_OUTER} strokeWidth={1.5} />
          {(deepest.mt>0||deepest.mb>0) && (
            <rect x={s.ox} y={s_vy+deepest.mt*s.sc} width={s.bw} height={(deepest.h-deepest.mt-deepest.mb)*s.sc}
              fill={C_MFILL} stroke={C_MARGIN} strokeWidth={1} strokeDasharray="4 3" />
          )}
        </>
      ) : (
        <text x={VW/2} y={S2_VY+VIEW_H/2+4} textAnchor="middle" fill={C_MUTED} fontSize={11} fontFamily="monospace">derinlik girilmedi</text>
      )}
      <text x={VW/2} y={S2_IY+INFO_H-2} textAnchor="middle" fill={C_DIM} fontSize={10} fontFamily="monospace">
        D: {hasDepth?`${dim(maxD)} mm`:"—"}  ×  Y: {dim(maxH)} mm
      </text>

      {/* ════════════════ ÜST GÖRÜNÜM ════════════════ */}
      <text x={PAD} y={S3_LY+LROW_H-2} fill={C_MUTED} fontSize={10} fontFamily="monospace" letterSpacing={1.2}>ÜST GÖRÜNÜM</text>
      <rect x={PAD} y={S3_VY} width={VIEW_W} height={VIEW_H} rx={4} fill={C_BG2} />
      {hasDepth && t ? (
        <>
          {units.map((u, i) => {
            if (u.d <= 0) return null;
            const bx = t.ox + u.xMm * t.sc;
            const bw = u.w * t.sc;
            const bh = u.d * t.sc;
            const by = t_vy + (maxD - u.d) * t.sc; // önden hizalı
            return (
              <g key={i}>
                <rect x={bx} y={by} width={bw} height={bh} fill={C_FILL} stroke={C_OUTER} strokeWidth={1.5} />
                {i < units.length - 1 && (
                  <line x1={bx+bw} y1={t_vy} x2={bx+bw} y2={t_vy+maxD*t.sc} stroke={C_SEP} strokeWidth={0.5} strokeDasharray="3 3" />
                )}
                {(u.ml>0||u.mr>0) && (
                  <rect x={bx+u.ml*t.sc} y={by} width={(u.w-u.ml-u.mr)*t.sc} height={bh}
                    fill={C_MFILL} stroke={C_MARGIN} strokeWidth={1} strokeDasharray="4 3" />
                )}
              </g>
            );
          })}
        </>
      ) : (
        <text x={VW/2} y={S3_VY+VIEW_H/2+4} textAnchor="middle" fill={C_MUTED} fontSize={11} fontFamily="monospace">derinlik girilmedi</text>
      )}
      <text x={VW/2} y={S3_IY+INFO_H-2} textAnchor="middle" fill={C_DIM} fontSize={10} fontFamily="monospace">
        G: {dim(totalW)} mm  ×  D: {hasDepth?`${dim(maxD)} mm`:"—"}
      </text>

      {/* ════════════════ LEJANT ════════════════ */}
      <g transform={`translate(${PAD},${LEG_Y})`}>
        <rect x={0}   y={0} width={10} height={10} fill={C_FILL}    stroke={C_OUTER}  strokeWidth={1.2} />
        <text x={14}  y={9} fill={C_MUTED} fontSize={9} fontFamily="monospace">Kabin</text>
        <rect x={60}  y={0} width={10} height={10} fill={C_MFILL}   stroke={C_MARGIN} strokeWidth={1} strokeDasharray="3 2" />
        <text x={74}  y={9} fill={C_MUTED} fontSize={9} fontFamily="monospace">Kurulum Alanı</text>
        {hasMount && <>
          <rect x={170} y={0} width={10} height={10} fill={C_MNTFILL} stroke={C_MOUNT} strokeWidth={1} strokeDasharray="4 3" />
          <text x={184} y={9} fill={C_MUTED} fontSize={9} fontFamily="monospace">Mont. Plaka</text>
        </>}
      </g>
    </svg>
  );
}
