import type { Panel, ProjectDevice } from "../../types";

interface DeviceSideViewProps {
  panel?: Panel | null;
  devices?: ProjectDevice[];
}

const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 300;
const PADDING = 16;

export function DeviceSideView({ panel, devices = [] }: DeviceSideViewProps) {
  if (!panel) {
    return <div className="empty-state">Yan görünüm için pano seçin.</div>;
  }

  const panelDepth = panel.depth_mm ?? 300;
  const panelHeight = panel.height_mm;

  const scaleX = (VIEW_WIDTH - PADDING * 2) / Math.max(panelDepth, 1);
  const scaleY = (VIEW_HEIGHT - PADDING * 2) / Math.max(panelHeight, 1);
  const scale = Math.min(scaleX, scaleY);

  const W = panelDepth * scale;
  const H = panelHeight * scale;

  return (
    <div className="canvas-panel">
      <h4 style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "var(--color-muted)" }}>Yan Görünüm</h4>
      <svg
        viewBox={`0 0 ${W + PADDING * 2} ${H + PADDING * 2}`}
        width="100%"
        style={{ border: "1px solid var(--color-border)", borderRadius: "4px", background: "#fff" }}
      >
        {/* Panel outline */}
        <rect
          x={PADDING}
          y={PADDING}
          width={W}
          height={H}
          fill="#f8f8f8"
          stroke="#555"
          strokeWidth={1.5}
        />
        {/* Devices */}
        {devices.map((pd) => {
          const depth = (pd.device.depth_mm ?? 50) * scale;
          const y = PADDING + pd.y_mm * scale;
          const h = pd.device.height_mm * scale;
          return (
            <g key={pd.id}>
              <rect
                x={PADDING}
                y={y}
                width={depth}
                height={h}
                fill="#dbeafe"
                stroke="#3b82f6"
                strokeWidth={0.8}
                opacity={0.85}
              />
              {h > 10 && (
                <text
                  x={PADDING + depth / 2}
                  y={y + h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(9, h * 0.6)}
                  fill="#1e40af"
                >
                  {pd.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
