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
  width?: number;
  height?: number;
}

// ─── ViewBox sabitleri ─────────────────────────────────────────────────────────
const VB_W = 300;
const VB_H = 340;
const PAD  = 36;   // kenar boşluğu (ölçü okları için)

// ─── Renkler ──────────────────────────────────────────────────────────────────
const C = {
  body:    "#2d3748",
  bodyFill:"rgba(100,116,139,0.10)",
  bolt:    "#94a3b8",
  boltFill:"#1e2a3a",
  copper:  "#b45309",
  copperFill:"rgba(251,191,36,0.30)",
  slot:    "#3b82f6",
  slotFill:"rgba(59,130,246,0.15)",
  dim:     "#64748b",
  surface: "#22d3ee",
  label:   "#94a3b8",
  grid:    "rgba(148,163,184,0.07)",
};

// ─── Yuvarlak Delik ────────────────────────────────────────────────────────────
function RoundHole({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={C.boltFill} stroke={C.bolt} strokeWidth={1.2} />
      <line x1={cx - r * 0.6} y1={cy} x2={cx + r * 0.6} y2={cy} stroke={C.bolt} strokeWidth={0.5} opacity={0.5} />
      <line x1={cx} y1={cy - r * 0.6} x2={cx} y2={cy + r * 0.6} stroke={C.bolt} strokeWidth={0.5} opacity={0.5} />
    </g>
  );
}

// ─── Slot Delik ────────────────────────────────────────────────────────────────
function SlotHole({
  cx, cy, sw, sl, horizontal = true,
}: { cx: number; cy: number; sw: number; sl: number; horizontal?: boolean }) {
  const hw = sw / 2;
  const hl = sl / 2;
  const rx = sw / 2;
  if (horizontal) {
    return (
      <g>
        <rect x={cx - hl} y={cy - hw} width={sl} height={sw}
          fill={C.slotFill} stroke={C.slot} strokeWidth={1.1} rx={rx} />
        <line x1={cx - hl + hw} y1={cy} x2={cx + hl - hw} y2={cy}
          stroke={C.slot} strokeWidth={0.5} opacity={0.4} />
      </g>
    );
  }
  return (
    <g>
      <rect x={cx - hw} y={cy - hl} width={sw} height={sl}
        fill={C.slotFill} stroke={C.slot} strokeWidth={1.1} rx={rx} />
      <line x1={cx} y1={cy - hl + hw} x2={cx} y2={cy + hl - hw}
        stroke={C.slot} strokeWidth={0.5} opacity={0.4} />
    </g>
  );
}

// ─── Boyut oku — yatay ────────────────────────────────────────────────────────
function DimH({
  x1, x2, y, label, color = C.dim, offset = 14,
}: { x1: number; x2: number; y: number; label: string; color?: string; offset?: number }) {
  const cx = (x1 + x2) / 2;
  const yline = y - offset;
  return (
    <g stroke={color} strokeWidth={0.7} fill="none">
      <line x1={x1} y1={y} x2={x1} y2={yline - 3} />
      <line x1={x2} y1={y} x2={x2} y2={yline - 3} />
      <line x1={x1} y1={yline} x2={x2} y2={yline} />
      <polygon points={`${x1 + 5},${yline - 2} ${x1},${yline} ${x1 + 5},${yline + 2}`} fill={color} stroke="none" />
      <polygon points={`${x2 - 5},${yline - 2} ${x2},${yline} ${x2 - 5},${yline + 2}`} fill={color} stroke="none" />
      <rect x={cx - 18} y={yline - 11} width={36} height={10} fill="#111827" stroke="none" />
      <text x={cx} y={yline - 3} textAnchor="middle" fontSize={8} fill={color} stroke="none" fontFamily="monospace">{label}</text>
    </g>
  );
}

