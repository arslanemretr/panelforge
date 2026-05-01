/**
 * DeviceTechDrawing — 3-görünümlü ortografik teknik çizim bileşeni
 *
 * Ön (W×H), Yan (D×H), Üst (W×D) görünümlerini üretir.
 * Terminaller faz rengiyle işaretlenir; terminal_width/height/depth varsa
 * blok dikdörtgeni, bolt_center_distance_mm varsa vida merkezleri gösterilir.
 */

const PHASE_COLOR: Record<string, string> = {
  L1: "#e53935",
  L2: "#f9a825",
  L3: "#1e88e5",
  N:  "#78909c",
  PE: "#43a047",
};

const PAD = 40;
const TERMINAL_R = 6;
const DIM_FONT = 10;
const DIM_OFFSET = 14;
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
  compact?: boolean;
}

interface ViewTerminal {
  name: string;
  phase: string;
  cx: number;
  cy: number;
  bw?: number;  // block width (horizontal in this view)
  bh?: number;  // block height (vertical in this view)
  boltDist?: number;
  boltCount?: number;
  boltType?: string | null;
}

// ── Boyut oku ────────────────────────────────────────────────────────────────

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

// ── Tek terminal çizimi (blok + vida + etiket) ────────────────────────────────

function TerminalMark({
  t, viewW, viewH,
}: {
  t: ViewTerminal;
  viewW: number;
  viewH: number;
}) {
  const cx = PAD + Math.max(0, Math.min(t.cx, viewW));
  const cy = PAD + Math.max(0, Math.min(t.cy, viewH));
  const color = PHASE_COLOR[t.phase] ?? "#97adc8";
  const hasBlock = t.bw && t.bw > 0 && t.bh && t.bh > 0;
  const labelRight = cx + (t.bw ?? TERMINAL_R * 2) / 2 + 12 > PAD + viewW - 20;

  return (
    <g>
      {/* Terminal bloğu */}
      {hasBlock ? (
        <>
          <rect
            x={cx - t.bw! / 2}
            y={cy - t.bh! / 2}
            width={t.bw}
            height={t.bh}
            fill={`${color}22`}
            stroke={color}
            strokeWidth={1.2}
            rx={2}
          />
          {/* Vida merkezleri */}
          {t.boltDist && t.boltDist > 0 && (
            <>
              <circle cx={cx - t.boltDist / 2} cy={cy} r={3} fill="none" stroke={color} strokeWidth={1} opacity={0.7} />
              <line x1={cx - t.boltDist / 2 - 3} y1={cy} x2={cx - t.boltDist / 2 + 3} y2={cy} stroke={color} strokeWidth={0.8} opacity={0.7} />
              <line x1={cx - t.boltDist / 2} y1={cy - 3} x2={cx - t.boltDist / 2} y2={cy + 3} stroke={color} strokeWidth={0.8} opacity={0.7} />
              {(t.boltCount ?? 2) >= 2 && (
                <>
                  <circle cx={cx + t.boltDist / 2} cy={cy} r={3} fill="none" stroke={color} strokeWidth={1} opacity={0.7} />
                  <line x1={cx + t.boltDist / 2 - 3} y1={cy} x2={cx + t.boltDist / 2 + 3} y2={cy} stroke={color} strokeWidth={0.8} opacity={0.7} />
                  <line x1={cx + t.boltDist / 2} y1={cy - 3} x2={cx + t.boltDist / 2} y2={cy + 3} stroke={color} strokeWidth={0.8} opacity={0.7} />
                </>
              )}
            </>
          )}
          {/* Faz etiketi merkezde */}
          <text x={cx} y={cy + 3} fill={color} fontSize={8} textAnchor="middle" fontWeight={800} opacity={0.9}>
            {t.phase}
          </text>
        </>
      ) : (
        <>
          <circle cx={cx} cy={cy} r={TERMINAL_R + 3} fill="none" stroke={color} strokeWidth={0.7} opacity={0.3} />
          <circle cx={cx} cy={cy} r={TERMINAL_R} fill={color} opacity={0.82} />
          <text x={cx} y={cy + 3} fill="#fff" fontSize={8} textAnchor="middle" fontWeight={800}>
            {t.phase === "PE" ? "PE" : t.phase.replace("L", "")}
          </text>
        </>
      )}
      {/* Terminal adı */}
      <text
        x={labelRight ? cx - (t.bw ? t.bw / 2 : TERMINAL_R) - 4 : cx + (t.bw ? t.bw / 2 : TERMINAL_R) + 4}
        y={cy - (t.bh ? t.bh / 2 : TERMINAL_R) - 3}
        fill="#c6d8ee"
        fontSize={9}
        textAnchor={labelRight ? "end" : "start"}
      >
        {t.name}
        {t.boltType ? ` ${t.boltType}` : ""}
      </text>
    </g>
  );
}

