import React from "react";

export interface TerminalPreviewProps {
  terminal_type: string;
  terminal_width_mm: number | null;
  terminal_height_mm: number | null;
  terminal_depth_mm: number | null;
  bolt_count: number | null;
  bolt_center_distance_mm: number | null;
  hole_diameter_mm: number | null;
  width?: number;
  height?: number;
}

const VB_W = 260;
const VB_H = 300;
const MARGIN = 28;

// ─── Ölçü etiketi (dimension annotation) ──────────────────────────────────────
function DimLabel({
  x1, y1, x2, y2, label, offset = 14, horizontal = false,
}: {
  x1: number; y1: number; x2: number; y2: number;
  label: string; offset?: number; horizontal?: boolean;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g stroke="var(--muted, #94a3b8)" strokeWidth={0.7} fill="none">
      {horizontal ? (
        <>
          <line x1={x1} y1={y1 - offset} x2={x2} y2={y2 - offset} />
          <line x1={x1} y1={y1 - 4} x2={x1} y2={y1 - offset - 4} />
          <line x1={x2} y1={y2 - 4} x2={x2} y2={y2 - offset - 4} />
          {/* arrows */}
          <polygon points={`${x1 + 5},${y1 - offset - 2} ${x1},${y1 - offset} ${x1 + 5},${y1 - offset + 2}`} fill="var(--muted,#94a3b8)" stroke="none" />
          <polygon points={`${x2 - 5},${y2 - offset - 2} ${x2},${y2 - offset} ${x2 - 5},${y2 - offset + 2}`} fill="var(--muted,#94a3b8)" stroke="none" />
          <text x={mx} y={y1 - offset - 5} textAnchor="middle" fontSize={8} fill="var(--muted,#94a3b8)" stroke="none" fontFamily="monospace">
            {label}
          </text>
        </>
      ) : (
        <>
          <line x1={x1 + offset} y1={y1} x2={x2 + offset} y2={y2} />
          <line x1={x1 + 4} y1={y1} x2={x1 + offset + 4} y2={y1} />
          <line x1={x2 + 4} y1={y2} x2={x2 + offset + 4} y2={y2} />
          <polygon points={`${x1 + offset - 2},${y1 + 5} ${x1 + offset},${y1} ${x1 + offset + 2},${y1 + 5}`} fill="var(--muted,#94a3b8)" stroke="none" />
          <polygon points={`${x2 + offset - 2},${y2 - 5} ${x2 + offset},${y2} ${x2 + offset + 2},${y2 - 5}`} fill="var(--muted,#94a3b8)" stroke="none" />
          <text x={x1 + offset + 6} y={my} textAnchor="start" fontSize={8} fill="var(--muted,#94a3b8)" stroke="none" fontFamily="monospace" dominantBaseline="middle">
            {label}
          </text>
        </>
      )}
    </g>
  );
}

// ─── Delik sembolü ─────────────────────────────────────────────────────────────
function BoltHole({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="white" stroke="#334155" strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={r * 0.35} fill="#334155" />
      {/* cross hatch */}
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#334155" strokeWidth={0.5} opacity={0.4} />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#334155" strokeWidth={0.5} opacity={0.4} />
    </g>
  );
}

