/**
 * DeviceTechDrawing — 3-görünümlü ortografik teknik çizim bileşeni
 *
 * Ön (W×H), Yan (D×H), Üst (W×D) görünümlerini üretir.
 * Terminaller faz rengiyle işaretlenir. Boyut çizgileri otomatik eklenir.
 */

const PHASE_COLOR: Record<string, string> = {
  L1: "#e53935",
  L2: "#f9a825",
  L3: "#1e88e5",
  N:  "#78909c",
  PE: "#43a047",
};

/** SVG içindeki her görünüm çevresine bırakılan boşluk (boyut okları için) */
const PAD = 38;
const TERMINAL_R = 7;
const FONT_SIZE = 10;
const DIM_FONT = 10;
const DIM_OFFSET = 14; // boyut çizgisinin cihaz kenarından uzaklığı
const DIM_TICK = 7;    // ok ucundaki tik boyutu

interface TechTerminal {
  terminal_name: string;
  phase: string;
  x_mm: number;
  y_mm: number;
  z_mm?: number | null;
  terminal_face?: string | null;
}

interface DeviceTechDrawingProps {
  widthMm: number;
  heightMm: number;
  depthMm: number;
  terminals: TechTerminal[];
  /** compact=true → daha küçük (form-içi önizleme) */
  compact?: boolean;
}

interface ViewTerminal {
  name: string;
  phase: string;
  cx: number;
  cy: number;
}

// ── yardımcı: tek boyut oku ──────────────────────────────────────────────────

