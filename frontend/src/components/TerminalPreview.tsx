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
  width?: number;   // artık kullanılmıyor — SVG "100%" genişlik alır
  height?: number;  // artık kullanılmıyor
}

// ─── Geometri (mm, ölçeksiz) ─────────────────────────────────────────────────
interface Geom {
  type: string;    // terminal_type
  surf: string;    // surface
  wMm: number;     // width  (X)
  hMm: number;     // height (Y)
  dMm: number;     // depth  (Z)
  boltN: number;
  boltSpMm: number;
  isSlot: boolean;
  sWmm: number;    // slot width  mm
  sLmm: number;    // slot length mm
  holeDmm: number; // yuvarlak delik çapı mm
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

// ─── SVG Düzen sabitleri ──────────────────────────────────────────────────────
const SW   = 520;
const HDR  = 26;  // başlık yüksekliği
const ML   = 58;  // sol kenar (Y dim okları)
const MR   = 16;  // sağ kenar
const MT   = 12;  // başlık sonrası üst boşluk
const MB   = 36;  // alt kenar (X dim okları)
const AVLW = SW - ML - MR;  // yatay içerik alanı

// ─── Başlık bandı (bakır sayfasıyla aynı stil) ────────────────────────────────
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
      <line x1={x1} y1={y} x2={x1} y2={yl - 3} /><line x1={x2} y1={y} x2={x2} y2={yl - 3} />
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
      <line x1={x} y1={y1} x2={xl-3} y2={y1} /><line x1={x} y1={y2} x2={xl-3} y2={y2} />
      <line x1={xl} y1={y1} x2={xl} y2={y2} />
      <polygon points={`${xl-2},${y1+5} ${xl},${y1} ${xl+2},${y1+5}`} fill={color} stroke="none" />
      <polygon points={`${xl-2},${y2-5} ${xl},${y2} ${xl+2},${y2-5}`} fill={color} stroke="none" />
      <rect x={xl-42} y={cy-6} width={42} height={12} fill={BG} stroke="none" />
      <text x={xl-4} y={cy+4} textAnchor="end" fontSize={9} fill={color} stroke="none" fontFamily="monospace">{label}</text>
    </g>
  );
}

// ─── Delik sembolleri ─────────────────────────────────────────────────────────
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

// Delik satırı (yatay)
function HoleRow({ cx0, cy, n, spx, g }: { cx0: number; cy: number; n: number; spx: number; g: Geom }) {
  return <>
    {Array.from({ length: n }, (_, i) =>
      g.isSlot
        ? <SH key={i} cx={cx0 + i*spx} cy={cy} sw={g.sWmm} sl={g.sLmm} h={true} />
        : <RH key={i} cx={cx0 + i*spx} cy={cy} r={g.holeDmm/2} />
    )}
  </>;
}

// Delik sütunu (dikey)
function HoleCol({ cx, cy0, n, spx, g }: { cx: number; cy0: number; n: number; spx: number; g: Geom }) {
  return <>
    {Array.from({ length: n }, (_, i) =>
      g.isSlot
        ? <SH key={i} cx={cx} cy={cy0 + i*spx} sw={g.sWmm} sl={g.sLmm} h={false} />
        : <RH key={i} cx={cx} cy={cy0 + i*spx} r={g.holeDmm/2} />
    )}
  </>;
}

// ─── Bakır şerit doku çizgileri ────────────────────────────────────────────────
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

// ─── Yatay Fin dizisi ─────────────────────────────────────────────────────────
function HorizFins({ bx, by, bw, bh, count }:
  { bx: number; by: number; bw: number; bh: number; count: number }) {
  const pad = bh * 0.06; const zone = bh - pad * 2;
  const sp = zone / count; const fh = sp * 0.55;
  return <>
    {Array.from({ length: count }, (_, i) => {
      const fy = by + pad + i * sp + (sp - fh) / 2;
      return <rect key={i} x={bx+4} y={fy} width={bw-8} height={fh}
        fill={CUFILL} stroke={CU} strokeWidth={.9} rx={1} />;
    })}
  </>;
}

// ─── Dikey Fin dizisi ─────────────────────────────────────────────────────────
function VertFins({ bx, by, bw, bh, count }:
  { bx: number; by: number; bw: number; bh: number; count: number }) {
  const pad = bw * 0.06; const zone = bw - pad * 2;
  const sp = zone / count; const fw = sp * 0.55;
  return <>
    {Array.from({ length: count }, (_, i) => {
      const fx = bx + pad + i * sp + (sp - fw) / 2;
      return <rect key={i} x={fx} y={by+4} width={fw} height={bh-8}
        fill={CUFILL} stroke={CU} strokeWidth={.9} rx={1} />;
    })}
  </>;
}