// ─── Ön Bakır Basmalı ──────────────────────────────────────────────────────────
function FrontCopperPress({
  bx, by, bw, bh, boltCount, boltSpacing, holeR,
}: {
  bx: number; by: number; bw: number; bh: number;
  boltCount: number; boltSpacing: number; holeR: number;
}) {
  // Vida delikleri üst kısımda
  const boltY = by + bh * 0.28;
  const totalSpan = (boltCount - 1) * boltSpacing;
  const boltStartX = bx + bw / 2 - totalSpan / 2;
  const bolts = Array.from({ length: boltCount }, (_, i) => boltStartX + i * boltSpacing);

  // Bakır basma alanı — ortada yatay çubuk
  const barY = by + bh * 0.62;
  const barH = bh * 0.12;
  const barPad = bw * 0.08;

  // Cihaz gövde simgesi — alt kısım
  const bodyY = by + bh * 0.78;
  const bodyH = bh * 0.18;

  return (
    <g>
      {/* Terminal gövdesi */}
      <rect x={bx} y={by} width={bw} height={bh}
        fill="rgba(148,163,184,0.08)" stroke="#334155" strokeWidth={1.5} rx={3} />

      {/* Vida delikleri */}
      {bolts.map((boltX, i) => (
        <BoltHole key={i} cx={boltX} cy={boltY} r={holeR} />
      ))}

      {/* Vida merkez mesafe oku (eğer 2+ vida) */}
      {boltCount >= 2 && (
        <g stroke="#64748b" strokeWidth={0.6} strokeDasharray="2,2">
          <line x1={bolts[0]} y1={boltY} x2={bolts[boltCount - 1]} y2={boltY} />
        </g>
      )}

      {/* Bakır basma çubuğu (bara temsili) */}
      <rect x={bx + barPad} y={barY} width={bw - barPad * 2} height={barH}
        fill="rgba(251,191,36,0.35)" stroke="#b45309" strokeWidth={1} rx={1} />
      <text x={bx + bw / 2} y={barY + barH / 2 + 1} textAnchor="middle"
        fontSize={6.5} fill="#92400e" fontFamily="monospace" dominantBaseline="middle" fontWeight={600}>
        BAKIR BARA
      </text>

      {/* Gövde/bağlantı alt çizgisi */}
      <rect x={bx + bw * 0.1} y={bodyY} width={bw * 0.8} height={bodyH}
        fill="rgba(148,163,184,0.15)" stroke="#475569" strokeWidth={0.8} strokeDasharray="3,2" rx={2} />
      <text x={bx + bw / 2} y={bodyY + bodyH / 2 + 1} textAnchor="middle"
        fontSize={6} fill="#64748b" fontFamily="monospace" dominantBaseline="middle">
        CİHAZ YÜZEYİ
      </text>

      {/* Tip etiketi */}
      <text x={bx + bw / 2} y={by - 7} textAnchor="middle"
        fontSize={7} fill="#475569" fontFamily="sans-serif" fontWeight={600}>
        Ön Bakır Basmalı
      </text>
    </g>
  );
}

// ─── Yatay Taraklı (Arka) ─────────────────────────────────────────────────────
function HorizontalComb({
  bx, by, bw, bh, boltCount, boltSpacing, holeR, label,
}: {
  bx: number; by: number; bw: number; bh: number;
  boltCount: number; boltSpacing: number; holeR: number; label: string;
}) {
  const teethCount = Math.max(boltCount, 4);
  const teethH = bh * 0.55;
  const teethY = by + bh * 0.1;
  const toothSpacing = bh / (teethCount + 1);
  const toothLen = bw * 0.55;

  // Vida bağlantı delikleri sağ tarafta
  const boltX = bx + bw * 0.72;
  const totalSpan = (boltCount - 1) * boltSpacing;
  const boltStartY = by + bh / 2 - totalSpan / 2;

  return (
    <g>
      {/* Gövde */}
      <rect x={bx} y={by} width={bw} height={bh}
        fill="rgba(148,163,184,0.08)" stroke="#334155" strokeWidth={1.5} rx={3} />

      {/* Tarak dişleri — sol taraftan çıkan yatay çubuklar */}
      {Array.from({ length: teethCount }, (_, i) => {
        const ty = teethY + (i + 1) * (teethH / (teethCount + 1)) + teethH * 0.05;
        return (
          <g key={i}>
            <line x1={bx} y1={ty} x2={bx - toothLen * 0.6} y2={ty}
              stroke="#334155" strokeWidth={2.5} strokeLinecap="round" />
            <rect x={bx - toothLen * 0.6 - 4} y={ty - 3} width={4} height={6}
              fill="#475569" rx={1} />
          </g>
        );
      })}

      {/* Bara giriş oku */}
      <line x1={bx - toothLen * 0.6 - 20} y1={by + bh / 2}
        x2={bx - toothLen * 0.6 - 4} y2={by + bh / 2}
        stroke="#b45309" strokeWidth={1.2} strokeDasharray="3,2" />
      <polygon points={`${bx - toothLen * 0.6 - 6},${by + bh / 2 - 3} ${bx - toothLen * 0.6},${by + bh / 2} ${bx - toothLen * 0.6 - 6},${by + bh / 2 + 3}`}
        fill="#b45309" />
      <text x={bx - toothLen * 0.6 - 22} y={by + bh / 2 - 5}
        textAnchor="middle" fontSize={6} fill="#92400e" fontFamily="monospace">BARA</text>

      {/* Vida delikleri sağda */}
      {Array.from({ length: boltCount }, (_, i) => (
        <BoltHole key={i} cx={boltX} cy={boltStartY + i * boltSpacing} r={holeR} />
      ))}

      <text x={bx + bw / 2} y={by - 7} textAnchor="middle"
        fontSize={7} fill="#475569" fontFamily="sans-serif" fontWeight={600}>
        {label}
      </text>
    </g>
  );
}

