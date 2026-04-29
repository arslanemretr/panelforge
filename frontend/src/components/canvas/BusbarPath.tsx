import type { Busbar } from "../../types";

interface BusbarPathProps {
  busbar: Busbar;
}

export function BusbarPath({ busbar }: BusbarPathProps) {
  const colorMap: Record<string, string> = {
    L1: "#ff5d5d",
    L2: "#ffb347",
    L3: "#57d38c",
    N: "#8fc8ff",
    PE: "#ffe76a",
  };

  return (
    <g>
      {busbar.segments.map((segment) => (
        <line
          key={`${busbar.id}-${segment.seq}`}
          x1={segment.start_x_mm}
          y1={segment.start_y_mm}
          x2={segment.end_x_mm}
          y2={segment.end_y_mm}
          stroke={colorMap[busbar.phase] ?? "#c8d0ff"}
          strokeWidth={Math.max(6, busbar.width_mm / 5)}
          strokeLinecap="round"
          opacity={0.9}
        />
      ))}
    </g>
  );
}
