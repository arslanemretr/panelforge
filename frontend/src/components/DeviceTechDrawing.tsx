/**
 * DeviceTechDrawing — 3-görünümlü ortografik teknik çizim bileşeni
 *
 * CSS grid ile mühendislik çizimi yerleşimi:
 *   [Ön Görünüm]  [Yan Görünüm]
 *   [Üst Görünüm] [Lejant      ]
 *
 * Grid satır/sütun oranları cihaz boyutuna (W, H, D) göre hesaplanır.
 * Toplam yükseklik sabit (460px) — sayfaya sığar.
 * Her SVG width+height=%100 + preserveAspectRatio ile ölçeklenir.
 */

const PHASE_COLOR: Record<string, string> = {
  L1: "#e53935",
  L2: "#f9a825",
  L3: "#1e88e5",
  N:  "#78909c",
  PE: "#43a047",
};

const PAD = 36;          // SVG içi kenar boşluğu (boyut okları için)
const TERMINAL_R = 6;
const DIM_FONT = 10;
const DIM_OFFSET = 13;
const DIM_TICK = 6;

interface TechTerminal {
  terminal_name: string;
  phase: string;
  x_mm: number;
  y_mm: number;
  z_mm?: number | null;
  terminal_face?: string | null;
  terminal_width_mm?: number | null;
  terminal_height_mm?: number | null;
  terminal_depth_mm?: number | null;
  bolt_type?: string | null;
  bolt_count?: number | null;
  bolt_center_distance_mm?: number | null;
}

interface DeviceTechDrawingProps {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  terminals: TechTerminal[];
  /** Toplam panel yüksekliği (px). Varsayılan 460. */
  height?: number;
}

interface ViewTerminal {
  name: string;
  phase: string;
  cx: number;
  cy: number;
  bw?: number;
  bh?: number;
  boltDist?: number;
  boltCount?: number;
  boltType?: string | null;
}

// ── Boyut oku ────────────────────────────────────────────────────────────────

function DimArrow({ x1, y1, x2, y2, value, vertical = false }: {
  x1: number; y1: number; x2: number; y2: number;
  value: number; vertical?: boolean;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const stroke = "rgba(173,196,226,0.5)";
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={1} />
      <line x1={x1} y1={y1 - DIM_TICK / 2} x2={x1} y2={y1 + DIM_TICK / 2} stroke={stroke} strokeWidth={1} />
      <line x1={x2} y1={y2 - DIM_TICK / 2} x2={x2} y2={y2 + DIM_TICK / 2} stroke={stroke} strokeWidth={1} />
      {vertical ? (
        <text x={mx} y={my} fill="#97adc8" fontSize={DIM_FONT} textAnchor="middle"
          dominantBaseline="central" transform={`rotate(-90,${mx},${my})`}>
          {value}
        </text>
      ) : (
        <text x={mx} y={y1 - 4} fill="#97adc8" fontSize={DIM_FONT} textAnchor="middle">
          {value}
        </text>
      )}
    </g>
  );
}

// ── Terminal çizimi ───────────────────────────────────────────────────────────