function DimArrow({
  x1, y1, x2, y2, value, vertical = false,
}: {
  x1: number; y1: number; x2: number; y2: number;
  value: number; vertical?: boolean;
}) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(173,196,226,0.45)" strokeWidth={1} />
      <line x1={x1} y1={y1 - DIM_TICK / 2} x2={x1} y2={y1 + DIM_TICK / 2} stroke="rgba(173,196,226,0.45)" strokeWidth={1} />
      <line x1={x2} y1={y2 - DIM_TICK / 2} x2={x2} y2={y2 + DIM_TICK / 2} stroke="rgba(173,196,226,0.45)" strokeWidth={1} />
      {vertical ? (
        <text
          x={mx}
          y={my}
          fill="#97adc8"
          fontSize={DIM_FONT}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(-90,${mx},${my})`}
        >
          {value}mm
        </text>
      ) : (
        <text x={mx} y={y1 - 4} fill="#97adc8" fontSize={DIM_FONT} textAnchor="middle">
          {value}mm
        </text>
      )}
    </g>
  );
}

// ── yardımcı: tek ortografik görünüm ─────────────────────────────────────────

function OrthoView({
  label, viewW, viewH, terminals,
}: {
  label: string;
  viewW: number;
  viewH: number;
  terminals: ViewTerminal[];
}) {
  const svgW = viewW + 2 * PAD;
  const svgH = viewH + 2 * PAD;

  return (
    <div style={{ flex: "1 1 0", minWidth: 0 }}>
      <div
        style={{
          fontSize: "0.7rem",
          color: "var(--muted)",
          marginBottom: "0.3rem",
          textAlign: "center",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{
          width: "100%",
          display: "block",
          borderRadius: 10,
          background: "rgba(5,10,18,0.55)",
          border: "1px solid rgba(161,188,220,0.1)",
        }}
      >
        {/* cihaz gövdesi */}
        <rect
          x={PAD}
          y={PAD}
          width={viewW}
          height={viewH}
          fill="rgba(255,138,61,0.07)"
          stroke="rgba(255,195,106,0.4)"
          strokeWidth={1.5}
          rx={2}
        />

        {/* köşe işaretleri (teknik çizim geleneği) */}
        {[
          [PAD, PAD], [PAD + viewW, PAD],
          [PAD, PAD + viewH], [PAD + viewW, PAD + viewH],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={2} fill="rgba(255,195,106,0.25)" />
        ))}

        {/* boyut — genişlik (üst) */}
        <DimArrow
          x1={PAD}        y1={PAD - DIM_OFFSET}
          x2={PAD + viewW} y2={PAD - DIM_OFFSET}
          value={viewW}
        />

        {/* boyut — yükseklik (sol) */}
        <DimArrow
          x1={PAD - DIM_OFFSET} y1={PAD}
          x2={PAD - DIM_OFFSET} y2={PAD + viewH}
          value={viewH}
          vertical
        />

        {/* terminaller */}
        {terminals.map((t, i) => {
          const cx = PAD + Math.max(0, Math.min(t.cx, viewW));
          const cy = PAD + Math.max(0, Math.min(t.cy, viewH));
          const color = PHASE_COLOR[t.phase] ?? "#97adc8";
          const labelRight = cx + TERMINAL_R + 3 > PAD + viewW - 20;
          return (
            <g key={i}>
              {/* hedef daire */}
              <circle cx={cx} cy={cy} r={TERMINAL_R + 3} fill="none" stroke={color} strokeWidth={0.8} opacity={0.35} />
              <circle cx={cx} cy={cy} r={TERMINAL_R} fill={color} opacity={0.82} />
              <text
                x={cx}
                y={cy + 4}
                fill="#fff"
                fontSize={FONT_SIZE - 1}
                textAnchor="middle"
                fontWeight={800}
              >
                {t.phase === "PE" ? "PE" : t.phase.replace("L", "")}
              </text>
              {/* terminal adı */}
              <text
                x={labelRight ? cx - TERMINAL_R - 4 : cx + TERMINAL_R + 4}
                y={cy - 7}
                fill="#c6d8ee"
                fontSize={FONT_SIZE - 1}
                textAnchor={labelRight ? "end" : "start"}
              >
                {t.name}
              </text>
            </g>
          );
        })}

        {/* terminal yoksa uyarı */}
        {terminals.length === 0 && (
          <text
            x={svgW / 2}
            y={svgH / 2}
            fill="rgba(161,188,220,0.3)"
            fontSize={11}
            textAnchor="middle"
            dominantBaseline="central"
          >
            terminal yok
          </text>
        )}
      </svg>
    </div>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export function DeviceTechDrawing({
  widthMm, heightMm, depthMm, terminals, compact = false,
}: DeviceTechDrawingProps) {
  const W = Math.max(widthMm || 1, 1);
  const H = Math.max(heightMm || 1, 1);
  const D = Math.max(depthMm || 1, 1);

  // Ön görünüm: face=front | null | undefined → x_mm / y_mm
  const frontTerminals: ViewTerminal[] = terminals
    .filter((t) => !t.terminal_face || t.terminal_face === "front")
    .map((t) => ({ name: t.terminal_name, phase: t.phase, cx: t.x_mm, cy: t.y_mm }));

  // Yan görünüm (sağ): face=right|left|back → z_mm / y_mm
  const sideTerminals: ViewTerminal[] = terminals
    .filter((t) => t.terminal_face && ["right", "left", "back"].includes(t.terminal_face))
    .map((t) => ({ name: t.terminal_name, phase: t.phase, cx: t.z_mm ?? 0, cy: t.y_mm }));

  // Üst görünüm: face=top|bottom → x_mm / z_mm
  const topTerminals: ViewTerminal[] = terminals
    .filter((t) => t.terminal_face && ["top", "bottom"].includes(t.terminal_face))
    .map((t) => ({ name: t.terminal_name, phase: t.phase, cx: t.x_mm, cy: t.z_mm ?? 0 }));

  const gap = compact ? "0.5rem" : "0.75rem";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {/* Ön + Yan — üst satır */}
      <div style={{ display: "flex", gap, alignItems: "flex-start" }}>
        <OrthoView
          label={`Ön — ${W}×${H}`}
          viewW={W}
          viewH={H}
          terminals={frontTerminals}
        />
        <OrthoView
          label={`Yan — ${D}×${H}`}
          viewW={D}
          viewH={H}
          terminals={sideTerminals}
        />
      </div>
      {/* Üst + boş — alt satır */}
      <div style={{ display: "flex", gap, alignItems: "flex-start" }}>
        <OrthoView
          label={`Üst — ${W}×${D}`}
          viewW={W}
          viewH={D}
          terminals={topTerminals}
        />
        {/* legend */}
        <div
          style={{
            flex: "1 1 0",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.35rem",
            paddingTop: "1.6rem",
          }}
        >
          {Object.entries(PHASE_COLOR).map(([ph, color]) => (
            <div
              key={ph}
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--muted)" }}
            >
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
              {ph}
            </div>
          ))}
          <div style={{ marginTop: "0.5rem", fontSize: "0.7rem", color: "rgba(161,188,220,0.45)", lineHeight: 1.4 }}>
            Yüzey seçili olmayan<br />terminaller ön görünümde
          </div>
        </div>
      </div>
    </div>
  );
}