// ─── Yandan Taraklı ───────────────────────────────────────────────────────────
function SideComb({
  bx, by, bw, bh, boltCount, boltSpacing, holeR,
}: {
  bx: number; by: number; bw: number; bh: number;
  boltCount: number; boltSpacing: number; holeR: number;
}) {
  const teethCount = Math.max(boltCount, 4);
  const toothLen = bh * 0.35;
  const toothSpacing = bw / (teethCount + 1);

  const boltY = by + bh * 0.3;
  const totalSpan = (boltCount - 1) * boltSpacing;
  const boltStartX = bx + bw / 2 - totalSpan / 2;

  return (
    <g>
      <rect x={bx} y={by} width={bw} height={bh}
        fill="rgba(148,163,184,0.08)" stroke="#334155" strokeWidth={1.5} rx={3} />

      {/* Tarak dişleri — üstten inen dikey çubuklar */}
      {Array.from({ length: teethCount }, (_, i) => {
        const tx = bx + (i + 1) * toothSpacing;
        return (
          <g key={i}>
            <line x1={tx} y1={by} x2={tx} y2={by - toothLen * 0.6}
              stroke="#334155" strokeWidth={2.5} strokeLinecap="round" />
            <rect x={tx - 3} y={by - toothLen * 0.6 - 4} width={6} height={4}
              fill="#475569" rx={1} />
          </g>
        );
      })}

      {/* Bara giriş oku */}
      <line x1={bx + bw / 2} y1={by - toothLen * 0.6 - 18}
        x2={bx + bw / 2} y2={by - toothLen * 0.6 - 4}
        stroke="#b45309" strokeWidth={1.2} strokeDasharray="3,2" />
      <polygon points={`${bx + bw / 2 - 3},${by - toothLen * 0.6 - 6} ${bx + bw / 2},${by - toothLen * 0.6} ${bx + bw / 2 + 3},${by - toothLen * 0.6 - 6}`}
        fill="#b45309" />
      <text x={bx + bw / 2 + 8} y={by - toothLen * 0.6 - 12}
        textAnchor="start" fontSize={6} fill="#92400e" fontFamily="monospace">BARA</text>

      {/* Vida delikleri */}
      {Array.from({ length: boltCount }, (_, i) => (
        <BoltHole key={i} cx={boltStartX + i * boltSpacing} cy={boltY} r={holeR} />
      ))}

      <text x={bx + bw / 2} y={by - toothLen * 0.6 - 28} textAnchor="middle"
        fontSize={7} fill="#475569" fontFamily="sans-serif" fontWeight={600}>
        Yandan Taraklı
      </text>
    </g>
  );
}

// ─── Kablo Pabuçlu ─────────────────────────────────────────────────────────────
function CableLug({
  bx, by, bw, bh, holeR,
}: {
  bx: number; by: number; bw: number; bh: number; holeR: number;
}) {
  const headR = Math.min(bw, bh * 0.4) / 2;
  const headCX = bx + bw / 2;
  const headCY = by + headR + bh * 0.06;
  const shankW = bw * 0.38;
  const shankX = bx + bw / 2 - shankW / 2;
  const shankY = headCY + headR * 0.7;
  const shankH = bh - (shankY - by) - bh * 0.04;

  return (
    <g>
      {/* Pabuç başı (oval) */}
      <ellipse cx={headCX} cy={headCY} rx={headR} ry={headR * 0.85}
        fill="rgba(148,163,184,0.12)" stroke="#334155" strokeWidth={1.5} />

      {/* Merkez deliği */}
      <BoltHole cx={headCX} cy={headCY} r={holeR} />

      {/* Kablo kovanı */}
      <rect x={shankX} y={shankY} width={shankW} height={shankH}
        fill="rgba(100,116,139,0.12)" stroke="#334155" strokeWidth={1.4} rx={shankW * 0.15} />

      {/* Sıkıştırma çizgileri */}
      {[0.2, 0.45, 0.7].map((t, i) => (
        <line key={i}
          x1={shankX + 3} y1={shankY + shankH * t}
          x2={shankX + shankW - 3} y2={shankY + shankH * t}
          stroke="#475569" strokeWidth={0.8} />
      ))}

      {/* Kablo giriş oku */}
      <line x1={shankX + shankW / 2} y1={shankY + shankH + 14}
        x2={shankX + shankW / 2} y2={shankY + shankH + 2}
        stroke="#b45309" strokeWidth={1.2} strokeDasharray="3,2" />
      <polygon points={`${shankX + shankW / 2 - 3},${shankY + shankH + 4} ${shankX + shankW / 2},${shankY + shankH} ${shankX + shankW / 2 + 3},${shankY + shankH + 4}`}
        fill="#b45309" />
      <text x={shankX + shankW / 2} y={shankY + shankH + 24}
        textAnchor="middle" fontSize={6} fill="#92400e" fontFamily="monospace">KABLO</text>

      <text x={bx + bw / 2} y={by - 7} textAnchor="middle"
        fontSize={7} fill="#475569" fontFamily="sans-serif" fontWeight={600}>
        Kablo Pabuçlu
      </text>
    </g>
  );
}