// ─── Boyut oku — dikey ────────────────────────────────────────────────────────
function DimV({
  x, y1, y2, label, color = C.dim, offset = 14,
}: { x: number; y1: number; y2: number; label: string; color?: string; offset?: number }) {
  const cy = (y1 + y2) / 2;
  const xline = x + offset;
  return (
    <g stroke={color} strokeWidth={0.7} fill="none">
      <line x1={x} y1={y1} x2={xline + 3} y2={y1} />
      <line x1={x} y1={y2} x2={xline + 3} y2={y2} />
      <line x1={xline} y1={y1} x2={xline} y2={y2} />
      <polygon points={`${xline - 2},${y1 + 5} ${xline},${y1} ${xline + 2},${y1 + 5}`} fill={color} stroke="none" />
      <polygon points={`${xline - 2},${y2 - 5} ${xline},${y2} ${xline + 2},${y2 - 5}`} fill={color} stroke="none" />
      <rect x={xline + 4} y={cy - 6} width={38} height={12} fill="#111827" stroke="none" />
      <text x={xline + 6} y={cy + 4} textAnchor="start" fontSize={8} fill={color} stroke="none"
        fontFamily="monospace">{label}</text>
    </g>
  );
}

// ─── Küçük etiket ─────────────────────────────────────────────────────────────
function Tag({ x, y, text, color = C.label }: { x: number; y: number; text: string; color?: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize={7.5} fill={color}
      fontFamily="monospace" fontWeight={500}>{text}</text>
  );
}

// ─── Yüzey göstergesi (sol üst köşe rozeti) ──────────────────────────────────
const SURFACE_LABELS: Record<string, string> = {
  front: "ÖN YÜZ", back: "ARKA YÜZ", left: "SOL YÜZ",
  right: "SAĞ YÜZ", top: "ÜST YÜZ", bottom: "ALT YÜZ",
};
function SurfaceBadge({ surface }: { surface: string }) {
  return (
    <g>
      <rect x={4} y={4} width={66} height={14} rx={3}
        fill="rgba(34,211,238,0.15)" stroke={C.surface} strokeWidth={0.7} />
      <text x={37} y={14} textAnchor="middle" fontSize={7} fill={C.surface}
        fontFamily="system-ui" fontWeight={700} letterSpacing={0.5}>
        {SURFACE_LABELS[surface] ?? surface.toUpperCase()}
      </text>
    </g>
  );
}

