import type { Panel, ProjectCopper } from "../../types";

interface CopperPlacementViewProps {
  panel?: Panel | null;
  coppers?: ProjectCopper[];
}

const SVG_MAX = 520;
const PADDING = 20;

const PHASE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];

export function CopperPlacementView({ panel, coppers = [] }: CopperPlacementViewProps) {
  if (!panel) {
    return <div className="empty-state">Şematik görünüm için pano seçin.</div>;
  }

  const pw = panel.width_mm;
  const ph = panel.height_mm;
  const scale = Math.min(
    (SVG_MAX - PADDING * 2) / Math.max(pw, 1),
    (SVG_MAX * 0.6 - PADDING * 2) / Math.max(ph, 1),
  );

  const W = pw * scale;
  const H = ph * scale;

  const isHorizontal = (panel.busbar_orientation ?? "horizontal") === "horizontal";
  const railOffset = (panel.busbar_rail_offset_mm ?? 100) * scale;
  const endSetback = (panel.busbar_end_setback_mm ?? 60) * scale;
  const leftM = (panel.left_margin_mm ?? 0) * scale;
  const rightM = (panel.right_margin_mm ?? 0) * scale;
  const topM = (panel.top_margin_mm ?? 0) * scale;
  const bottomM = (panel.bottom_margin_mm ?? 0) * scale;
  const phaseSpacingFallback = 50 * scale;

  return (
    <div className="canvas-panel">
      <h4 style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "var(--color-muted)" }}>
        Ana Bakır Yerleşimi
      </h4>
      <svg
        viewBox={`0 0 ${W + PADDING * 2} ${H + PADDING * 2}`}
        width="100%"
        style={{ border: "1px solid var(--color-border)", borderRadius: "4px", background: "#fff" }}
      >
        {/* Panel outline */}
        <rect x={PADDING} y={PADDING} width={W} height={H} fill="#f9f9f9" stroke="#555" strokeWidth={1.5} />
        {/* Margins */}
        <rect
          x={PADDING + leftM}
          y={PADDING + topM}
          width={W - leftM - rightM}
          height={H - topM - bottomM}
          fill="none"
          stroke="#bbb"
          strokeWidth={0.5}
          strokeDasharray="4 3"
        />

        {coppers.map((pc, i) => {
          const def = pc.copper_definition;
          const barThickness = Math.max((def.main_thickness_mm ?? 10) * scale, 3);
          const spacing =
            def.main_phase_spacing_mm != null
              ? def.main_phase_spacing_mm * scale
              : phaseSpacingFallback;

          const color = PHASE_COLORS[i % PHASE_COLORS.length];

          if (isHorizontal) {
            const x1 = PADDING + leftM + endSetback;
            const x2 = PADDING + W - rightM - endSetback;
            const barY = PADDING + topM + railOffset + i * spacing - barThickness / 2;
            const labelLen = (pc.length_mm * scale).toFixed(0);
            return (
              <g key={pc.id}>
                <rect
                  x={x1}
                  y={barY}
                  width={Math.max(x2 - x1, 4)}
                  height={barThickness}
                  fill={color}
                  opacity={0.75}
                  rx={1}
                />
                <text
                  x={(x1 + x2) / 2}
                  y={barY - 3}
                  textAnchor="middle"
                  fontSize={8}
                  fill={color}
                >
                  {def.name} · {pc.length_mm}mm × {pc.quantity}
                </text>
              </g>
            );
          } else {
            const y1 = PADDING + topM + endSetback;
            const y2 = PADDING + H - bottomM - endSetback;
            const barX = PADDING + leftM + railOffset + i * spacing - barThickness / 2;
            return (
              <g key={pc.id}>
                <rect
                  x={barX}
                  y={y1}
                  width={barThickness}
                  height={Math.max(y2 - y1, 4)}
                  fill={color}
                  opacity={0.75}
                  rx={1}
                />
                <text
                  x={barX + barThickness + 3}
                  y={(y1 + y2) / 2}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={8}
                  fill={color}
                >
                  {def.name} · {pc.length_mm}mm × {pc.quantity}
                </text>
              </g>
            );
          }
        })}
      </svg>
    </div>
  );
}