// ─── Ana Bileşen ───────────────────────────────────────────────────────────────
export function TerminalPreview({
  terminal_type,
  terminal_width_mm,
  terminal_height_mm,
  terminal_depth_mm,
  bolt_count,
  bolt_center_distance_mm,
  hole_diameter_mm,
  width = 320,
  height = 360,
}: TerminalPreviewProps) {
  // Gerçek boyutları ölçeklendirerek ViewBox'a sığdır
  const rawW = terminal_width_mm ?? 60;
  const rawH = terminal_height_mm ?? 80;

  const availW = VB_W - MARGIN * 2 - 30; // sağda ölçü için yer
  const availH = VB_H - MARGIN * 2 - 30; // üstte ölçü için yer
  const scale = Math.min(availW / rawW, availH / rawH, 2.8);

  const bw = rawW * scale;
  const bh = rawH * scale;
  const bx = (VB_W - bw) / 2 - 10;
  const by = MARGIN + 20;

  const rawHoleR = (hole_diameter_mm ?? 13) / 2;
  const holeR = Math.min(rawHoleR * scale, bw * 0.18);

  const rawSpacing = bolt_center_distance_mm ?? 25;
  const boltSpacing = rawSpacing * scale;
  const boltCount = bolt_count ?? 2;

  // Ölçü etiketleri
  const wLabel = terminal_width_mm ? `${terminal_width_mm} mm` : "G=?";
  const hLabel = terminal_height_mm ? `${terminal_height_mm} mm` : "Y=?";
  const dLabel = terminal_depth_mm ? `D=${terminal_depth_mm} mm` : "";

  function renderShape() {
    switch (terminal_type) {
      case "Ön Bakır Basmalı":
        return (
          <FrontCopperPress
            bx={bx} by={by} bw={bw} bh={bh}
            boltCount={boltCount} boltSpacing={boltSpacing} holeR={holeR}
          />
        );
      case "Arka Yatay Taraklı":
        return (
          <HorizontalComb
            bx={bx} by={by} bw={bw} bh={bh}
            boltCount={boltCount} boltSpacing={boltSpacing} holeR={holeR}
            label="Arka Yatay Taraklı"
          />
        );
      case "Üstten Taraklı":
        return (
          <HorizontalComb
            bx={bx} by={by} bw={bw} bh={bh}
            boltCount={boltCount} boltSpacing={boltSpacing} holeR={holeR}
            label="Üstten Taraklı"
          />
        );
      case "Yandan Taraklı":
        return (
          <SideComb
            bx={bx} by={by} bw={bw} bh={bh}
            boltCount={boltCount} boltSpacing={boltSpacing} holeR={holeR}
          />
        );
      case "Kablo Pabuçlu":
        return (
          <CableLug
            bx={bx} by={by} bw={bw} bh={bh} holeR={holeR}
          />
        );
      default:
        return (
          <rect x={bx} y={by} width={bw} height={bh}
            fill="rgba(148,163,184,0.1)" stroke="#334155" strokeWidth={1.5} rx={3} />
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
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth={0.5} />
        </pattern>
      </defs>
      <rect width={VB_W} height={VB_H} fill="url(#tgrid)" />

      {/* Terminal şekli */}
      {renderShape()}

      {/* Ölçü etiketleri */}
      <DimLabel
        x1={bx} y1={by + bh} x2={bx + bw} y2={by + bh}
        label={wLabel} offset={16} horizontal
      />
      <DimLabel
        x1={bx + bw} y1={by} x2={bx + bw} y2={by + bh}
        label={hLabel} offset={14} horizontal={false}
      />

      {/* Derinlik etiketi */}
      {dLabel && (
        <text x={bx + bw / 2} y={VB_H - 8} textAnchor="middle"
          fontSize={8} fill="var(--muted,#94a3b8)" fontFamily="monospace">
          {dLabel}
        </text>
      )}

      {/* Delik çapı etiketi */}
      {hole_diameter_mm && (
        <text x={bx} y={VB_H - 8} textAnchor="start"
          fontSize={7.5} fill="#64748b" fontFamily="monospace">
          Ø{hole_diameter_mm} mm
        </text>
      )}
    </svg>
  );
}
