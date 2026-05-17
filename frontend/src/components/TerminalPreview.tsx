// ─────────────────────────────────────────────────────────────────────────────
// TerminalPreview.tsx — Teknik çizim önizlemesi (4 ortografik görünüş)
// Doğru delik konumlandırması ve kesit (hidden line) gösterimi
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";

export interface TerminalPreviewProps {
  terminal_type: string;
  surface: string;
  terminal_width_mm: number | null;
  terminal_height_mm: number | null;
  terminal_depth_mm: number | null;
  bolt_count: number | null;
  bolt_center_distance_mm: number | null;
  hole_diameter_mm: number | null;
  slot_width_mm?: number | null;
  slot_length_mm?: number | null;
  fin_count?: number | null;
  fin_spacing_mm?: number | null;
  fin_thickness_mm?: number | null;
  fin_length_mm?: number | null;
  fin_offset_mm?: number | null;
  plate_thickness_mm?: number | null;
  bolt_pos_x_mm?: number | null;  // sol kenardan ilk delik merkezi (mm)
  bolt_pos_y_mm?: number | null;  // üst yüzeyden delik satırı merkezi (mm)
  bolt_pos_z_mm?: number | null;  // ön yüzeyden delik derinliği (mm)
  width?: number;
  height?: number;
}

// ─── Geometri (mm, ölçeksiz) ─────────────────────────────────────────────────
interface Geom {
  type: string;   // terminal_type
  surf: string;   // surface
  wMm: number;    // X — genişlik
  hMm: number;    // Y — yükseklik
  dMm: number;    // Z — derinlik
  boltN: number;
  boltSpMm: number;
  isSlot: boolean;
  sWmm: number;   // slot genişliği mm
  sLmm: number;   // slot uzunluğu mm
  holeDmm: number;
  finN: number;            // fin adedi
  finSpMm: number;         // fin aralığı mm (merkez-merkez; 0 = otomatik)
  finThickMm: number;      // fin kalınlığı mm (0 = otomatik)
  finLengthMm: number;     // fin uzunluğu mm (0 = otomatik)
  finOffsetMm: number | null; // yüzey → ilk fin üst kenar (null = oto-ortala)
  plateThickMm: number;    // gövde plaka kalınlığı mm (0 = otomatik)
  posXmm: number | null;  // sol kenardan ilk delik (null = otomatik ortala)
  posYmm: number | null;  // üstten delik satırı (null = otomatik)
  posZmm: number | null;  // önden delik derinliği (null = otomatik)
}

// ─── Renkler ─────────────────────────────────────────────────────────────────
const BG    = "#1a1f2b";
const BODY  = "#334155";
const BFILL = "rgba(100,116,139,0.12)";
const CU    = "#b45309";
const CUFILL= "rgba(251,191,36,0.30)";
const SL    = "#3b82f6";
const SLFILL= "rgba(59,130,246,0.18)";
const DIM   = "#64748b";
const RED   = "#e74c3c";
const MUT   = "#94a3b8";
const SURF  = "#22d3ee";
const DASH  = "rgba(148,163,184,0.70)"; // kesit / hidden line rengi

// ─── SVG düzen sabitleri ──────────────────────────────────────────────────────
const SW   = 520;
const HDR  = 26;
const ML   = 58;
const MR   = 16;
const MT   = 12;
const MB   = 36;
const AVLW = SW - ML - MR;

// ─── Başlık bandı ────────────────────────────────────────────────────────────
function Hdr({ label, accent, id }: { label: string; accent: string; id: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={SW} height={HDR} fill={`url(#${id})`} />
      <rect x={0} y={HDR - 1} width={SW} height={1} fill={accent} opacity={0.4} />
      <circle cx={14} cy={HDR / 2} r={4.5} fill={accent} opacity={0.85} />
      <text x={26} y={HDR / 2 + 4} fontSize={10.5} fill={accent}
        fontWeight="700" fontFamily="system-ui,sans-serif" letterSpacing="0.5">
        {label}
      </text>
    </g>
  );
}

// ─── Boyut okları ─────────────────────────────────────────────────────────────
function DimH({ x1, x2, y, label, color = DIM, off = 14 }:
  { x1: number; x2: number; y: number; label: string; color?: string; off?: number }) {
  const cx = (x1 + x2) / 2; const yl = y - off;
  return (
    <g stroke={color} strokeWidth={0.7} fill="none">
      <line x1={x1} y1={y} x2={x1} y2={yl - 3} />
      <line x1={x2} y1={y} x2={x2} y2={yl - 3} />
      <line x1={x1} y1={yl} x2={x2} y2={yl} />
      <polygon points={`${x1+5},${yl-2} ${x1},${yl} ${x1+5},${yl+2}`} fill={color} stroke="none" />
      <polygon points={`${x2-5},${yl-2} ${x2},${yl} ${x2-5},${yl+2}`} fill={color} stroke="none" />
      <rect x={cx-22} y={yl-12} width={44} height={11} fill={BG} stroke="none" />
      <text x={cx} y={yl-3} textAnchor="middle" fontSize={9} fill={color} stroke="none" fontFamily="monospace">{label}</text>
    </g>
  );
}

function DimV({ x, y1, y2, label, color = DIM, off = 14 }:
  { x: number; y1: number; y2: number; label: string; color?: string; off?: number }) {
  const cy = (y1 + y2) / 2; const xl = x - off;
  return (
    <g stroke={color} strokeWidth={0.7} fill="none">
      <line x1={x} y1={y1} x2={xl-3} y2={y1} />
      <line x1={x} y1={y2} x2={xl-3} y2={y2} />
      <line x1={xl} y1={y1} x2={xl} y2={y2} />
      <polygon points={`${xl-2},${y1+5} ${xl},${y1} ${xl+2},${y1+5}`} fill={color} stroke="none" />
      <polygon points={`${xl-2},${y2-5} ${xl},${y2} ${xl+2},${y2-5}`} fill={color} stroke="none" />
      <rect x={xl-42} y={cy-6} width={42} height={12} fill={BG} stroke="none" />
      <text x={xl-4} y={cy+4} textAnchor="end" fontSize={9} fill={color} stroke="none" fontFamily="monospace">{label}</text>
    </g>
  );
}

// Sağ tarafa boyut oku (gövde dışında, sağda)
function DimVR({ x, y1, y2, label, color = DIM, off = 14 }:
  { x: number; y1: number; y2: number; label: string; color?: string; off?: number }) {
  const cy = (y1 + y2) / 2; const xr = x + off;
  return (
    <g stroke={color} strokeWidth={0.7} fill="none">
      <line x1={x} y1={y1} x2={xr+3} y2={y1} />
      <line x1={x} y1={y2} x2={xr+3} y2={y2} />
      <line x1={xr} y1={y1} x2={xr} y2={y2} />
      <polygon points={`${xr-2},${y1+5} ${xr},${y1} ${xr+2},${y1+5}`} fill={color} stroke="none" />
      <polygon points={`${xr-2},${y2-5} ${xr},${y2} ${xr+2},${y2-5}`} fill={color} stroke="none" />
      <rect x={xr+2} y={cy-6} width={42} height={12} fill={BG} stroke="none" />
      <text x={xr+6} y={cy+4} textAnchor="start" fontSize={9} fill={color} stroke="none" fontFamily="monospace">{label}</text>
    </g>
  );
}

// ─── Delik sembolleri — doğrudan görünüm (tam çember) ────────────────────────
function RH({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={BG} stroke={MUT} strokeWidth={1.1} />
      <line x1={cx-r*.6} y1={cy} x2={cx+r*.6} y2={cy} stroke={MUT} strokeWidth={.5} opacity={.5}/>
      <line x1={cx} y1={cy-r*.6} x2={cx} y2={cy+r*.6} stroke={MUT} strokeWidth={.5} opacity={.5}/>
    </g>
  );
}

function SH({ cx, cy, sw, sl, h = true }: { cx: number; cy: number; sw: number; sl: number; h?: boolean }) {
  const rx = sw / 2;
  return h
    ? <rect x={cx-sl/2} y={cy-sw/2} width={sl} height={sw} fill={SLFILL} stroke={SL} strokeWidth={1.1} rx={rx} />
    : <rect x={cx-sw/2} y={cy-sl/2} width={sw} height={sl} fill={SLFILL} stroke={SL} strokeWidth={1.1} rx={rx} />;
}

// ─── Delik sembolleri — kesit / gizli (dashed) ───────────────────────────────
function RHdash({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <circle cx={cx} cy={cy} r={r} fill="none" stroke={DASH} strokeWidth={1.0} strokeDasharray="3 2" />
  );
}