// ─── Görünüş etiketi ──────────────────────────────────────────────────────────
function ViewLabel({ text }: { text: string }) {
  return (
    <text x={VB_W / 2} y={20} textAnchor="middle" fontSize={9}
      fill={C.label} fontFamily="system-ui" fontWeight={600} letterSpacing={0.4}>
      {text}
    </text>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TERMİNAL TİPLERİ
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. Ön Bakır Basmalı ──────────────────────────────────────────────────────
// Ön görünüş: terminal gövdesi, üst yüzeyde vida delikleri, ortada bakır basma bölgesi
function FrontCopperPress({ bx, by, bw, bh, holeR, boltCount, boltSpacing, isSlot, sw, sl }: {
  bx: number; by: number; bw: number; bh: number;
  holeR: number; boltCount: number; boltSpacing: number;
  isSlot: boolean; sw: number; sl: number;
}) {
  // Vida bölgesi — üst 30%
  const boltZoneH = bh * 0.30;
  const boltCY = by + boltZoneH * 0.55;

  // Toplam vida genişliği
  const totalSpan = (boltCount - 1) * boltSpacing;
  const boltStartX = bx + bw / 2 - totalSpan / 2;
  const bolts = Array.from({ length: boltCount }, (_, i) => boltStartX + i * boltSpacing);

  // Bakır basma bölgesi — orta 25%
  const barY  = by + bh * 0.38;
  const barH  = bh * 0.18;
  const barPad = bw * 0.06;

  // Alt bağlantı bölgesi — alt 30%
  const connY = by + bh * 0.70;
  const connH = bh * 0.26;

  return (
    <g>
      {/* Terminal ana gövdesi */}
      <rect x={bx} y={by} width={bw} height={bh}
        fill={C.bodyFill} stroke={C.body} strokeWidth={1.6} rx={2} />

      {/* Vida bölgesi ayraç çizgisi */}
      <line x1={bx + 6} y1={by + boltZoneH} x2={bx + bw - 6} y2={by + boltZoneH}
        stroke={C.body} strokeWidth={0.7} strokeDasharray="3,2" />

      {/* Vida delikleri */}
      {bolts.map((cx, i) =>
        isSlot
          ? <SlotHole key={i} cx={cx} cy={boltCY} sw={sw} sl={sl} horizontal={true} />
          : <RoundHole key={i} cx={cx} cy={boltCY} r={holeR} />
      )}

      {/* Vida merkez aralığı oku */}
      {boltCount >= 2 && (
        <DimH x1={bolts[0]} x2={bolts[boltCount - 1]}
          y={boltCY + (isSlot ? sl / 2 + 6 : holeR + 6)}
          label={`${Math.round(boltSpacing)} mm`} color="#e74c3c" offset={10} />
      )}

      {/* Bakır basma bölgesi */}
      <rect x={bx + barPad} y={barY} width={bw - barPad * 2} height={barH}
        fill={C.copperFill} stroke={C.copper} strokeWidth={1} rx={1.5} />
      {/* Bakır yüzey çizgileri */}
      {[0.25, 0.5, 0.75].map((t, i) => (
        <line key={i}
          x1={bx + barPad + 4} y1={barY + barH * t}
          x2={bx + bw - barPad - 4} y2={barY + barH * t}
          stroke={C.copper} strokeWidth={0.6} opacity={0.5} />
      ))}

      {/* Alt bağlantı (cihaz gövdesi temsili) */}
      <rect x={bx + bw * 0.08} y={connY} width={bw * 0.84} height={connH}
        fill="rgba(148,163,184,0.08)" stroke={C.body} strokeWidth={0.8}
        strokeDasharray="4,2" rx={2} />

      {/* Etiketler */}
      <Tag x={bx + bw / 2} y={barY + barH / 2 + 3} text="BAKIR BASMA" color={C.copper} />
      <Tag x={bx + bw / 2} y={connY + connH / 2 + 3} text="CİHAZ" color={C.label} />
    </g>
  );
}

// ─── 2. Arka Yatay Taraklı ────────────────────────────────────────────────────
// Arka görünüş: yatay tarak dişleri (dikdörtgen finler) dikey sıralı, sağda bağlantı delikleri
function HorizontalComb({ bx, by, bw, bh, holeR, boltCount, boltSpacing, isSlot, sw, sl }: {
  bx: number; by: number; bw: number; bh: number;
  holeR: number; boltCount: number; boltSpacing: number;
  isSlot: boolean; sw: number; sl: number;
}) {
  // Fin (tarak dişi) parametreleri
  const finCount  = Math.max(boltCount * 2, 6);
  const finPad    = bh * 0.06;
  const finAreaH  = bh - finPad * 2;
  const finSpacing = finAreaH / finCount;
  const finH      = finSpacing * 0.55;
  const finW      = bw * 0.62;   // sol taraftan uzayan fin uzunluğu

  // Bağlantı delikleri — sağ bölge
  const holeX     = bx + bw * 0.78;
  const totalSpan = (boltCount - 1) * boltSpacing;
  const holeStartY = by + bh / 2 - totalSpan / 2;

  return (
    <g>
      {/* Terminal gövdesi */}
      <rect x={bx} y={by} width={bw} height={bh}
        fill={C.bodyFill} stroke={C.body} strokeWidth={1.6} rx={2} />

      {/* Sağ bölge ayracı */}
      <line x1={bx + bw * 0.62} y1={by + 8} x2={bx + bw * 0.62} y2={by + bh - 8}
        stroke={C.body} strokeWidth={0.7} strokeDasharray="3,2" />

      {/* Fin'ler (yatay bakır şeritler) */}
      {Array.from({ length: finCount }, (_, i) => {
        const fy = by + finPad + i * finSpacing + (finSpacing - finH) / 2;
        return (
          <g key={i}>
            <rect x={bx + 6} y={fy} width={finW - 6} height={finH}
              fill={C.copperFill} stroke={C.copper} strokeWidth={0.9} rx={1} />
          </g>
        );
      })}

      {/* Bağlantı delikleri — sağda */}
      {Array.from({ length: boltCount }, (_, i) => {
        const cy = holeStartY + i * boltSpacing;
        return isSlot
          ? <SlotHole key={i} cx={holeX} cy={cy} sw={sw} sl={sl} horizontal={false} />
          : <RoundHole key={i} cx={holeX} cy={cy} r={holeR} />;
      })}

      {/* Vida merkez aralığı oku (dikey) */}
      {boltCount >= 2 && (
        <DimV x={bx + bw} y1={holeStartY} y2={holeStartY + (boltCount - 1) * boltSpacing}
          label={`${Math.round(boltSpacing)} mm`} color="#e74c3c" offset={10} />
      )}
    </g>
  );
}

// ─── 3. Arka Yatay Terminal (düz şeritler, slotlu) ───────────────────────────
// Arka görünüş: düz yatay şeritler (fin yok, geniş bakır bölgeler) + slotlu/yuvarlak delikler
function HorizontalFlat({ bx, by, bw, bh, holeR, boltCount, boltSpacing, isSlot, sw, sl }: {
  bx: number; by: number; bw: number; bh: number;
  holeR: number; boltCount: number; boltSpacing: number;
  isSlot: boolean; sw: number; sl: number;
}) {
  // Bağlantı grubu sayısı = bolt_count (her grupta 1 delik/slot)
  const groupCount = Math.max(boltCount, 2);
  const totalSpan  = (groupCount - 1) * boltSpacing;
  const startY     = by + bh / 2 - totalSpan / 2;

  // Her grup: geniş yatay bakır şerit + delik
  const stripH  = Math.min(boltSpacing * 0.60, bh / groupCount * 0.55);
  const stripPad = bw * 0.04;

  return (
    <g>
      {/* Terminal gövdesi */}
      <rect x={bx} y={by} width={bw} height={bh}
        fill={C.bodyFill} stroke={C.body} strokeWidth={1.6} rx={2} />

      {Array.from({ length: groupCount }, (_, i) => {
        const cy = startY + i * boltSpacing;
        const sy = cy - stripH / 2;

        return (
          <g key={i}>
            {/* Bakır şerit */}
            <rect x={bx + stripPad} y={sy} width={bw - stripPad * 2} height={stripH}
              fill={C.copperFill} stroke={C.copper} strokeWidth={0.9} rx={1.5} />
            {/* İç çizgiler (bakır yüzey dokusu) */}
            <line x1={bx + stripPad + 4} y1={cy} x2={bx + bw - stripPad - 4} y2={cy}
              stroke={C.copper} strokeWidth={0.5} opacity={0.4} />

            {/* Delik — merkez */}
            {isSlot
              ? <SlotHole cx={bx + bw / 2} cy={cy} sw={sw} sl={sl} horizontal={true} />
              : <RoundHole cx={bx + bw / 2} cy={cy} r={holeR} />
            }
          </g>
        );
      })}

      {/* Vida merkez aralığı oku */}
      {groupCount >= 2 && (
        <DimV x={bx + bw} y1={startY} y2={startY + (groupCount - 1) * boltSpacing}
          label={`${Math.round(boltSpacing)} mm`} color="#e74c3c" offset={10} />
      )}
    </g>
  );
}

// ─── 4. Yandan Taraklı ────────────────────────────────────────────────────────
// Yan görünüş: üstten inen dikey dişler, altta bağlantı delikleri
function SideComb({ bx, by, bw, bh, holeR, boltCount, boltSpacing, isSlot, sw, sl }: {
  bx: number; by: number; bw: number; bh: number;
  holeR: number; boltCount: number; boltSpacing: number;
  isSlot: boolean; sw: number; sl: number;
}) {
  const finCount   = Math.max(boltCount * 2, 5);
  const finPad     = bw * 0.06;
  const finAreaW   = bw - finPad * 2;
  const finSpacing = finAreaW / finCount;
  const finW       = finSpacing * 0.55;
  const finH       = bh * 0.42;

  const totalSpan   = (boltCount - 1) * boltSpacing;
  const boltStartX  = bx + bw / 2 - totalSpan / 2;
  const boltY       = by + bh * 0.75;

  return (
    <g>
      {/* Gövde */}
      <rect x={bx} y={by} width={bw} height={bh}
        fill={C.bodyFill} stroke={C.body} strokeWidth={1.6} rx={2} />

      {/* Üst ayraç */}
      <line x1={bx + 8} y1={by + finH} x2={bx + bw - 8} y2={by + finH}
        stroke={C.body} strokeWidth={0.7} strokeDasharray="3,2" />

      {/* Dikey finler (üstten inen) */}
      {Array.from({ length: finCount }, (_, i) => {
        const fx = bx + finPad + i * finSpacing + (finSpacing - finW) / 2;
        return (
          <rect key={i} x={fx} y={by + 6} width={finW} height={finH - 8}
            fill={C.copperFill} stroke={C.copper} strokeWidth={0.9} rx={1} />
        );
      })}

      {/* Alt bağlantı delikleri */}
      {Array.from({ length: boltCount }, (_, i) => {
        const cx = boltStartX + i * boltSpacing;
        return isSlot
          ? <SlotHole key={i} cx={cx} cy={boltY} sw={sw} sl={sl} horizontal={true} />
          : <RoundHole key={i} cx={cx} cy={boltY} r={holeR} />;
      })}

      {/* Merkez aralığı oku */}
      {boltCount >= 2 && (
        <DimH x1={boltStartX} x2={boltStartX + (boltCount - 1) * boltSpacing}
          y={boltY + (isSlot ? sl / 2 + 6 : holeR + 6)}
          label={`${Math.round(boltSpacing)} mm`} color="#e74c3c" offset={10} />
      )}
    </g>
  );
}

// ─── 5. Kablo Pabuçlu ─────────────────────────────────────────────────────────
function CableLug({ bx, by, bw, bh, holeR, isSlot, sw, sl }: {
  bx: number; by: number; bw: number; bh: number;
  holeR: number; isSlot: boolean; sw: number; sl: number;
}) {
  const headRx = bw * 0.38;
  const headRy = headRx * 0.85;
  const headCX  = bx + bw / 2;
  const headCY  = by + headRy + bh * 0.04;

  const shankW  = bw * 0.36;
  const shankX  = bx + bw / 2 - shankW / 2;
  const shankY  = headCY + headRy * 0.72;
  const shankH  = bh - (shankY - by) - bh * 0.04;

  return (
    <g>
      {/* Pabuç başı (oval) */}
      <ellipse cx={headCX} cy={headCY} rx={headRx} ry={headRy}
        fill={C.copperFill} stroke={C.copper} strokeWidth={1.5} />

      {/* Merkez deliği */}
      {isSlot
        ? <SlotHole cx={headCX} cy={headCY} sw={sw} sl={sl} horizontal={true} />
        : <RoundHole cx={headCX} cy={headCY} r={holeR} />
      }

      {/* Kablo kovanı */}
      <rect x={shankX} y={shankY} width={shankW} height={shankH}
        fill="rgba(100,116,139,0.12)" stroke={C.body} strokeWidth={1.4}
        rx={shankW * 0.15} />

      {/* Sıkıştırma çizgileri */}
      {[0.2, 0.45, 0.7].map((t, i) => (
        <line key={i}
          x1={shankX + 3} y1={shankY + shankH * t}
          x2={shankX + shankW - 3} y2={shankY + shankH * t}
          stroke={C.body} strokeWidth={0.8} />
      ))}

      {/* Kablo giriş oku */}
      <line x1={headCX} y1={shankY + shankH + 12}
        x2={headCX} y2={shankY + shankH + 2}
        stroke={C.copper} strokeWidth={1.2} strokeDasharray="3,2" />
      <polygon
        points={`${headCX - 3},${shankY + shankH + 4} ${headCX},${shankY + shankH} ${headCX + 3},${shankY + shankH + 4}`}
        fill={C.copper} />
      <Tag x={headCX} y={shankY + shankH + 22} text="KABLO" color={C.copper} />
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANA BİLEŞEN
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
  width = 300,
  height = 340,
}: TerminalPreviewProps) {
  const rawW   = Math.max(terminal_width_mm ?? 100, 10);
  const rawH   = Math.max(terminal_height_mm ?? 120, 10);

  const availW = VB_W - PAD * 2 - 50;  // sağda DimV için yer
  const availH = VB_H - PAD * 2 - 40;  // altta DimH + etiketler için yer
  const scale  = Math.min(availW / rawW, availH / rawH, 3.0);

  const bw = rawW * scale;
  const bh = rawH * scale;
  const bx = (VB_W - bw) / 2 - 12;
  const by = PAD + 16;

  // Delik parametreleri
  const isSlot   = !!(slot_width_mm || slot_length_mm);
  const rawHoleR = (hole_diameter_mm ?? 13) / 2;
  const holeR    = Math.min(rawHoleR * scale, bw * 0.18, bh * 0.12);
  const rawSpacing = bolt_center_distance_mm ?? 70;
  const boltSpacing = rawSpacing * scale;
  const boltCount   = Math.max(bolt_count ?? 2, 1);

  // Slot boyutları (ölçekli)
  const sw = Math.max((slot_width_mm ?? 12) * scale, holeR * 1.5);
  const sl = Math.max((slot_length_mm ?? 30) * scale, sw * 1.5);

  // Ölçü etiketleri
  const wLabel = terminal_width_mm ? `${terminal_width_mm} mm` : "G=?";
  const hLabel = terminal_height_mm ? `${terminal_height_mm} mm` : "Y=?";
  const dLabel = terminal_depth_mm ? `D: ${terminal_depth_mm} mm` : "";
  const holeLabel = isSlot
    ? (slot_width_mm && slot_length_mm ? `Slot ${slot_width_mm}×${slot_length_mm} mm` : "Slot")
    : (hole_diameter_mm ? `Ø${hole_diameter_mm} mm` : "");

  // Görünüş başlığı
  const VIEW_LABELS: Record<string, string> = {
    "Ön Bakır Basmalı":    "ÖN GÖRÜNÜŞ",
    "Arka Yatay Taraklı":  "ARKA GÖRÜNÜŞ",
    "Arka Yatay Terminal": "ARKA GÖRÜNÜŞ",
    "Yandan Taraklı":      "YAN GÖRÜNÜŞ",
    "Kablo Pabuçlu":       "ÖN GÖRÜNÜŞ",
  };
  const viewLabel = VIEW_LABELS[terminal_type] ?? "GÖRÜNÜŞ";

  function renderShape() {
    const props = { bx, by, bw, bh, holeR, boltCount, boltSpacing, isSlot, sw, sl };
    switch (terminal_type) {
      case "Ön Bakır Basmalı":
        return <FrontCopperPress {...props} />;
      case "Arka Yatay Taraklı":
        return <HorizontalComb {...props} />;
      case "Arka Yatay Terminal":
        return <HorizontalFlat {...props} />;
      case "Yandan Taraklı":
        return <SideComb {...props} />;
      case "Kablo Pabuçlu":
        return <CableLug {...{ bx, by, bw, bh, holeR, isSlot, sw, sl }} />;
      default:
        return (
          <rect x={bx} y={by} width={bw} height={bh}
            fill={C.bodyFill} stroke={C.body} strokeWidth={1.5} rx={2} />
        );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width={width}
      height={height}
      style={{ display: "block", maxWidth: "100%" }}
    >
      {/* Arka plan ızgarası */}
      <defs>
        <pattern id="tgrid" width={10} height={10} patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke={C.grid} strokeWidth={0.5} />
        </pattern>
      </defs>
      <rect width={VB_W} height={VB_H} fill="url(#tgrid)" />

      {/* Görünüş başlığı */}
      <ViewLabel text={viewLabel} />

      {/* Yüzey rozeti */}
      <SurfaceBadge surface={surface} />

      {/* Terminal şekli */}
      {renderShape()}

      {/* Boyut okları */}
      <DimH x1={bx} x2={bx + bw} y={by + bh} label={wLabel} offset={18} />
      <DimV x={bx + bw} y1={by} y2={by + bh} label={hLabel} offset={14} />

      {/* Alt bilgi satırı */}
      <text x={VB_W / 2} y={VB_H - 14} textAnchor="middle"
        fontSize={7.5} fill={C.label} fontFamily="monospace">
        {[dLabel, holeLabel].filter(Boolean).join("   |   ")}
      </text>
    </svg>
  );
}