function TerminalMark({ t, viewW, viewH }: { t: ViewTerminal; viewW: number; viewH: number }) {
  const cx = PAD + Math.max(0, Math.min(t.cx, viewW));
  const cy = PAD + Math.max(0, Math.min(t.cy, viewH));
  const color = PHASE_COLOR[t.phase] ?? "#97adc8";
  const hasBlock = t.bw && t.bw > 0 && t.bh && t.bh > 0;
  const labelRight = cx + (t.bw ?? TERMINAL_R * 2) / 2 + 10 > PAD + viewW - 16;
  const labelX = labelRight
    ? cx - (t.bw ? t.bw / 2 : TERMINAL_R) - 3
    : cx + (t.bw ? t.bw / 2 : TERMINAL_R) + 3;
  const labelY = cy - (t.bh ? t.bh / 2 : TERMINAL_R) - 4;

  return (
    <g>
      {hasBlock ? (
        <>
          <rect x={cx - t.bw! / 2} y={cy - t.bh! / 2} width={t.bw} height={t.bh}
            fill={`${color}1a`} stroke={color} strokeWidth={1.2} rx={2} />
          {t.boltDist && t.boltDist > 0 && (
            <>
              {([-1, 1] as const).map((sign, i) => {
                if (i === 1 && (t.boltCount ?? 2) < 2) return null;
                const bx = cx + sign * t.boltDist! / 2;
                return (
                  <g key={i}>
                    <circle cx={bx} cy={cy} r={2.5} fill="none" stroke={color} strokeWidth={1} opacity={0.7} />
                    <line x1={bx - 3} y1={cy} x2={bx + 3} y2={cy} stroke={color} strokeWidth={0.7} opacity={0.7} />
                    <line x1={bx} y1={cy - 3} x2={bx} y2={cy + 3} stroke={color} strokeWidth={0.7} opacity={0.7} />
                  </g>
                );
              })}
            </>
          )}
          <text x={cx} y={cy + 3} fill={color} fontSize={7} textAnchor="middle" fontWeight={800} opacity={0.9}>
            {t.phase}
          </text>
        </>
      ) : (
        <>
          <circle cx={cx} cy={cy} r={TERMINAL_R + 3} fill="none" stroke={color} strokeWidth={0.6} opacity={0.3} />
          <circle cx={cx} cy={cy} r={TERMINAL_R} fill={color} opacity={0.82} />
          <text x={cx} y={cy + 3} fill="#fff" fontSize={7} textAnchor="middle" fontWeight={800}>
            {t.phase === "PE" ? "PE" : t.phase.replace("L", "")}
          </text>
        </>
      )}
      <text x={labelX} y={labelY} fill="#c6d8ee" fontSize={8}
        textAnchor={labelRight ? "end" : "start"}>
        {t.name}{t.boltType ? ` ${t.boltType}` : ""}
      </text>
    </g>
  );
}

// ── Tek ortografik görünüm SVG'si ────────────────────────────────────────────

