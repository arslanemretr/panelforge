import type { Busbar } from "../../types";

interface BusbarDrawingProps {
  busbar: Busbar;
}

const PHASE_COLORS: Record<string, string> = {
  L1: "#e53935",
  L2: "#f9a825",
  L3: "#1565c0",
  N:  "#616161",
};

const DIRECTION_LABELS: Record<string, string> = {
  up:    "↑ Yukarı",
  down:  "↓ Aşağı",
  left:  "← Sola",
  right: "→ Sağa",
  front: "⊙ Öne",
  back:  "⊗ Arkaya",
};

export function BusbarDrawing({ busbar }: BusbarDrawingProps) {
  // ── Scale calculation ─────────────────────────────────────────────────────────
  const MAX_BAR_PX = 680;
  const SCALE = Math.min(3, MAX_BAR_PX / Math.max(busbar.cut_length_mm, 50));

  const barW = busbar.cut_length_mm * SCALE;  // SVG pixels, horizontal length
  const barH = Math.max(busbar.width_mm * SCALE, 20);  // SVG pixels, bar height

  const PAD_L  = 22;   // left of bar (phase label)
  const PAD_R  = 16;   // right of bar
  const PAD_T  = 46;   // top (bend labels + direction)
  const PAD_B  = 52;   // bottom (dimension line + hole numbers)

  const svgW = barW + PAD_L + PAD_R;
  const svgH = barH + PAD_T + PAD_B;

  const phaseColor = PHASE_COLORS[busbar.phase] ?? "#888";

  // ── Bar X/Y origin ────────────────────────────────────────────────────────────
  const bx = PAD_L;
  const by = PAD_T;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      width="100%"
      style={{ display: "block", maxWidth: svgW }}
      fontFamily="'Segoe UI', system-ui, monospace"
    >
      {/* ── Bar body ──────────────────────────────────────────────────────────── */}
      <rect
        x={bx} y={by} width={barW} height={barH}
        fill={`${phaseColor}14`}
        stroke={phaseColor}
        strokeWidth={1.8}
      />

      {/* ── Bar end markers (thick lines showing cut face) ────────────────────── */}
      <line x1={bx}        y1={by}        x2={bx}        y2={by + barH} stroke={phaseColor} strokeWidth={4} strokeLinecap="round" />
      <line x1={bx + barW} y1={by}        x2={bx + barW} y2={by + barH} stroke={phaseColor} strokeWidth={4} strokeLinecap="round" />

      {/* ── Phase label (left of bar) ─────────────────────────────────────────── */}
      <text
        x={bx - 5} y={by + barH / 2}
        textAnchor="end" dominantBaseline="middle"
        fontSize={11} fontWeight="bold" fill={phaseColor}
      >
        {busbar.phase}
      </text>

      {/* ── Bend lines ───────────────────────────────────────────────────────────
          Dashed amber line at each bend position, label above                    */}
      {busbar.bends.map((bend) => {
        const bpx = bx + bend.distance_from_start_mm * SCALE;
        const dirLabel = DIRECTION_LABELS[bend.direction] ?? bend.direction;
        return (
          <g key={bend.bend_no}>
            {/* extend above and below the bar a bit */}
            <line
              x1={bpx} y1={by - 6}
              x2={bpx} y2={by + barH + 6}
              stroke="#d97706"
              strokeWidth={1.5}
              strokeDasharray="5 3"
            />
            {/* bend number + angle */}
            <text
              x={bpx} y={by - 24}
              textAnchor="middle" fontSize={9} fontWeight="700" fill="#92400e"
            >
              B{bend.bend_no}  {bend.angle_deg}°
            </text>
            {/* direction */}
            <text
              x={bpx} y={by - 13}
              textAnchor="middle" fontSize={8} fill="#b45309"
            >
              {dirLabel}
            </text>
            {/* inner radius */}
            <text
              x={bpx} y={by - 4}
              textAnchor="middle" fontSize={7} fill="#92400e" opacity={0.8}
            >
              R{bend.inner_radius_mm}
            </text>
          </g>
        );
      })}

      {/* ── Holes ────────────────────────────────────────────────────────────────
          Circles (round) or ellipses (slot), center at (x_mm, y_mm) from
          bar start / bar top edge                                                */}
      {busbar.holes.map((hole) => {
        const hcx = bx + hole.x_mm * SCALE;
        const hcy = by + hole.y_mm * SCALE;
        const isSlot = hole.slot_width_mm != null && hole.slot_length_mm != null;
        const d = hole.diameter_mm ?? 11;

        return (
          <g key={hole.hole_no}>
            {isSlot ? (
              <ellipse
                cx={hcx} cy={hcy}
                rx={Math.max(2, (hole.slot_length_mm! / 2) * SCALE)}
                ry={Math.max(1.5, (hole.slot_width_mm! / 2) * SCALE)}
                fill="white" stroke="var(--text, #222)" strokeWidth={1}
              />
            ) : (
              <circle
                cx={hcx} cy={hcy}
                r={Math.max(2.5, (d / 2) * SCALE)}
                fill="white" stroke="var(--text, #222)" strokeWidth={1}
              />
            )}
            {/* Cross-hair guides */}
            <line
              x1={hcx - 3} y1={hcy} x2={hcx + 3} y2={hcy}
              stroke="#aaa" strokeWidth={0.5}
            />
            <line
              x1={hcx} y1={hcy - 3} x2={hcx} y2={hcy + 3}
              stroke="#aaa" strokeWidth={0.5}
            />
            {/* Hole number below bar */}
            <text
              x={hcx} y={by + barH + 10}
              textAnchor="middle" fontSize={7.5} fill="#555"
            >
              {hole.hole_no}
            </text>
            {/* Diameter label inside or near hole */}
            {(d / 2) * SCALE > 8 && (
              <text
                x={hcx} y={hcy}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={7} fill="#444"
              >
                ø{d}
              </text>
            )}
          </g>
        );
      })}

      {/* ── Overall dimension line (cut length) ──────────────────────────────── */}
      {(() => {
        const dimY = by + barH + 30;
        return (
          <g>
            {/* tick left */}
            <line x1={bx}        y1={dimY - 7} x2={bx}        y2={dimY + 7} stroke="#555" strokeWidth={0.8} />
            {/* tick right */}
            <line x1={bx + barW} y1={dimY - 7} x2={bx + barW} y2={dimY + 7} stroke="#555" strokeWidth={0.8} />
            {/* horizontal line */}
            <line x1={bx}        y1={dimY}      x2={bx + barW} y2={dimY}     stroke="#555" strokeWidth={0.8} />
            {/* left arrow */}
            <polygon
              points={`${bx},${dimY} ${bx + 7},${dimY - 3.5} ${bx + 7},${dimY + 3.5}`}
              fill="#555"
            />
            {/* right arrow */}
            <polygon
              points={`${bx + barW},${dimY} ${bx + barW - 7},${dimY - 3.5} ${bx + barW - 7},${dimY + 3.5}`}
              fill="#555"
            />
            {/* label */}
            <rect
              x={bx + barW / 2 - 34} y={dimY - 8}
              width={68} height={14}
              fill="var(--bg-card, white)"
            />
            <text
              x={bx + barW / 2} y={dimY + 4}
              textAnchor="middle" fontSize={10} fontWeight="700" fill="#333"
            >
              {busbar.cut_length_mm} mm
            </text>
          </g>
        );
      })()}

      {/* Dimension label description */}
      <text
        x={bx + barW / 2} y={by + barH + 49}
        textAnchor="middle" fontSize={8} fill="#888"
      >
        Kesim Boyu — {busbar.width_mm}×{busbar.thickness_mm} mm
      </text>
    </svg>
  );
}