function SHdash({ cx, cy, sw, sl, h = true }: { cx: number; cy: number; sw: number; sl: number; h?: boolean }) {
  const rx = sw / 2;
  return h
    ? <rect x={cx-sl/2} y={cy-sw/2} width={sl} height={sw} fill="none" stroke={DASH} strokeWidth={1.0} strokeDasharray="3 2" rx={rx} />
    : <rect x={cx-sw/2} y={cy-sl/2} width={sw} height={sl} fill="none" stroke={DASH} strokeWidth={1.0} strokeDasharray="3 2" rx={rx} />;
}

// Gizli yatay çizgi (deliğin kesit izi düşümü)
function HideLineH({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return <line x1={x1} y1={y} x2={x2} y2={y} stroke={DASH} strokeWidth={0.85} strokeDasharray="4 3" />;
}

// ─── Delik satırı yardımcısı ──────────────────────────────────────────────────
function Holes({ xs, cy, g, dashed }: { xs: number[]; cy: number; g: Geom; dashed?: boolean }) {
  return <>
    {xs.map((cx, i) =>
      dashed
        ? g.isSlot ? <SHdash key={i} cx={cx} cy={cy} sw={g.sWmm} sl={g.sLmm} h /> : <RHdash key={i} cx={cx} cy={cy} r={g.holeDmm/2} />
        : g.isSlot ? <SH key={i} cx={cx} cy={cy} sw={g.sWmm} sl={g.sLmm} h /> : <RH key={i} cx={cx} cy={cy} r={g.holeDmm/2} />
    )}
  </>;
}

// Delik sütunu yardımcısı
function HolesV({ cx, ys, g, dashed }: { cx: number; ys: number[]; g: Geom; dashed?: boolean }) {
  return <>
    {ys.map((cy, i) =>
      dashed
        ? g.isSlot ? <SHdash key={i} cx={cx} cy={cy} sw={g.sWmm} sl={g.sLmm} h={false} /> : <RHdash key={i} cx={cx} cy={cy} r={g.holeDmm/2} />
        : g.isSlot ? <SH key={i} cx={cx} cy={cy} sw={g.sWmm} sl={g.sLmm} h={false} /> : <RH key={i} cx={cx} cy={cy} r={g.holeDmm/2} />
    )}
  </>;
}

// ─── Ortak yardımcılar ────────────────────────────────────────────────────────

// Yatay fin dizisi (bw genişliğinde, bh yüksekliğinde kutu içinde count fin)
function HorizFins({ bx, by, bw, bh, count }:
  { bx: number; by: number; bw: number; bh: number; count: number }) {
  const n = Math.max(count, 1);
  const pad = bh * 0.05; const zone = bh - pad * 2;
  const sp = zone / n; const fh = Math.max(sp * 0.55, 1);
  return <>
    {Array.from({ length: n }, (_, i) => {
      const fy = by + pad + i * sp + (sp - fh) / 2;
      return <rect key={i} x={bx+3} y={fy} width={bw-6} height={fh}
        fill={CUFILL} stroke={CU} strokeWidth={.85} rx={1} />;
    })}
  </>;
}

// Dikey fin dizisi
function VertFins({ bx, by, bw, bh, count }:
  { bx: number; by: number; bw: number; bh: number; count: number }) {
  const n = Math.max(count, 1);
  const pad = bw * 0.05; const zone = bw - pad * 2;
  const sp = zone / n; const fw = Math.max(sp * 0.55, 1);
  return <>
    {Array.from({ length: n }, (_, i) => {
      const fx = bx + pad + i * sp + (sp - fw) / 2;
      return <rect key={i} x={fx} y={by+3} width={fw} height={bh-6}
        fill={CUFILL} stroke={CU} strokeWidth={.85} rx={1} />;
    })}
  </>;
}

// Bakır şerit
function CuStrip({ x, y, w, h, lines = 3 }:
  { x: number; y: number; w: number; h: number; lines?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={CUFILL} stroke={CU} strokeWidth={.9} rx={1.5} />
      {Array.from({ length: lines }, (_, i) => (
        <line key={i} x1={x+3} y1={y + h*(i+1)/(lines+1)} x2={x+w-3} y2={y + h*(i+1)/(lines+1)}
          stroke={CU} strokeWidth={.5} opacity={.4} />
      ))}
    </g>
  );
}

// ─── Eksen göstergesi — her görünüşün altında ────────────────────────────────
function AxisBadge({ x, y, hAxis, vAxis }: { x: number; y: number; hAxis: string; vAxis: string }) {
  const len = 20;
  return (
    <g>
      <circle cx={x} cy={y} r={2} fill={DIM} opacity={0.7} />
      {/* Yatay eksen → */}
      <line x1={x} y1={y} x2={x + len} y2={y} stroke={DIM} strokeWidth={0.9} opacity={0.7} />
      <polygon points={`${x+len-3},${y-2} ${x+len+4},${y} ${x+len-3},${y+2}`} fill={DIM} opacity={0.7} />
      <text x={x+len+6} y={y+3.5} fontSize={8.5} fill={DIM} fontFamily="monospace" fontWeight={700} opacity={0.85}>{hAxis}</text>
      {/* Dikey eksen ↑ */}
      <line x1={x} y1={y} x2={x} y2={y - len} stroke={DIM} strokeWidth={0.9} opacity={0.7} />
      <polygon points={`${x-2},${y-len+3} ${x},${y-len-4} ${x+2},${y-len+3}`} fill={DIM} opacity={0.7} />
      <text x={x-3} y={y-len-6} fontSize={8.5} fill={DIM} fontFamily="monospace" fontWeight={700} opacity={0.85} textAnchor="middle">{vAxis}</text>
    </g>
  );
}

// ─── Gizli delik efsanesi ─────────────────────────────────────────────────────
function HideLegend({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x+18} y2={y} stroke={DASH} strokeWidth={0.85} strokeDasharray="4 3" />
      <text x={x+22} y={y+3.5} fontSize={7} fill={DASH} fontFamily="system-ui">kesit (gizli)</text>
    </g>
  );
}

// Bolt X pozisyonları — posXmm varsa ilk deliği sol kenardan konumlandır, yoksa ortala
function boltXs(bx: number, bw: number, n: number, spxSvg: number, sc: number, posXmm: number | null): number[] {
  const cx0 = posXmm != null
    ? bx + posXmm * sc                           // kesin konum: sol kenardan
    : bx + bw / 2 - (n - 1) * spxSvg / 2;       // otomatik: ortalı
  return Array.from({ length: n }, (_, i) => cx0 + i * spxSvg);
}

// Bolt Y pozisyonları — posYmm varsa ilk deliği üstten konumlandır, yoksa ortala
function boltYs(by: number, bh: number, n: number, spySvg: number, sc: number, posYmm: number | null): number[] {
  const cy0 = posYmm != null
    ? by + posYmm * sc
    : by + bh / 2 - (n - 1) * spySvg / 2;
  return Array.from({ length: n }, (_, i) => cy0 + i * spySvg);
}