function OrthoView({ label, viewW, viewH, terminals }: {
  label: string;
  viewW: number;
  viewH: number;
  terminals: ViewTerminal[];
}) {
  const svgW = viewW + 2 * PAD;
  const svgH = viewH + 2 * PAD;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{
        display: "block",
        borderRadius: 8,
        background: "rgba(5,10,18,0.55)",
        border: "1px solid rgba(161,188,220,0.1)",
      }}
    >
      {/* Görünüm etiketi — SVG içinde sol alt köşe */}
      <text x={PAD} y={svgH - PAD + 18} fill="rgba(161,188,220,0.45)"
        fontSize={10} fontWeight={700} letterSpacing="0.5">
        {label.toUpperCase()}
      </text>

      {/* Cihaz gövdesi */}
      <rect x={PAD} y={PAD} width={viewW} height={viewH}
        fill="rgba(255,138,61,0.06)" stroke="rgba(255,195,106,0.45)"
        strokeWidth={1.5} rx={2} />

      {/* Köşe işaretleri */}
      {([[PAD, PAD], [PAD + viewW, PAD], [PAD, PAD + viewH], [PAD + viewW, PAD + viewH]] as [number,number][])
        .map(([x, y], i) => <circle key={i} cx={x} cy={y} r={2} fill="rgba(255,195,106,0.22)" />)}

      {/* Boyut — genişlik (üst) */}
      <DimArrow x1={PAD} y1={PAD - DIM_OFFSET} x2={PAD + viewW} y2={PAD - DIM_OFFSET} value={viewW} />

      {/* Boyut — yükseklik (sol) */}
      <DimArrow x1={PAD - DIM_OFFSET} y1={PAD} x2={PAD - DIM_OFFSET} y2={PAD + viewH} value={viewH} vertical />

      {/* Terminaller */}
      {terminals.map((t, i) => <TerminalMark key={i} t={t} viewW={viewW} viewH={viewH} />)}

      {terminals.length === 0 && (
        <text x={svgW / 2} y={svgH / 2} fill="rgba(161,188,220,0.25)"
          fontSize={11} textAnchor="middle" dominantBaseline="central">
          —
        </text>
      )}
    </svg>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export function DeviceTechDrawing({
  widthMm, heightMm, depthMm, terminals, height = 460,
}: DeviceTechDrawingProps) {
  const W = Math.max(widthMm || 1, 1);
  const H = Math.max(heightMm || 1, 1);
  const D = Math.max(depthMm || 1, 1);

  // Ön görünüm: face = front | null → x_mm / y_mm
  const frontTerminals: ViewTerminal[] = terminals
    .filter((t) => !t.terminal_face || t.terminal_face === "front")
    .map((t) => ({
      name: t.terminal_name, phase: t.phase, cx: t.x_mm, cy: t.y_mm,
      bw: t.terminal_width_mm ?? undefined, bh: t.terminal_height_mm ?? undefined,
      boltDist: t.bolt_center_distance_mm ?? undefined,
      boltCount: t.bolt_count ?? undefined, boltType: t.bolt_type,
    }));

  // Yan görünüm: face = right|left|back → z_mm / y_mm
  const sideTerminals: ViewTerminal[] = terminals
    .filter((t) => t.terminal_face && ["right", "left", "back"].includes(t.terminal_face))
    .map((t) => ({
      name: t.terminal_name, phase: t.phase, cx: t.z_mm ?? 0, cy: t.y_mm,
      bw: t.terminal_depth_mm ?? undefined, bh: t.terminal_height_mm ?? undefined,
      boltDist: t.bolt_center_distance_mm ?? undefined,
      boltCount: t.bolt_count ?? undefined, boltType: t.bolt_type,
    }));

  // Üst görünüm: face = top|bottom → x_mm / z_mm
  const topTerminals: ViewTerminal[] = terminals
    .filter((t) => t.terminal_face && ["top", "bottom"].includes(t.terminal_face))
    .map((t) => ({
      name: t.terminal_name, phase: t.phase, cx: t.x_mm, cy: t.z_mm ?? 0,
      bw: t.terminal_width_mm ?? undefined, bh: t.terminal_depth_mm ?? undefined,
      boltDist: t.bolt_center_distance_mm ?? undefined,
      boltCount: t.bolt_count ?? undefined, boltType: t.bolt_type,
    }));

  /**
   * Grid oranları cihaz gerçek boyutlarına göre:
   *   Sütunlar: W (ön genişliği) : D (yan genişliği)
   *   Satırlar: H (ön/yan yüksekliği) : D (üst yüksekliği)
   * Bu sayede görünümler sayfada gerçek orana yakın dağılır.
   */
  const colRatio = `${W}fr ${D}fr`;
  const rowRatio = `${H}fr ${D}fr`;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateAreas: `"front side" "top legend"`,
        gridTemplateColumns: colRatio,
        gridTemplateRows: rowRatio,
        gap: 6,
        height,           // sabit yükseklik — sayfaya sığar
        minHeight: 0,
      }}
    >
      {/* Ön görünüm */}
      <div style={{ gridArea: "front", minHeight: 0, minWidth: 0 }}>
        <OrthoView label={`Ön  ${W}×${H}`} viewW={W} viewH={H} terminals={frontTerminals} />
      </div>

      {/* Yan görünüm */}
      <div style={{ gridArea: "side", minHeight: 0, minWidth: 0 }}>
        <OrthoView label={`Yan  ${D}×${H}`} viewW={D} viewH={H} terminals={sideTerminals} />
      </div>

      {/* Üst görünüm */}
      <div style={{ gridArea: "top", minHeight: 0, minWidth: 0 }}>
        <OrthoView label={`Üst  ${W}×${D}`} viewW={W} viewH={D} terminals={topTerminals} />
      </div>

      {/* Lejant */}
      <div
        style={{
          gridArea: "legend",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "0.3rem",
          padding: "0.5rem 0.75rem",
          borderRadius: 8,
          background: "rgba(5,10,18,0.4)",
          border: "1px solid rgba(161,188,220,0.08)",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--muted)",
          textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.15rem" }}>
          Faz
        </div>
        {Object.entries(PHASE_COLOR).map(([ph, color]) => (
          <div key={ph} style={{ display: "flex", alignItems: "center",
            gap: "0.4rem", fontSize: "0.72rem", color: "var(--muted)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%",
              background: color, display: "inline-block", flexShrink: 0 }} />
            {ph}
          </div>
        ))}
        <div style={{ marginTop: "0.5rem", fontSize: "0.65rem",
          color: "rgba(161,188,220,0.4)", lineHeight: 1.5 }}>
          ▭ blok boyutu<br />
          ✕ vida merkezi<br />
          • koordinat noktası
        </div>
      </div>
    </div>
  );
}