// ─── Yüzey rozeti ─────────────────────────────────────────────────────────────
const SURF_LBL: Record<string,string> = {
  front:"ÖN YÜZ",back:"ARKA YÜZ",left:"SOL YÜZ",right:"SAĞ YÜZ",top:"ÜST YÜZ",bottom:"ALT YÜZ"
};
function SurfBadge({ surf }: { surf: string }) {
  return (
    <g>
      <rect x={SW-76} y={4} width={70} height={14} rx={3}
        fill="rgba(34,211,238,0.15)" stroke={SURF} strokeWidth={.7} />
      <text x={SW-41} y={14} textAnchor="middle" fontSize={7}
        fill={SURF} fontFamily="system-ui" fontWeight={700} letterSpacing={.5}>
        {SURF_LBL[surf] ?? surf.toUpperCase()}
      </text>
    </g>
  );
}

// Etiket (içeride küçük metin)
function Lbl({ x, y, t, c = MUT }: { x: number; y: number; t: string; c?: string }) {
  return <text x={x} y={y} textAnchor="middle" fontSize={6.5} fill={c} fontFamily="system-ui" fontWeight={600}>{t}</text>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. ÖN GÖRÜNÜŞ — genişlik (X) × yükseklik (Y)
// ═══════════════════════════════════════════════════════════════════════════════
function FrontView({ g }: { g: Geom }) {
  const avlH = 120;
  const sc  = Math.min(AVLW / Math.max(g.wMm, 1), avlH / Math.max(g.hMm, 1), 3.5);
  const bw  = g.wMm * sc; const bh = g.hMm * sc;
  const bx  = ML + (AVLW - bw) / 2;
  const by  = HDR + MT;
  const SVH = HDR + MT + avlH + MB;

  // Vida için ölçekli parametreler
  const hR   = Math.min(g.holeDmm / 2 * sc, bw * .16, bh * .12);
  const sW   = Math.max(g.sWmm * sc, hR * 1.5);
  const sL   = Math.max(g.sLmm * sc, sW * 1.6);
  const spx  = Math.min(g.boltSpMm * sc, (bw - sL) / Math.max(g.boltN - 1, 1));
  const cx0  = bx + bw / 2 - (g.boltN - 1) * spx / 2;

  // Özellikler — terminal tipine ve yüzeye göre
  const showFrontBolts = g.surf === "front" || g.type === "Ön Bakır Basmalı" || g.type === "Kablo Pabuçlu";

  const isOB = g.type === "Ön Bakır Basmalı";
  const isKP = g.type === "Kablo Pabuçlu";

  // "Ön Bakır Basmalı" zona yükseklikleri
  const boltZH = bh * .28;
  const cuZY   = by + bh * .36;
  const cuZH   = bh * .18;
  const devZY  = by + bh * .68;
  const devZH  = bh * .28;

  // "Kablo Pabuçlu" parametreleri
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
      <SurfBadge surf={g.surf} />

      {isKP ? (
        // Kablo Pabuçlu — oval başlık + kablo kovanı
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

          {isOB && (
            <>
              {/* Bölme çizgileri */}
              <line x1={bx+5} y1={by+boltZH} x2={bx+bw-5} y2={by+boltZH} stroke={BODY} strokeWidth={.7} strokeDasharray="3,2" />
              <line x1={bx+5} y1={devZY} x2={bx+bw-5} y2={devZY} stroke={BODY} strokeWidth={.7} strokeDasharray="3,2" />
              {/* Bakır basma bölgesi */}
              <CuStrip x={bx+bw*.06} y={cuZY} w={bw*.88} h={cuZH} />
              {/* Cihaz montaj bölgesi */}
              <rect x={bx+bw*.08} y={devZY} width={bw*.84} height={devZH}
                fill="rgba(148,163,184,0.08)" stroke={BODY} strokeWidth={.7} strokeDasharray="3,2" rx={2} />
              <Lbl x={bx+bw/2} y={cuZY+cuZH/2+3} t="BAKIR BASMA" c={CU} />
              <Lbl x={bx+bw/2} y={devZY+devZH/2+3} t="CİHAZ" c={MUT} />
            </>
          )}

          {/* Vida delikleri — ön yüzeyde */}
          {showFrontBolts && (
            <>
              <HoleRow cx0={cx0} cy={isOB ? by + boltZH*.55 : by + bh*.25}
                n={g.boltN} spx={spx} g={g} />
              {g.boltN >= 2 && (
                <DimH x1={cx0} x2={cx0+(g.boltN-1)*spx}
                  y={isOB ? by+boltZH*.55+(g.isSlot?sL/2+5:hR+4) : by+bh*.25+(g.isSlot?sL/2+5:hR+4)}
                  label={`${g.boltSpMm} mm`} color={RED} off={10} />
              )}
            </>
          )}
        </>
      )}

      {/* Boyut okları */}
      <DimH x1={bx} x2={bx+bw} y={by+bh} label={`${g.wMm} mm`} color={DIM} />
      <DimV x={bx} y1={by} y2={by+bh} label={`${g.hMm} mm`} color="#9b59b6" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. ARKA GÖRÜNÜŞ — genişlik (X) × yükseklik (Y)  [arka yüzden bakış]
// ═══════════════════════════════════════════════════════════════════════════════
function BackView({ g }: { g: Geom }) {
  const isAYT = g.type === "Arka Yatay Taraklı";
  const isAYTm= g.type === "Arka Yatay Terminal";
  const avlH  = (isAYT || isAYTm) ? 145 : 110;
  const sc    = Math.min(AVLW / Math.max(g.wMm, 1), avlH / Math.max(g.hMm, 1), 3.5);
  const bw    = g.wMm * sc; const bh = g.hMm * sc;
  const bx    = ML + (AVLW - bw) / 2;
  const by    = HDR + MT;
  const SVH   = HDR + MT + avlH + MB;

  const hR  = Math.min(g.holeDmm / 2 * sc, bw * .13, bh * .1);
  const sW  = Math.max(g.sWmm * sc, hR * 1.4);
  const sL  = Math.max(g.sLmm * sc, sW * 1.5);
  const spx = Math.min(g.boltSpMm * sc, (bh - sL) / Math.max(g.boltN - 1, 1));

  const showBackBolts = g.surf === "back" && !isAYT && !isAYTm;

  // Arka Yatay Taraklı — fin sayısı ve delik X
  const finCount = isAYT ? Math.max(g.boltN * 2, 6) : Math.max(g.boltN, 3);
  const holeX    = bx + bw * .82;
  const cy0      = by + bh / 2 - (g.boltN - 1) * spx / 2;
  const cx0back  = bx + bw / 2 - (g.boltN - 1) * spx / 2;

  return (
    <svg viewBox={`0 0 ${SW} ${Math.ceil(SVH)}`}
      style={{ width:"100%", border:"1px solid var(--line)", borderRadius:6, background:BG, display:"block" }}>
      <Hdr label="ARKA GÖRÜNÜŞ — GENİŞLİK × YÜKSEKLİK" accent="#e74c3c" id="hdr-tn-back" />
      <SurfBadge surf={g.surf} />

      {/* Gövde */}
      <rect x={bx} y={by} width={bw} height={bh} fill={BFILL} stroke={BODY} strokeWidth={1.6} rx={2} />

      {isAYT && (
        <>
          {/* Sağ bölge ayracı */}
          <line x1={bx+bw*.62} y1={by+8} x2={bx+bw*.62} y2={by+bh-8}
            stroke={BODY} strokeWidth={.7} strokeDasharray="3,2" />
          {/* Yatay finler */}
          <HorizFins bx={bx+4} by={by} bw={bw*.58} bh={bh} count={finCount} />
          {/* Bağlantı delikleri — sağ */}
          <HoleCol cx={holeX} cy0={cy0} n={g.boltN} spx={spx} g={g} />
          {g.boltN >= 2 && (
            <DimH x1={holeX-(g.isSlot?sL/2:hR)} x2={holeX+(g.isSlot?sL/2:hR)}
              y={cy0+(g.boltN-1)*spx+(g.isSlot?sW/2+5:hR+4)}
              label={`${g.boltSpMm} mm`} color={RED} off={8} />
          )}
        </>
      )}

      {isAYTm && (
        <>
          {/* Düz yatay şeritler + slot/delik */}
          {Array.from({ length: g.boltN }, (_, i) => {
            const cy = by + bh/(g.boltN+1) * (i+1);
            const sh = bh * .14;
            return (
              <g key={i}>
                <CuStrip x={bx+bw*.04} y={cy-sh/2} w={bw*.92} h={sh} lines={2} />
                {g.isSlot
                  ? <SH cx={bx+bw/2} cy={cy} sw={sW} sl={sL} h />
                  : <RH cx={bx+bw/2} cy={cy} r={hR} />}
              </g>
            );
          })}
          {g.boltN >= 2 && (() => {
            const y1 = by + bh/(g.boltN+1);
            const y2 = by + bh/(g.boltN+1) * 2;
            return <DimV x={bx} y1={y1} y2={y2} label={`${g.boltSpMm} mm`} color={RED} off={12} />;
          })()}
        </>
      )}

      {showBackBolts && (
        <HoleRow cx0={bx+bw/2-(g.boltN-1)*spx/2} cy={by+bh*.3}
          n={g.boltN} spx={spx} g={g} />
      )}

      <DimH x1={bx} x2={bx+bw} y={by+bh} label={`${g.wMm} mm`} color={DIM} />
      <DimV x={bx} y1={by} y2={by+bh} label={`${g.hMm} mm`} color="#9b59b6" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. YAN GÖRÜNÜŞ — derinlik (Z) × yükseklik (Y)
// ═══════════════════════════════════════════════════════════════════════════════
function SideView({ g }: { g: Geom }) {
  const isYT = g.type === "Yandan Taraklı";
  const isAT = g.type === "Arka Yatay Taraklı" || g.type === "Arka Yatay Terminal";
  const avlH = 110;
  const sc   = Math.min(AVLW / Math.max(g.dMm, 1), avlH / Math.max(g.hMm, 1), 3.5);
  const bw   = g.dMm * sc;   // derinlik yatayda
  const bh   = g.hMm * sc;
  const bx   = ML + (AVLW - bw) / 2;
  const by   = HDR + MT;
  const SVH  = HDR + MT + avlH + MB;

  const hR  = Math.min(g.holeDmm / 2 * sc, bw * .18, bh * .12);
  const sW  = Math.max(g.sWmm * sc, hR * 1.4);
  const sL  = Math.max(g.sLmm * sc, sW * 1.5);
  const spx = Math.min(g.boltSpMm * sc, (bh - sL) / Math.max(g.boltN - 1, 1));
  const showSideBolts = g.surf === "left" || g.surf === "right";

  // Yandan Taraklı — finler soldan çıkar (ön yüzeye doğru)
  const finCount = Math.max(g.boltN * 2, 5);
  const finW     = bw * .45;  // finlerin Z yönündeki uzunluğu

  return (
    <svg viewBox={`0 0 ${SW} ${Math.ceil(SVH)}`}
      style={{ width:"100%", border:"1px solid var(--line)", borderRadius:6, background:BG, display:"block" }}>
      <Hdr label="YAN GÖRÜNÜŞ — DERİNLİK × YÜKSEKLİK" accent="#27ae60" id="hdr-tn-side" />
      <SurfBadge surf={g.surf} />

      {/* Gövde */}
      <rect x={bx} y={by} width={bw} height={bh} fill={BFILL} stroke={BODY} strokeWidth={1.6} rx={2} />

      {isYT && (
        // Yandan Taraklı — dikey finler soldan uzanır (görünürde soldan çıkan yatay şeritler)
        <VertFins bx={bx} by={by+4} bw={bw*.55} bh={bh-8} count={finCount} />
      )}

      {isAT && (
        // Arka tip — derinlik profilinde fin çizgileri arka yüzde görünür
        <>
          <line x1={bx+bw*.65} y1={by+5} x2={bx+bw*.65} y2={by+bh-5}
            stroke={BODY} strokeWidth={.7} strokeDasharray="3,2" />
          {/* Fin kesit çizgileri */}
          {Array.from({ length: Math.min(finCount, 8) }, (_, i) => {
            const fy = by + bh/(Math.min(finCount,8)+1) * (i+1);
            return <line key={i} x1={bx+4} y1={fy} x2={bx+bw*.63} y2={fy}
              stroke={CU} strokeWidth={.8} opacity={.6} />;
          })}
        </>
      )}

      {showSideBolts && (
        <HoleCol cx={bx+bw/2} cy0={by+bh/2-(g.boltN-1)*spx/2}
          n={g.boltN} spx={spx} g={g} />
      )}

      <DimH x1={bx} x2={bx+bw} y={by+bh} label={`${g.dMm} mm`} color={"#27ae60"} />
      <DimV x={bx} y1={by} y2={by+bh} label={`${g.hMm} mm`} color="#9b59b6" />

      {/* Ön/Arka yüzey etiketleri */}
      <text x={bx+4} y={by-5} fontSize={7} fill="#3498db" fontFamily="system-ui" fontWeight={600}>ÖN</text>
      <text x={bx+bw-4} y={by-5} fontSize={7} fill="#e74c3c" fontFamily="system-ui" fontWeight={600} textAnchor="end">ARKA</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ÜST GÖRÜNÜŞ — genişlik (X) × derinlik (Z)
// ═══════════════════════════════════════════════════════════════════════════════
function TopView({ g }: { g: Geom }) {
  const avlH = Math.min(Math.max(g.dMm / g.wMm * 140, 60), 130);
  const sc   = Math.min(AVLW / Math.max(g.wMm, 1), avlH / Math.max(g.dMm, 1), 3.5);
  const bw   = g.wMm * sc;  // genişlik yatayda
  const bh   = g.dMm * sc;  // derinlik dikeyde
  const bx   = ML + (AVLW - bw) / 2;
  const by   = HDR + MT;
  const SVH  = HDR + MT + avlH + MB;

  const hR  = Math.min(g.holeDmm / 2 * sc, bw * .16, bh * .22);
  const sW  = Math.max(g.sWmm * sc, hR * 1.4);
  const sL  = Math.max(g.sLmm * sc, sW * 1.5);
  const spx = Math.min(g.boltSpMm * sc, (bw - sL) / Math.max(g.boltN - 1, 1));
  const cx0  = bx + bw / 2 - (g.boltN - 1) * spx / 2;

  const showTopBolts = g.surf === "top" || g.surf === "bottom";
  const isOB = g.type === "Ön Bakır Basmalı";
  const isAT = g.type === "Arka Yatay Taraklı" || g.type === "Arka Yatay Terminal";
  const isYT = g.type === "Yandan Taraklı";

  return (
    <svg viewBox={`0 0 ${SW} ${Math.ceil(SVH)}`}
      style={{ width:"100%", border:"1px solid var(--line)", borderRadius:6, background:BG, display:"block" }}>
      <Hdr label="ÜST GÖRÜNÜŞ — GENİŞLİK × DERİNLİK" accent="#f39c12" id="hdr-tn-top" />
      <SurfBadge surf={g.surf} />

      {/* Gövde */}
      <rect x={bx} y={by} width={bw} height={bh} fill={BFILL} stroke={BODY} strokeWidth={1.6} rx={2} />

      {/* Ön yüzey çizgisi */}
      <line x1={bx} y1={by} x2={bx+bw} y2={by} stroke="#3498db" strokeWidth={1.2} />
      {/* Arka yüzey çizgisi */}
      <line x1={bx} y1={by+bh} x2={bx+bw} y2={by+bh} stroke="#e74c3c" strokeWidth={1.2} />

      {isAT && bh > 20 && (
        // Üstten bakışta fin çizgileri (yatay şeritler)
        <HorizFins bx={bx+3} by={by+3} bw={bw-6} bh={bh*.7} count={Math.min(g.boltN*2, 6)} />
      )}

      {isOB && bh > 16 && (
        // Üstten bakışta bakır basma alanı görünür — ortada çizgi
        <CuStrip x={bx+bw*.08} y={by+bh*.35} w={bw*.84} h={Math.min(bh*.28, 16)} lines={2} />
      )}

      {isYT && bh > 16 && (
        // Yandan taraklı — üstten bakışta fin kesitleri dikey
        <VertFins bx={bx+3} by={by+3} bw={bw*.5} bh={bh-6} count={Math.min(g.boltN*2, 6)} />
      )}

      {showTopBolts && (
        <HoleRow cx0={cx0} cy={by + bh * .35} n={g.boltN} spx={spx} g={g} />
      )}

      <DimH x1={bx} x2={bx+bw} y={by+bh} label={`${g.wMm} mm`} color={DIM} />
      <DimV x={bx} y1={by} y2={by+bh} label={`${g.dMm} mm`} color="#f39c12" />

      <text x={bx+4} y={by-4} fontSize={7} fill="#3498db" fontFamily="system-ui" fontWeight={600}>ÖN ↑</text>
      <text x={bx+4} y={by+bh+11} fontSize={7} fill="#e74c3c" fontFamily="system-ui" fontWeight={600}>ARKA ↓</text>
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
}: TerminalPreviewProps) {
  const isSlot = !!(slot_width_mm || slot_length_mm);
  const g: Geom = {
    type:      terminal_type,
    surf:      surface,
    wMm:       Math.max(terminal_width_mm  ?? 100, 5),
    hMm:       Math.max(terminal_height_mm ?? 120, 5),
    dMm:       Math.max(terminal_depth_mm  ?? 60,  5),
    boltN:     Math.max(bolt_count         ?? 2,   1),
    boltSpMm:  bolt_center_distance_mm     ?? 70,
    isSlot,
    sWmm:      Math.max(slot_width_mm      ?? 12,  4),
    sLmm:      Math.max(slot_length_mm     ?? 30,  8),
    holeDmm:   Math.max(hole_diameter_mm   ?? 13,  4),
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
      <div style={panelStyle}><TopView   g={g} /></div>
    </div>
  );
}