// Z pozisyonu (derinlik ekseninde) — posZmm varsa kulllan, yoksa varsayılan oran
function posZsvg(by: number, bh: number, sc: number, posZmm: number | null, defaultRatio = 0.5): number {
  return posZmm != null ? by + posZmm * sc : by + bh * defaultRatio;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ÖN GÖRÜNÜŞ — GENİŞLİK (X) × YÜKSEKLİK (Y)
// ═══════════════════════════════════════════════════════════════════════════════
function FrontView({ g }: { g: Geom }) {
  const isKP  = g.type === "Kablo Pabuçlu";
  const isOT  = g.type === "Ön Terminal";
  const isAYT = g.type === "Arka Yatay Taraklı";
  const isAY  = g.type === "Arka Yatay Terminal";
  const isYT  = g.type === "Yandan Taraklı";

  const avlH = 130;
  const sc   = Math.min(AVLW / Math.max(g.wMm, 1), avlH / Math.max(g.hMm, 1), 3.5);
  const bw   = g.wMm * sc; const bh = g.hMm * sc;
  const bx   = ML + (AVLW - bw) / 2;
  const by   = HDR + MT;
  const SVH  = HDR + MT + avlH + MB;

  // Delik parametreleri (SVG birimiyle)
  const hR  = Math.min(g.holeDmm / 2 * sc, bw * .16, bh * .18);
  const sW  = Math.max(g.sWmm * sc, hR * 1.5);
  const sL  = Math.max(g.sLmm * sc, sW * 1.6);
  const spx = Math.min(g.boltSpMm * sc, (bw - sL - 6) / Math.max(g.boltN - 1, 1));
  // Delik Y: posYmm varsa kullan, yoksa üstten %26
  const hY  = g.posYmm != null ? by + g.posYmm * sc : by + bh * 0.26;
  const xs  = boltXs(bx, bw, g.boltN, spx, sc, g.posXmm);

  // Kablo pabuçlu parametreleri
  const headRx = bw * .38; const headRy = headRx * .82;
  const headCY = by + headRy + bh * .04;
  const shankW = bw * .36;
  const shankX = bx + bw / 2 - shankW / 2;
  const shankY = headCY + headRy * .7;
  const shankH = by + bh - shankY - bh * .04;

  return (
    <svg viewBox={`0 0 ${SW} ${Math.ceil(SVH)}`}
      style={{ width:"100%", border:"1px solid var(--line)", borderRadius:6, background:BG, display:"block" }}>
      <Hdr label="ÖN GÖRÜNÜŞ — GENİŞLİK × YÜKSEKLİK" accent="#3498db" id="hdr-tn-front" />

      {isKP ? (
        <>
          <ellipse cx={bx+bw/2} cy={headCY} rx={headRx} ry={headRy}
            fill={CUFILL} stroke={CU} strokeWidth={1.5} />
          {g.isSlot
            ? <SH cx={bx+bw/2} cy={headCY} sw={sW} sl={sL} h />
            : <RH cx={bx+bw/2} cy={headCY} r={hR} />}
          <rect x={shankX} y={shankY} width={shankW} height={shankH}
            fill={BFILL} stroke={BODY} strokeWidth={1.3} rx={shankW*.14} />
          {[.22,.48,.72].map((t,i) => (
            <line key={i} x1={shankX+2} y1={shankY+shankH*t} x2={shankX+shankW-2} y2={shankY+shankH*t}
              stroke={BODY} strokeWidth={.8} />
          ))}
        </>
      ) : (
        <>
          {/* Ana gövde */}
          <rect x={bx} y={by} width={bw} height={bh} fill={BFILL} stroke={BODY} strokeWidth={1.6} rx={2} />

          {/* Ön Terminal — doğrudan delikler */}
          {isOT && (
            <>
              <Holes xs={xs} cy={hY} g={{ ...g, holeDmm: g.holeDmm, sWmm: sW/sc, sLmm: sL/sc }} dashed={false} />
              {g.boltN >= 2 && xs.length >= 2 && (
                <DimH x1={xs[0]} x2={xs[xs.length-1]} y={hY + (g.isSlot ? sL/sc*sc/2+6 : hR+5)}
                  label={`${g.boltSpMm} mm`} color={RED} off={10} />
              )}
              {/* Üstten uzaklık boyutu */}
              {g.posYmm != null && (
                <DimV x={bx - 6} y1={by} y2={hY} label={`${g.posYmm} mm`} color="#f39c12" off={10} />
              )}
              {/* Sol kenardan uzaklık boyutu (ilk delik) */}
              {g.posXmm != null && xs.length > 0 && (
                <DimH x1={bx} x2={xs[0]} y={hY - hR - 14} label={`${g.posXmm} mm`} color="#f39c12" off={10} />
              )}
            </>
          )}

          {/* Arka Yatay Terminal — cihaz arkasında, önden görünmez */}
          {isAY && (
            <text x={bx+bw/2} y={by+bh/2+4} textAnchor="middle" fontSize={7.5}
              fill={MUT} fontFamily="system-ui" fontWeight={600}>
              Cihaz arkasında — ön yüzden görünmez
            </text>
          )}

          {/* Arka Yatay Taraklı — cihaz arkasında, önden görünmez */}
          {isAYT && (
            <text x={bx+bw/2} y={by+bh/2+4} textAnchor="middle" fontSize={7.5}
              fill={MUT} fontFamily="system-ui" fontWeight={600}>
              Cihaz arkasında — ön yüzden görünmez
            </text>
          )}

          {/* Yandan Taraklı — finler kenarda görünür */}
          {isYT && (
            <>
              {g.surf === "left" && (
                <VertFins bx={bx} by={by+4} bw={bw*.4} bh={bh-8} count={g.finN} />
              )}
              {g.surf === "right" && (
                <VertFins bx={bx+bw*.6} by={by+4} bw={bw*.4} bh={bh-8} count={g.finN} />
              )}
              <text x={bx+bw/2} y={by+bh+14} textAnchor="middle" fontSize={7}
                fill={DASH} fontFamily="system-ui">
                {g.surf === "left" ? "← Bağlantı delikleri sol yüzde" : "→ Bağlantı delikleri sağ yüzde"}
              </text>
            </>
          )}
        </>
      )}

      <DimH x1={bx} x2={bx+bw} y={by+bh} label={`${g.wMm} mm`} color={DIM} />
      <DimV x={bx} y1={by} y2={by+bh} label={`${g.hMm} mm`} color="#9b59b6" />
      <AxisBadge x={ML} y={Math.ceil(SVH) - 10} hAxis="X" vAxis="Y" />
      <HideLegend x={ML + 48} y={Math.ceil(SVH) - 10} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ARKA GÖRÜNÜŞ — GENİŞLİK (X) × YÜKSEKLİK (Y)
// ═══════════════════════════════════════════════════════════════════════════════
function BackView({ g }: { g: Geom }) {
  const isOT  = g.type === "Ön Terminal";
  const isAYT = g.type === "Arka Yatay Taraklı";
  const isAY  = g.type === "Arka Yatay Terminal";
  const isYT  = g.type === "Yandan Taraklı";
  const isKP  = g.type === "Kablo Pabuçlu";

  const avlH = 130;
  const sc   = Math.min(AVLW / Math.max(g.wMm, 1), avlH / Math.max(g.hMm, 1), 3.5);
  const bw   = g.wMm * sc; const bh = g.hMm * sc;
  const bx   = ML + (AVLW - bw) / 2;
  const by   = HDR + MT;
  const SVH  = HDR + MT + avlH + MB;

  const hR  = Math.min(g.holeDmm / 2 * sc, bw * .16, bh * .18);
  const sW  = Math.max(g.sWmm * sc, hR * 1.5);
  const sL  = Math.max(g.sLmm * sc, sW * 1.6);
  const spx = Math.min(g.boltSpMm * sc, (bw - sL - 6) / Math.max(g.boltN - 1, 1));
  const hY  = g.posYmm != null ? by + g.posYmm * sc : by + bh * 0.26;
  const xs  = boltXs(bx, bw, g.boltN, spx, sc, g.posXmm);

  return (
    <svg viewBox={`0 0 ${SW} ${Math.ceil(SVH)}`}
      style={{ width:"100%", border:"1px solid var(--line)", borderRadius:6, background:BG, display:"block" }}>
      <Hdr label="ARKA GÖRÜNÜŞ — GENİŞLİK × YÜKSEKLİK" accent="#e74c3c" id="hdr-tn-back" />

      {/* Ana gövde */}
      <rect x={bx} y={by} width={bw} height={bh} fill={BFILL} stroke={BODY} strokeWidth={1.6} rx={2} />

      {/* Ön Terminal: ön yüzden bağlantı — arka görünümde delik görünmez */}
      {isOT && (
        <text x={bx+bw/2} y={by+bh/2+4} textAnchor="middle" fontSize={7.5}
          fill={MUT} fontFamily="system-ui" fontWeight={600}>
          Ön yüzden bağlantı — arka görünümde delik yok
        </text>
      )}

      {/* Arka Yatay Taraklı: fin şeritleri + vida kanalı (TEK X=posXmm, Z-spaced) */}
      {/* Tüm vidalar aynı X konumunda, Z yönünde sıralı → arkadan bakınca hepsi aynı X'e yansır */}
      {isAYT && (() => {
        const n = g.finN;
        const autoFinThickSvg = (bh * 0.85) / n * 0.42;
        const fh = g.finThickMm > 0 ? g.finThickMm * sc : Math.max(autoFinThickSvg, 1.2);
        const finSpSvg = g.finSpMm > 0
          ? g.finSpMm * sc
          : n > 1 ? (bh - fh) / (n - 1) : bh * 0.5;
        const finBlockSvg   = (n - 1) * finSpSvg + fh;
        const autoOffsetSvg = Math.max((bh - finBlockSvg) / 2, 0);
        const finOffsetSvg  = g.finOffsetMm != null ? g.finOffsetMm * sc : autoOffsetSvg;
        const fy0 = by + finOffsetSvg + fh / 2;
        const fy1 = n > 1 ? fy0 + finSpSvg : fy0;

        // Tek vida X konumu: tüm vidalar aynı X=posXmm'de (Z yönünde sıralı)
        const hR_b = Math.max(Math.min(g.holeDmm / 2 * sc, bw * 0.10, fh * 0.42), 2);
        const hx   = g.posXmm != null
          ? Math.max(bx + hR_b, Math.min(bx + g.posXmm * sc, bx + bw - hR_b))
          : bx + bw / 2;

        return <>
          {/* Fin şeritleri — tam genişlik */}
          {Array.from({ length: n }, (_, i) => {
            const fy = by + finOffsetSvg + i * finSpSvg;
            return <rect key={i} x={bx} y={fy} width={bw} height={fh}
              fill={CUFILL} stroke={CU} strokeWidth={0.85} rx={0} />;
          })}

          {/* Vida kanalı: her fin için TEK X konumunda tam boy dikey dashed çizgi çifti */}
          {/* Z-spaced vidalar aynı X'e yansır → tek kanal, tüm finlerde aynı X */}
          {Array.from({ length: n }, (_, i) => {
            const finTop = by + finOffsetSvg + i * finSpSvg;
            const finBot = finTop + fh;
            const ext    = Math.min(2, fh * 0.25);
            return (
              <g key={`fin-${i}`}>
                <line x1={hx - hR_b} y1={finTop} x2={hx - hR_b} y2={finBot}
                  stroke={DASH} strokeWidth={0.85} strokeDasharray="4 2" />
                <line x1={hx + hR_b} y1={finTop} x2={hx + hR_b} y2={finBot}
                  stroke={DASH} strokeWidth={0.85} strokeDasharray="4 2" />
                <line x1={hx} y1={finTop - ext} x2={hx} y2={finBot + ext}
                  stroke={DASH} strokeWidth={0.5} strokeDasharray="6 2 1 2" opacity={0.75} />
              </g>
            );
          })}

          {/* Fin aralığı boyutu — sağ kenarda */}
          {n >= 2 && g.finSpMm > 0 && (
            <DimVR x={bx + bw + 4} y1={fy0} y2={fy1}
              label={`${g.finSpMm} mm`} color="#f39c12" off={12} />
          )}
          {/* Fin kalınlığı boyutu */}
          {g.finThickMm > 0 && (
            <DimVR x={bx + bw + 4} y1={fy0 - fh / 2} y2={fy0 + fh / 2}
              label={`${g.finThickMm} mm`} color={DIM} off={52} />
          )}
          {/* Sol kenardan vida X konumuna */}
          {g.posXmm != null && (
            <DimH x1={bx} x2={hx} y={by + finOffsetSvg - 12}
              label={`${g.posXmm} mm`} color="#f39c12" off={10} />
          )}
          <HideLegend x={bx} y={by + bh + 14} />
        </>;
      })()}

      {/* Yandan Taraklı: finler arka yüzde de görünür (kenarda) */}
      {isYT && (
        <>
          {g.surf === "left" && <VertFins bx={bx} by={by+4} bw={bw*.4} bh={bh-8} count={g.finN} />}
          {g.surf === "right" && <VertFins bx={bx+bw*.6} by={by+4} bw={bw*.4} bh={bh-8} count={g.finN} />}
        </>
      )}

      {/* Kablo Pabuçlu: arka basit gövde */}
      {isKP && (
        <CuStrip x={bx+bw*.1} y={by+bh*.1} w={bw*.8} h={bh*.8} lines={2} />
      )}

      {/* Arka Yatay Terminal: vidalar üst/alt yüzeyden giriyor (Y ekseni)
          Arka görünüşte (X×Y) terminal gövdesi görünür.
          Vidalar Y ekseninde → her bolt X konumunda üst/alt kenarda dashed çember */}
      {isAY && (() => {
        const spx2 = Math.min(g.boltSpMm * sc, (bw - 6) / Math.max(g.boltN - 1, 1));
        const xs2  = boltXs(bx, bw, g.boltN, spx2, sc, g.posXmm);
        const hR2  = Math.max(Math.min(g.holeDmm / 2 * sc, bw * 0.12, 10), 3);
        const holeY2 = g.surf === "bottom" ? by + bh - hR2 - 1 : by + hR2 + 1;
        return (
          <>
            {xs2.map((cx, i) => (
              <RHdash key={i} cx={cx} cy={holeY2} r={hR2} />
            ))}
            {g.boltN >= 2 && xs2.length >= 2 && (
              <DimH x1={xs2[0]} x2={xs2[xs2.length-1]} y={holeY2 + hR2 + 8}
                label={`${g.boltSpMm} mm`} color={RED} off={10} />
            )}
            {g.posXmm != null && xs2.length > 0 && (
              <DimH x1={bx} x2={xs2[0]} y={holeY2 - hR2 - 12}
                label={`${g.posXmm} mm`} color="#f39c12" off={10} />
            )}
            <HideLegend x={bx} y={by + bh + 14} />
          </>
        );
      })()}

      <DimH x1={bx} x2={bx+bw} y={by+bh} label={`${g.wMm} mm`} color={DIM} />
      <DimV x={bx} y1={by} y2={by+bh} label={`${g.hMm} mm`} color="#9b59b6" />
      <AxisBadge x={ML} y={Math.ceil(SVH) - 10} hAxis="X" vAxis="Y" />
      <HideLegend x={ML + 48} y={Math.ceil(SVH) - 10} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. YAN GÖRÜNÜŞ — DERİNLİK (Z) × YÜKSEKLİK (Y)
// ═══════════════════════════════════════════════════════════════════════════════
function SideView({ g }: { g: Geom }) {
  const isOT  = g.type === "Ön Terminal";
  const isAYT = g.type === "Arka Yatay Taraklı";
  const isAY  = g.type === "Arka Yatay Terminal";
  const isYT  = g.type === "Yandan Taraklı";
  const isKP  = g.type === "Kablo Pabuçlu";

  const avlH = 120;
  const sc   = Math.min(AVLW / Math.max(g.dMm, 1), avlH / Math.max(g.hMm, 1), 3.5);
  const bw   = g.dMm * sc;   // derinlik yatayda
  const bh   = g.hMm * sc;
  const bx   = ML + (AVLW - bw) / 2;
  const by   = HDR + MT;
  const SVH  = HDR + MT + avlH + MB;

  const hR   = Math.min(g.holeDmm / 2 * sc, bw * .2, bh * .15);
  const sWs  = Math.max(g.sWmm * sc, hR * 1.5);
  const sLs  = Math.max(g.sLmm * sc, sWs * 1.6);
  const spxY = Math.min(g.boltSpMm * sc, (bh - sLs - 6) / Math.max(g.boltN - 1, 1));

  // Ön Terminal: delikler ön yüzde → Y konumu (posYmm veya %26)
  const hY_front = g.posYmm != null ? by + g.posYmm * sc : by + bh * 0.26;
  // Z (derinlik) konumu: Ön Terminal için posZmm → x_svg; Arka Yatay için üst/alt kenar
  const holeXdepth = g.posZmm != null ? bx + g.posZmm * sc : bx + hR + 2;
  // Yandan Taraklı: sütun Y pozisyonları
  const ysYT = boltYs(by, bh, g.boltN, spxY, sc, g.posYmm);

  return (
    <svg viewBox={`0 0 ${SW} ${Math.ceil(SVH)}`}
      style={{ width:"100%", border:"1px solid var(--line)", borderRadius:6, background:BG, display:"block" }}>
      <Hdr label="YAN GÖRÜNÜŞ — DERİNLİK × YÜKSEKLİK" accent="#27ae60" id="hdr-tn-side" />

      {/* Ana gövde — tarak profili kendi gövdesini çizer, diğerleri için tam rect */}
      {!isAYT && (
        <rect x={bx} y={by} width={bw} height={bh} fill={BFILL} stroke={BODY} strokeWidth={1.6} rx={2} />
      )}
      {/* Arka Yatay Taraklı: dış çerçeve (bounding box — solid) */}
      {isAYT && (
        <rect x={bx} y={by} width={bw} height={bh} fill="none" stroke={BODY} strokeWidth={1.6}
          rx={2} />
      )}

      {/* Ön/Arka etiket */}
      <text x={bx+3} y={by-4} fontSize={7} fill="#3498db" fontFamily="system-ui" fontWeight={600}>ÖN</text>
      <text x={bx+bw-3} y={by-4} fontSize={7} fill="#e74c3c" fontFamily="system-ui" fontWeight={600} textAnchor="end">ARKA</text>

      {/* ── Ön Terminal: kesit (delik ön yüzden Z yönünde giriyor) ──
          Yan görünüş (Z×Y): ön yüz = sol kenar (bx)
          Delik Z yönünde ilerler → iki yatay dashed çizgi + dash-dot merkez + dibi kapak
          Boyut okları: Y konumu (posYmm), delik derinliği (posZmm), çap (holeDmm) */}
      {isOT && (() => {
        const holeDepthSvg = g.posZmm != null
          ? Math.min(g.posZmm * sc, bw - 2)
          : Math.min(bw * 0.55, bw - 2);
        const endX = bx + holeDepthSvg;
        const ext  = 5;
        const hasDims = g.posYmm != null || g.posZmm != null;
        return (
          <g>
            {/* Üst çap çizgisi */}
            <line x1={bx} y1={hY_front - hR} x2={endX} y2={hY_front - hR}
              stroke={DASH} strokeWidth={0.85} strokeDasharray="4 2" />
            {/* Alt çap çizgisi */}
            <line x1={bx} y1={hY_front + hR} x2={endX} y2={hY_front + hR}
              stroke={DASH} strokeWidth={0.85} strokeDasharray="4 2" />
            {/* Delik dibi (kapalı uç) */}
            <line x1={endX} y1={hY_front - hR} x2={endX} y2={hY_front + hR}
              stroke={DASH} strokeWidth={0.85} strokeDasharray="4 2" />
            {/* Merkez çizgisi (dash-dot) */}
            <line x1={bx - ext} y1={hY_front} x2={endX + ext} y2={hY_front}
              stroke={DASH} strokeWidth={0.5} strokeDasharray="6 2 1 2" opacity={0.75} />
            {/* Y konumu boyutu — sol kenarda */}
            {g.posYmm != null && (
              <DimV x={bx - 8} y1={by} y2={hY_front}
                label={`${g.posYmm} mm`} color="#f39c12" off={12} />
            )}
            {/* Delik derinliği (Z) — alt boyut */}
            {g.posZmm != null && (
              <DimH x1={bx} x2={endX} y={hY_front + hR + 10}
                label={`${g.posZmm} mm`} color="#f39c12" off={10} />
            )}
            {/* Çap boyutu — sağda */}
            <DimVR x={endX + 4} y1={hY_front - hR} y2={hY_front + hR}
              label={`Ø${g.holeDmm} mm`} color={RED} off={10} />
            {hasDims && <line x1={bx} y1={by+bh} x2={bx} y2={by+bh} stroke="none" />}
          </g>
        );
      })()}

      {/* ── Arka Yatay Terminal: vidalar Y ekseninde (üst/alt yüzeyden giriyor)
          Yan görünüş (Z×Y): vida Z konumunda, Y ekseninde aşağı/yukarı uzanan dikey kanal
          posZmm = vidanın arka gövdedeki Z konumu (önden itibaren) */}
      {isAY && (() => {
        // Vida Z konumu → SVG'de yatay (bw ekseni)
        const vZsvg = g.posZmm != null
          ? Math.min(g.posZmm * sc, bw - hR - 2)
          : bw * 0.5;
        const vx = bx + vZsvg;
        // Vida kanalı derinliği Y'de — bolt_depth_mm yoksa %50 yükseklik
        const channelDepth = Math.min(bh * 0.55, bh - 4);
        const topY  = g.surf === "bottom" ? by + bh - channelDepth : by;
        const botY  = g.surf === "bottom" ? by + bh                : by + channelDepth;
        const ext   = 4;
        return (
          <>
            {/* Dikey dashed kanal çizgi çifti (vida Y ekseninde) */}
            <line x1={vx - hR} y1={topY} x2={vx - hR} y2={botY}
              stroke={DASH} strokeWidth={0.85} strokeDasharray="4 2" />
            <line x1={vx + hR} y1={topY} x2={vx + hR} y2={botY}
              stroke={DASH} strokeWidth={0.85} strokeDasharray="4 2" />
            {/* Kanal dibi (kapalı uç) */}
            <line x1={vx - hR} y1={botY} x2={vx + hR} y2={botY}
              stroke={DASH} strokeWidth={0.85} strokeDasharray="4 2" />
            {/* Merkez dash-dot */}
            <line x1={vx} y1={topY - ext} x2={vx} y2={botY + ext}
              stroke={DASH} strokeWidth={0.5} strokeDasharray="6 2 1 2" opacity={0.75} />
            {/* Çap boyutu — sağda */}
            <DimVR x={vx + hR + 4} y1={topY} y2={botY}
              label={`Ø${g.holeDmm} mm`} color={RED} off={10} />
            {/* Z konumu boyutu — altta */}
            {g.posZmm != null && (
              <DimH x1={bx} x2={vx} y={by + bh + 14}
                label={`${g.posZmm} mm`} color="#f39c12" off={10} />
            )}
            <HideLegend x={bx+4} y={by+bh+30} />
          </>
        );
      })()}

      {/* ── Arka Yatay Taraklı: TARAK PROFİLİ (yan kesit görünüşü) ──
          Yan görünüş (Derinlik Z × Yükseklik Y):
            Sol = ÖN yüz, Sağ = ARKA yüz
            Gövde (spine): SOLDA — finler SAĞA uzanır
            Vida delikleri: üst/alt yüzeyden giren kanal → kesit çizgisi */}
      {isAYT && (() => {
        const n = g.finN;

        // ── Plaka ve fin boyutları ─────────────────────────────────────────────
        const rawBodyW  = bw * 0.28;
        const bodyW     = g.plateThickMm > 0 ? g.plateThickMm * sc : rawBodyW;
        const bodyX     = bx;
        const finStartX = bodyX + bodyW;
        const finLenSvg = g.finLengthMm > 0
          ? g.finLengthMm * sc
          : Math.max(bw - bodyW, 4);
        const finEndX   = finStartX + finLenSvg;
        const finLength = Math.max(finLenSvg, 4);

        // ── Fin kalınlığı (Y ekseni) ───────────────────────────────────────────
        // finThickMm verilmişse kullan, yoksa otomatik: finBlock / n * 0.42
        const autoFinThickSvg = (bh * 0.85) / n * 0.42;
        const fh = g.finThickMm > 0 ? g.finThickMm * sc : Math.max(autoFinThickSvg, 1.5);

        // ── Fin aralığı merkez-merkez (Y ekseni) ──────────────────────────────
        // Formül doğrulama: finBlock = (n-1)*spacing + thickness ≤ height
        const finSpSvg = g.finSpMm > 0
          ? g.finSpMm * sc
          : n > 1 ? (bh - fh) / (n - 1) : bh * 0.5;   // otomatik: eşit dağıt

        // ── İlk fin üst kenarı (Y offset) ─────────────────────────────────────
        // Fin bloğu: (n-1)*spacing + thickness
        const finBlockSvg  = (n - 1) * finSpSvg + fh;
        const autoOffsetSvg = Math.max((bh - finBlockSvg) / 2, 0);  // oto-ortala
        const finOffsetSvg  = g.finOffsetMm != null
          ? g.finOffsetMm * sc
          : autoOffsetSvg;

        // Fin merkez Y pozisyonları (boyut için)
        const fy0 = by + finOffsetSvg + fh / 2;
        const fy1 = n > 1 ? fy0 + finSpSvg : fy0;

        // ── Vida delik Z konumu: posZmm = FİN BAŞINDAN ────────────────────────
        const hR_min  = Math.max(hR, 3.5);
        const holeXraw = g.posZmm != null
          ? finStartX + g.posZmm * sc
          : (finStartX + finEndX) / 2;
        const holeX = Math.max(finStartX + hR_min, Math.min(holeXraw, finEndX - hR_min));

        const hasBotDims = g.plateThickMm > 0 || g.finLengthMm > 0;

        return (
          <>
            {/* Gövde / plaka: sol (ÖN) taraf */}
            <rect x={bodyX} y={by} width={bodyW} height={bh}
              fill={CUFILL} stroke={CU} strokeWidth={1.3} rx={1} />

            {/* Finler: merkez-merkez aralık + gerçek offset ile konumlandırılmış */}
            {Array.from({ length: n }, (_, i) => {
              const fy = by + finOffsetSvg + i * finSpSvg;   // fin üst kenarı
              return <rect key={i} x={finStartX} y={fy} width={finLength} height={fh}
                fill={CUFILL} stroke={CU} strokeWidth={0.85} rx={1} />;
            })}

            {/* Vida delik kesiti: her fin × her vida = finN × boltN kesit */}
            {/* Yan kesit (Z-Y): boltSpMm = fin içi vidalar arası Z mesafesi          */}
            {/* posZmm = ilk vidanın fin başından Z uzaklığı                           */}
            {(() => {
              const boltSpSvg = g.boltSpMm > 0 ? g.boltSpMm * sc : Math.max(hR_min * 3, 8);
              return Array.from({ length: n }, (_, i) => {
                const finTop = by + finOffsetSvg + i * finSpSvg;
                const finBot = finTop + fh;
                const ext = Math.min(3, fh * 0.3);
                return (
                  <g key={`fin-cs-${i}`}>
                    {Array.from({ length: g.boltN }, (_, j) => {
                      const cx = Math.min(holeX + j * boltSpSvg, finEndX - hR_min);
                      return (
                        <g key={`bolt-cs-${j}`}>
                          <line x1={cx - hR_min} y1={finTop} x2={cx - hR_min} y2={finBot}
                            stroke={DASH} strokeWidth={0.85} strokeDasharray="4 2" />
                          <line x1={cx + hR_min} y1={finTop} x2={cx + hR_min} y2={finBot}
                            stroke={DASH} strokeWidth={0.85} strokeDasharray="4 2" />
                          <line x1={cx} y1={finTop - ext} x2={cx} y2={finBot + ext}
                            stroke={DASH} strokeWidth={0.5} strokeDasharray="6 2 1 2" opacity={0.75} />
                        </g>
                      );
                    })}
                  </g>
                );
              });
            })()}

            {/* Fin aralığı boyutu (m-m) — sağ kenarda */}
            {n >= 2 && g.finSpMm > 0 && (
              <DimVR x={finEndX + 3} y1={fy0} y2={fy1}
                label={`${g.finSpMm} mm`} color="#f39c12" off={12} />
            )}
            {/* Fin offset boyutu — sol kenarda (üst boşluk) */}
            {g.finOffsetMm != null && finOffsetSvg > 2 && (
              <DimV x={bodyX - 8} y1={by} y2={by + finOffsetSvg}
                label={`${g.finOffsetMm} mm`} color={DIM} off={10} />
            )}

            {/* Alt boyut okları */}
            {g.plateThickMm > 0 && (
              <DimH x1={bodyX} x2={bodyX + bodyW} y={by + bh + 14}
                label={`${g.plateThickMm} mm`} color={DIM} off={10} />
            )}
            {g.finLengthMm > 0 && (
              <DimH x1={finStartX} x2={finStartX + finLenSvg} y={by + bh + 14}
                label={`${g.finLengthMm} mm`} color={CU} off={10} />
            )}
            {g.posZmm != null && (
              <DimH x1={finStartX} x2={holeX} y={by + bh + (hasBotDims ? 30 : 14)}
                label={`${g.posZmm} mm`} color="#f39c12" off={10} />
            )}
            <HideLegend x={bx+4} y={by+bh+(hasBotDims ? 48 : 26)} />
          </>
        );
      })()}

      {/* ── Yandan Taraklı: TARAK PROFİLİ (yan kesit görünüşü)
          YT = AYT'nin dikey hali. Finler sol/sağ yüzden X yönüne uzuyor.
          Yan görünüş (Z×Y): terminal gövdesi + finler Z yönünde derinliğe uzuyor.
          Sol = ÖN (z=0), Sağ = ARKA.
          Fin konumu: fin_offset_mm'den başlar, bh içinde Y yönünde sıralı.
          Fin boyutu: kalınlık=finThickMm (Y), uzunluk=finLengthMm (Z). */}
      {isYT && (() => {
        const n = g.finN;

        // Gövde (spine): sol kenar, ön yüz tarafında — AYT'ye benzer yapı
        const rawBodyW  = bw * 0.28;
        const bodyW     = g.plateThickMm > 0 ? g.plateThickMm * sc : rawBodyW;
        const bodyX     = bx;
        const finStartX = bodyX + bodyW;
        const finLenSvg = g.finLengthMm > 0 ? g.finLengthMm * sc : Math.max(bw - bodyW, 4);
        const finLength = Math.max(finLenSvg, 4);

        // Fin kalınlığı (Y ekseni)
        const autoFinThickSvg = (bh * 0.85) / n * 0.42;
        const fh = g.finThickMm > 0 ? g.finThickMm * sc : Math.max(autoFinThickSvg, 1.5);

        // Fin aralığı merkez-merkez (Y ekseni)
        const finSpSvg = g.finSpMm > 0
          ? g.finSpMm * sc
          : n > 1 ? (bh - fh) / (n - 1) : bh * 0.5;

        // İlk fin üst kenarı (Y offset)
        const finBlockSvg   = (n - 1) * finSpSvg + fh;
        const autoOffsetSvg = Math.max((bh - finBlockSvg) / 2, 0);
        const finOffsetSvg  = g.finOffsetMm != null ? g.finOffsetMm * sc : autoOffsetSvg;

        // Fin merkez Y pozisyonları (boyut için)
        const fy0 = by + finOffsetSvg + fh / 2;
        const fy1 = n > 1 ? fy0 + finSpSvg : fy0;

        // Vida delik konumu: posZmm = FİN BAŞINDAN Z (YT'de de geçerli)
        const hR_yt = Math.max(hR, 3.5);
        const holeXraw = g.posZmm != null
          ? finStartX + g.posZmm * sc
          : (finStartX + finStartX + finLength) / 2;
        const holeX = Math.max(finStartX + hR_yt, Math.min(holeXraw, finStartX + finLength - hR_yt));

        const hasBotDims = g.plateThickMm > 0 || g.finLengthMm > 0;

        return (
          <>
            {/* Gövde / plaka: sol (ÖN) taraf */}
            <rect x={bodyX} y={by} width={bodyW} height={bh}
              fill={CUFILL} stroke={CU} strokeWidth={1.3} rx={1} />

            {/* Finler: Y konumlu dikey plakalar, Z yönünde uzuyor */}
            {Array.from({ length: n }, (_, i) => {
              const fy = by + finOffsetSvg + i * finSpSvg;
              return <rect key={i} x={finStartX} y={fy} width={finLength} height={fh}
                fill={CUFILL} stroke={CU} strokeWidth={0.85} rx={1} />;
            })}

            {/* Vida delikleri: her finde posZmm konumunda (Y ekseninde kanal) */}
            {Array.from({ length: n }, (_, i) => {
              const finTop = by + finOffsetSvg + i * finSpSvg;
              const finBot = finTop + fh;
              const ext = Math.min(3, fh * 0.3);
              return (
                <g key={`yt-cs-${i}`}>
                  <line x1={holeX - hR_yt} y1={finTop} x2={holeX - hR_yt} y2={finBot}
                    stroke={DASH} strokeWidth={0.85} strokeDasharray="4 2" />
                  <line x1={holeX + hR_yt} y1={finTop} x2={holeX + hR_yt} y2={finBot}
                    stroke={DASH} strokeWidth={0.85} strokeDasharray="4 2" />
                  <line x1={holeX} y1={finTop - ext} x2={holeX} y2={finBot + ext}
                    stroke={DASH} strokeWidth={0.5} strokeDasharray="6 2 1 2" opacity={0.75} />
                </g>
              );
            })}

            {/* Fin aralığı boyutu (m-m) */}
            {n >= 2 && g.finSpMm > 0 && (
              <DimVR x={finStartX + finLength + 3} y1={fy0} y2={fy1}
                label={`${g.finSpMm} mm`} color="#f39c12" off={12} />
            )}
            {/* Fin offset — üst boşluk */}
            {g.finOffsetMm != null && finOffsetSvg > 2 && (
              <DimV x={bodyX - 8} y1={by} y2={by + finOffsetSvg}
                label={`${g.finOffsetMm} mm`} color={DIM} off={10} />
            )}
            {/* Alt boyut okları */}
            {g.plateThickMm > 0 && (
              <DimH x1={bodyX} x2={bodyX + bodyW} y={by + bh + 14}
                label={`${g.plateThickMm} mm`} color={DIM} off={10} />
            )}
            {g.finLengthMm > 0 && (
              <DimH x1={finStartX} x2={finStartX + finLenSvg} y={by + bh + 14}
                label={`${g.finLengthMm} mm`} color={CU} off={10} />
            )}
            {g.posZmm != null && (
              <DimH x1={finStartX} x2={holeX} y={by + bh + (hasBotDims ? 30 : 14)}
                label={`${g.posZmm} mm`} color="#f39c12" off={10} />
            )}
            <HideLegend x={bx+4} y={by + bh + (hasBotDims ? 48 : 26)} />
          </>
        );
      })()}

      {/* Kablo Pabuçlu: yan profil */}
      {isKP && (
        <rect x={bx+bw*.2} y={by+bh*.05} width={bw*.6} height={bh*.9}
          fill={CUFILL} stroke={CU} strokeWidth={1} rx={3} />
      )}

      <DimH x1={bx} x2={bx+bw} y={by+bh} label={`${g.dMm} mm`} color="#27ae60" />
      <DimV x={bx} y1={by} y2={by+bh} label={`${g.hMm} mm`} color="#9b59b6" />
      <AxisBadge x={ML} y={Math.ceil(SVH) - 10} hAxis="Z" vAxis="Y" />
      <HideLegend x={ML + 48} y={Math.ceil(SVH) - 10} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ÜST/ALT GÖRÜNÜŞ — GENİŞLİK (X) × DERİNLİK (Z)
// Üst görünüş: ön yüz üstte, arka yüz altta
// ═══════════════════════════════════════════════════════════════════════════════
function TopBottomView({ g }: { g: Geom }) {
  const isOT  = g.type === "Ön Terminal";
  const isAYT = g.type === "Arka Yatay Taraklı";
  const isAY  = g.type === "Arka Yatay Terminal";
  const isYT  = g.type === "Yandan Taraklı";
  const isKP  = g.type === "Kablo Pabuçlu";

  // Yüzey "top" veya "bottom"
  const isDirectTopBot = g.surf === "top" || g.surf === "bottom";
  const isDirectSide   = g.surf === "left" || g.surf === "right";

  const avlH = Math.min(Math.max(g.dMm / g.wMm * 140, 55), 120);
  const sc   = Math.min(AVLW / Math.max(g.wMm, 1), avlH / Math.max(g.dMm, 1), 3.5);
  const bw   = g.wMm * sc;  // genişlik yatayda
  const bh   = g.dMm * sc;  // derinlik dikeyde
  const bx   = ML + (AVLW - bw) / 2;
  const by   = HDR + MT;
  const SVH  = HDR + MT + avlH + MB;

  const hR  = Math.min(g.holeDmm / 2 * sc, bw * .16, bh * .28);
  const sWt = Math.max(g.sWmm * sc, hR * 1.5);
  const sLt = Math.max(g.sLmm * sc, sWt * 1.6);
  const spx = Math.min(g.boltSpMm * sc, (bw - sLt - 6) / Math.max(g.boltN - 1, 1));
  const xs  = boltXs(bx, bw, g.boltN, spx, sc, g.posXmm);

  // Delik Y pozisyonu (Y ekseninde = derinlik / Z)
  const holeY_OT  = g.posZmm != null ? by + g.posZmm * sc : by + Math.min(bh * 0.22, hR * 2 + 3);
  const holeY_YT  = g.posZmm != null ? by + g.posZmm * sc : by + bh * 0.5;

  // AYT: posZmm = FİN BAŞINDAN uzaklık (plaka kalınlığı sonrasından)
  const aytPlateH  = g.plateThickMm > 0 ? g.plateThickMm * sc : bh * 0.28;
  const aytFinEndH = g.finLengthMm  > 0 ? Math.min(aytPlateH + g.finLengthMm * sc, bh) : bh;
  const finAreaStartY = by + aytPlateH;   // fin alanı üst görünüşte başlangıcı (SVG y)
  const finAreaEndY   = by + aytFinEndH;  // fin alanı sonu (SVG y)
  const holeY_AY = g.posZmm != null
    ? Math.max(finAreaStartY + hR, Math.min(finAreaStartY + g.posZmm * sc, finAreaEndY - hR))
    : (finAreaStartY + finAreaEndY) / 2;

  // Etiket
  const viewLabel = g.surf === "bottom"
    ? "ALT GÖRÜNÜŞ — GENİŞLİK × DERİNLİK"
    : "ÜST GÖRÜNÜŞ — GENİŞLİK × DERİNLİK";

  return (
    <svg viewBox={`0 0 ${SW} ${Math.ceil(SVH)}`}
      style={{ width:"100%", border:"1px solid var(--line)", borderRadius:6, background:BG, display:"block" }}>
      <Hdr label={viewLabel} accent="#f39c12" id="hdr-tn-top" />

      {/* Ana gövde */}
      <rect x={bx} y={by} width={bw} height={bh} fill={BFILL} stroke={BODY} strokeWidth={1.6} rx={2} />

      {/* Ön/Arka yüzey işaret çizgileri */}
      <line x1={bx} y1={by} x2={bx+bw} y2={by} stroke="#3498db" strokeWidth={1.2} />
      <line x1={bx} y1={by+bh} x2={bx+bw} y2={by+bh} stroke="#e74c3c" strokeWidth={1.2} />
      <text x={bx+4} y={by-3} fontSize={7} fill="#3498db" fontFamily="system-ui" fontWeight={600}>ÖN ↑</text>
      <text x={bx+4} y={by+bh+11} fontSize={7} fill="#e74c3c" fontFamily="system-ui" fontWeight={600}>ARKA ↓</text>

      {/* ── Ön Terminal: dashed delikler (ön yüzden giriyor, üstten gizli) ── */}
      {isOT && (
        <Holes xs={xs} cy={holeY_OT} g={{ ...g, sWmm: sWt/sc, sLmm: sLt/sc }} dashed />
      )}

      {/* ── Arka Yatay Taraklı: üstten bakış (X×Z düzlemi)
          Finler Y yönünde ayrılmış yatay plakalar → üstten bakınca ince yatay bantlar.
          Her fin ayrı ince band; aralarında boşluk var.
          Plaka alanı (ön kenar, dolu) + fin bantları (ayrı ayrı).
          Vidalar: tek X konumunda, Z yönünde boltN adet. */}
      {isAYT && (() => {
        const n       = g.finN;
        // Plaka alanı (ön kenar, Z yönünde)
        const plateZsvg = g.plateThickMm > 0 ? g.plateThickMm * sc : bh * 0.28;
        // Fin alanı Z sınırları
        const finAreaZ0 = by + plateZsvg;
        const finAreaZ1 = g.finLengthMm > 0 ? Math.min(by + plateZsvg + g.finLengthMm * sc, by + bh) : by + bh;
        const finZspan  = finAreaZ1 - finAreaZ0;

        // Fin kalınlığı: Y → üstten bakınca görünen şerit kalınlığı
        // Üst görünüşte Y ekseni "içeri/dışarı" gidiyor — finler Y'de ince
        // Şematik: bh / finN * 0.35 oranında görsel kalınlık
        const autoFinW = finZspan / n * 0.35;
        const finW     = g.finThickMm > 0
          ? Math.min(g.finThickMm * sc, finZspan / n * 0.9)
          : Math.max(autoFinW, 1.5);
        // Fin aralığı Z'de eşit dağıt (görsel temsil)
        const finSpZ   = n > 1 ? finZspan / (n - 1) : finZspan;

        // Tek vida X konumu
        const boltCx = g.posXmm != null
          ? Math.max(bx + hR, Math.min(bx + g.posXmm * sc, bx + bw - hR))
          : bx + bw / 2;

        // boltN adet vida Z pozisyonu (SVG Y ekseni)
        const boltSpSvg = g.boltSpMm > 0 ? g.boltSpMm * sc : Math.max(hR * 3, 8);
        const firstY    = holeY_AY;
        const holeYs    = Array.from({ length: g.boltN }, (_, j) =>
          Math.min(firstY + j * boltSpSvg, finAreaZ1 - hR)
        );

        return (
          <>
            {/* Plaka alanı — ön kenar (dolu, solid) */}
            <rect x={bx} y={by} width={bw} height={plateZsvg}
              fill={CUFILL} stroke={CU} strokeWidth={1.0} rx={1} />
            {/* Plaka/fin sınır */}
            <line x1={bx} y1={finAreaZ0} x2={bx + bw} y2={finAreaZ0}
              stroke={CU} strokeWidth={1.2} strokeDasharray="4 2" />
            {/* Fin bantları: her fin ayrı ince bant (Y kalınlığının Z'ye yansıması) */}
            {Array.from({ length: n }, (_, i) => {
              const fy = finAreaZ0 + (n > 1 ? i * finSpZ : finZspan / 2) - finW / 2;
              return (
                <rect key={i} x={bx} y={Math.max(fy, finAreaZ0)} width={bw}
                  height={Math.min(finW, finAreaZ1 - Math.max(fy, finAreaZ0))}
                  fill={CUFILL} stroke={CU} strokeWidth={0.7} rx={0} />
              );
            })}
            {/* Vida delikleri: tek X, boltN adet Z konumunda */}
            <HolesV cx={boltCx} ys={holeYs} g={{ ...g, sWmm: sWt/sc, sLmm: sLt/sc }} dashed={false} />
            {/* Vida Z aralığı boyutu */}
            {g.boltN >= 2 && holeYs.length >= 2 && g.boltSpMm > 0 && (
              <DimVR x={bx + bw + 4} y1={holeYs[0]} y2={holeYs[holeYs.length - 1]}
                label={`${g.boltSpMm} mm`} color={RED} off={10} />
            )}
            {/* Sol kenardan vida X konumuna */}
            {g.posXmm != null && (
              <DimH x1={bx} x2={boltCx} y={holeYs[0] != null ? holeYs[0] - hR - 12 : by - 12}
                label={`${g.posXmm} mm`} color="#f39c12" off={10} />
            )}
            {/* Fin başından ilk vidaya Z uzaklığı */}
            {g.posZmm != null && holeYs.length > 0 && (
              <DimV x={bx - 6} y1={finAreaZ0} y2={holeYs[0]}
                label={`${g.posZmm} mm`} color="#f39c12" off={10} />
            )}
          </>
        );
      })()}

      {/* ── Arka Yatay Terminal: doğrudan delikler + boyut okları ── */}
      {isAY && (
        <>
          <Holes xs={xs} cy={holeY_AY} g={{ ...g, sWmm: sWt/sc, sLmm: sLt/sc }} dashed={false} />
          {g.boltN >= 2 && xs.length >= 2 && (
            <DimH x1={xs[0]} x2={xs[xs.length-1]} y={holeY_AY + (g.isSlot ? sLt/2+6 : hR+5)}
              label={`${g.boltSpMm} mm`} color={RED} off={10} />
          )}
          {g.posZmm != null && (
            <DimV x={bx - 6} y1={by} y2={holeY_AY} label={`${g.posZmm} mm`} color="#f39c12" off={10} />
          )}
        </>
      )}

      {/* ── Yandan Taraklı: üstten bakış (X×Z düzlemi)
          YT finleri sol/sağ yüzden X yönüne uzuyor.
          Üstten: gövde sol veya sağ kenarda, finler X yönünde çıkıntı yapıyor.
          Finler Z yönünde aralıklı DEĞİL (Y aralıklı) → üstten tek fin kesiti görünür.
          Vida deliği: Z konumunda (posZmm), X'de fin ucu tarafında — dashed. */}
      {isYT && (() => {
        // Fin uzunluğu X yönünde (gövdeden dışarı)
        const finLenX = g.finLengthMm > 0 ? g.finLengthMm * sc : bw * 0.45;
        const bodyWx  = g.plateThickMm  > 0 ? g.plateThickMm * sc : bw * 0.25;
        const isLeft  = g.surf === "left";

        // Gövde ve fin X aralıkları
        const bodyStartX = isLeft ? bx            : bx + bw - bodyWx;
        const finStartX2 = isLeft ? bx + bodyWx   : bx + bw - bodyWx - finLenX;

        // Vida deliğinin Z konumu (SVG'de Y ekseni)
        const holeZy = g.posZmm != null
          ? Math.max(by + hR, Math.min(by + g.posZmm * sc, by + bh - hR))
          : by + bh * 0.5;

        // Vida deliğinin X konumu: fin içinde, kenara yakın
        const holeCx = isLeft
          ? Math.min(finStartX2 + finLenX - hR, finStartX2 + finLenX * 0.75)
          : Math.max(finStartX2 + hR, finStartX2 + finLenX * 0.25);

        return (
          <>
            {/* Gövde plaka */}
            <rect x={bodyStartX} y={by} width={bodyWx} height={bh}
              fill={CUFILL} stroke={CU} strokeWidth={1.0} rx={1} />
            {/* Fin (üstten tek kesit olarak görünür — Y aralıklı finler üste yansımaz) */}
            <rect x={finStartX2} y={by} width={finLenX} height={bh}
              fill={CUFILL} stroke={CU} strokeWidth={1.0} rx={1} opacity={0.7} />
            {/* Fin/gövde sınır çizgisi */}
            <line
              x1={isLeft ? finStartX2 : finStartX2 + finLenX}
              y1={by}
              x2={isLeft ? finStartX2 : finStartX2 + finLenX}
              y2={by + bh}
              stroke={CU} strokeWidth={1.2} strokeDasharray="4 2" />
            {/* Vida deliği: fin içinde, dashed (üstten gizli) */}
            <RHdash cx={holeCx} cy={holeZy} r={hR} />
            {/* Fin uzunluğu boyutu */}
            {g.finLengthMm > 0 && (
              <DimH x1={finStartX2} x2={finStartX2 + finLenX} y={by + bh + 14}
                label={`${g.finLengthMm} mm`} color={CU} off={10} />
            )}
            {/* Fin başından Z konumu */}
            {g.posZmm != null && (
              <DimV x={isLeft ? finStartX2 - 8 : finStartX2 + finLenX + 8} y1={by} y2={holeZy}
                label={`${g.posZmm} mm`} color="#f39c12" off={10} />
            )}
            <HideLegend x={bx+4} y={by + bh + 30} />
          </>
        );
      })()}

      {/* Kablo Pabuçlu: üstten oval kafa */}
      {isKP && (
        <ellipse cx={bx+bw/2} cy={by+bh*0.35} rx={bw*.36} ry={bh*.3}
          fill={CUFILL} stroke={CU} strokeWidth={1.2} />
      )}

      <DimH x1={bx} x2={bx+bw} y={by+bh} label={`${g.wMm} mm`} color={DIM} />
      <DimV x={bx} y1={by} y2={by+bh} label={`${g.dMm} mm`} color="#f39c12" />
      <AxisBadge x={ML} y={Math.ceil(SVH) - 10} hAxis="X" vAxis="Z" />
      <HideLegend x={ML + 48} y={Math.ceil(SVH) - 10} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANA BİLEŞEN — 4 görünüş alt alta
// ═══════════════════════════════════════════════════════════════════════════════
export function TerminalPreview({
  terminal_type,
  surface,
  terminal_width_mm,
  terminal_height_mm,
  terminal_depth_mm,
  bolt_count,
  bolt_center_distance_mm,
  hole_diameter_mm,
  slot_width_mm,
  slot_length_mm,
  fin_count,
  fin_spacing_mm,
  fin_thickness_mm,
  fin_length_mm,
  fin_offset_mm,
  plate_thickness_mm,
  bolt_pos_x_mm,
  bolt_pos_y_mm,
  bolt_pos_z_mm,
}: TerminalPreviewProps) {
  const isSlot = !!(slot_width_mm || slot_length_mm);

  // Fin adedini önce fin_count'tan, yoksa bolt_count*2 den al
  const finN = Math.max(
    fin_count ?? (bolt_count ? bolt_count * 2 : 6),
    2
  );
  const finSpMm = fin_spacing_mm ?? (bolt_count && bolt_center_distance_mm
    ? bolt_center_distance_mm / 2
    : 20);
  const finThickMm   = Math.max(fin_thickness_mm   ?? 0, 0);
  const finLengthMm  = Math.max(fin_length_mm      ?? 0, 0);
  const finOffsetMm  = fin_offset_mm != null ? Math.max(fin_offset_mm, 0) : null;
  const plateThickMm = Math.max(plate_thickness_mm ?? 0, 0);

  // "top_bottom" çizimi etkilemez — önizleme için "top" olarak göster
  const surfForPreview = surface === "top_bottom" ? "top" : (surface || "front");

  const g: Geom = {
    type:     terminal_type,
    surf:     surfForPreview,
    wMm:      Math.max(terminal_width_mm  ?? 100, 5),
    hMm:      Math.max(terminal_height_mm ?? 120, 5),
    dMm:      Math.max(terminal_depth_mm  ?? 60,  5),
    boltN:    Math.max(bolt_count         ?? 2,   1),
    boltSpMm: bolt_center_distance_mm     ?? 70,
    isSlot,
    sWmm:     Math.max(slot_width_mm      ?? 12,  4),
    sLmm:     Math.max(slot_length_mm     ?? 30,  8),
    holeDmm:  Math.max(hole_diameter_mm   ?? 13,  4),
    finN,
    finSpMm,
    finThickMm,
    finLengthMm,
    finOffsetMm,
    plateThickMm,
    posXmm:   bolt_pos_x_mm ?? null,
    posYmm:   bolt_pos_y_mm ?? null,
    posZmm:   bolt_pos_z_mm ?? null,
  };

  const panelStyle: React.CSSProperties = {
    padding: "0.6rem",
    borderRadius: 8,
    border: "1px solid var(--line)",
    background: "var(--surface)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={panelStyle}><FrontView g={g} /></div>
      <div style={panelStyle}><BackView  g={g} /></div>
      <div style={panelStyle}><SideView  g={g} /></div>
      <div style={panelStyle}><TopBottomView g={g} /></div>
    </div>
  );
}
 