// ── Tek ortografik görünüm ────────────────────────────────────────────────────

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
      <div style={{
        fontSize: "0.7rem", color: "var(--muted)", marginBottom: "0.3rem",
        textAlign: "center", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 700,
      }}>
        {label}
      </div>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ width: "100%", display: "block", borderRadius: 10,
          background: "rgba(5,10,18,0.55)", border: "1px solid rgba(161,188,220,0.1)" }}
      >
        {/* Cihaz gövdesi */}
        <rect x={PAD} y={PAD} width={viewW} height={viewH}
          fill="rgba(255,138,61,0.07)" stroke="rgba(255,195,106,0.4)" strokeWidth={1.5} rx={2} />

        {/* Köşe işaretleri */}
        {([[PAD, PAD], [PAD + viewW, PAD], [PAD, PAD + viewH], [PAD + viewW, PAD + viewH]] as [number, number][])
          .map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={2} fill="rgba(255,195,106,0.25)" />
          ))}

        {/* Boyut — genişlik */}
        <DimArrow x1={PAD} y1={PAD - DIM_OFFSET} x2={PAD + viewW} y2={PAD - DIM_OFFSET} value={viewW} />

        {/* Boyut — yükseklik */}
        <DimArrow x1={PAD - DIM_OFFSET} y1={PAD} x2={PAD - DIM_OFFSET} y2={PAD + viewH} value={viewH} vertical />

        {/* Terminaller */}
        {terminals.map((t, i) => (
          <TerminalMark key={i} t={t} viewW={viewW} viewH={viewH} />
        ))}

        {terminals.length === 0 && (
          <text x={svgW / 2} y={svgH / 2} fill="rgba(161,188,220,0.3)"
            fontSize={11} textAnchor="middle" dominantBaseline="central">
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

  // Ön görünüm: face = front | null | undefined → x/y cinsinden
  const frontTerminals: ViewTerminal[] = terminals
    .filter((t) => !t.terminal_face || t.terminal_face === "front")
    .map((t) => ({
      name: t.terminal_name,
      phase: t.phase,
      cx: t.x_mm,
      cy: t.y_mm,
      bw: t.terminal_width_mm ?? undefined,
      bh: t.terminal_height_mm ?? undefined,
      boltDist: t.bolt_center_distance_mm ?? undefined,
      boltCount: t.bolt_count ?? undefined,
      boltType: t.bolt_type,
    }));

  // Yan görünüm: face = right|left|back → z/y cinsinden
  const sideTerminals: ViewTerminal[] = terminals
    .filter((t) => t.terminal_face && ["right", "left", "back"].includes(t.terminal_face))
    .map((t) => ({
      name: t.terminal_name,
      phase: t.phase,
      cx: t.z_mm ?? 0,
      cy: t.y_mm,
      bw: t.terminal_depth_mm ?? undefined,
      bh: t.terminal_height_mm ?? undefined,
      boltDist: t.bolt_center_distance_mm ?? undefined,
      boltCount: t.bolt_count ?? undefined,
      boltType: t.bolt_type,
    }));

  // Üst görünüm: face = top|bottom → x/z cinsinden
  const topTerminals: ViewTerminal[] = terminals
    .filter((t) => t.terminal_face && ["top", "bottom"].includes(t.terminal_face))
    .map((t) => ({
      name: t.terminal_name,
      phase: t.phase,
      cx: t.x_mm,
      cy: t.z_mm ?? 0,
      bw: t.terminal_width_mm ?? undefined,
      bh: t.terminal_depth_mm ?? undefined,
      boltDist: t.bolt_center_distance_mm ?? undefined,
      boltCount: t.bolt_count ?? undefined,
      boltType: t.bolt_type,
    }));

  const gap = compact ? "0.5rem" : "0.75rem";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {/* Ön + Yan — üst satır */}
      <div style={{ display: "flex", gap, alignItems: "flex-start" }}>
        <OrthoView label={`Ön — ${W}×${H} mm`} viewW={W} viewH={H} terminals={frontTerminals} />
        <OrthoView label={`Yan — ${D}×${H} mm`} viewW={D} viewH={H} terminals={sideTerminals} />
      </div>

      {/* Üst + legend — alt satır */}
      <div style={{ display: "flex", gap, alignItems: "flex-start" }}>
        <OrthoView label={`Üst — ${W}×${D} mm`} viewW={W} viewH={D} terminals={topTerminals} />

        {/* Lejant */}
        <div style={{ flex: "0 0 160px", paddingTop: "1.6rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--muted)", marginBottom: "0.2rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Faz Renkleri
          </div>
          {Object.entries(PHASE_COLOR).map(([ph, color]) => (
            <div key={ph} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--muted)" }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
              {ph}
            </div>
          ))}
          <div style={{ marginTop: "0.75rem", fontSize: "0.7rem", color: "rgba(161,188,220,0.45)", lineHeight: 1.5 }}>
            Dikdörtgen = terminal bloğu<br />
            ✕ = vida merkezi<br />
            Yüzey yok → ön görünüm
          </div>
        </div>
      </div>
    </div>
  );
}
