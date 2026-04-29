import type { Busbar } from "../../types";

interface BusbarBentViewProps {
  busbar: Busbar;
}

const PHASE_COLORS: Record<string, string> = {
  L1: "#e53935",
  L2: "#f9a825",
  L3: "#1565c0",
  N: "#616161",
  PE: "#2e7d32",
};

export function BusbarBentView({ busbar }: BusbarBentViewProps) {
  if (busbar.segments.length === 0) {
    return null;
  }

  const points = [
    {
      x: Number(busbar.segments[0].start_x_mm),
      y: Number(busbar.segments[0].start_y_mm),
    },
    ...busbar.segments.map((segment) => ({
      x: Number(segment.end_x_mm),
      y: Number(segment.end_y_mm),
    })),
  ];

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);

  const width = 520;
  const height = 280;
  const pad = 34;
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const phaseColor = PHASE_COLORS[busbar.phase] ?? "#2563eb";

  const projectPoint = (x: number, y: number) => ({
    x: pad + (x - minX) * scale,
    y: height - pad - (y - minY) * scale,
  });

  const pathD = busbar.segments
    .map((segment, index) => {
      const start = projectPoint(Number(segment.start_x_mm), Number(segment.start_y_mm));
      const end = projectPoint(Number(segment.end_x_mm), Number(segment.end_y_mm));
      return `${index === 0 ? `M ${start.x} ${start.y}` : ""} L ${end.x} ${end.y}`;
    })
    .join(" ");

  const startPoint = projectPoint(points[0].x, points[0].y);
  const endPoint = projectPoint(points[points.length - 1].x, points[points.length - 1].y);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      style={{ display: "block", maxWidth: width }}
      fontFamily="'Segoe UI', system-ui, sans-serif"
    >
      <rect x={0} y={0} width={width} height={height} rx={16} fill="#ffffff" />

      <path
        d={pathD}
        fill="none"
        stroke={phaseColor}
        strokeWidth={Math.max(5, Number(busbar.width_mm) * scale * 0.18)}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.82}
      />
      <path
        d={pathD}
        fill="none"
        stroke="#0f172a"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {busbar.segments.map((segment) => {
        const end = projectPoint(Number(segment.end_x_mm), Number(segment.end_y_mm));
        return (
          <g key={segment.seq}>
            <circle cx={end.x} cy={end.y} r={4.5} fill="#ffffff" stroke="#0f172a" strokeWidth={1.2} />
            <text x={end.x + 8} y={end.y - 8} fontSize={10} fill="#475569">
              S{segment.seq}
            </text>
          </g>
        );
      })}

      <circle cx={startPoint.x} cy={startPoint.y} r={6} fill="#16a34a" />
      <circle cx={endPoint.x} cy={endPoint.y} r={6} fill="#dc2626" />
      <text x={startPoint.x + 10} y={startPoint.y - 10} fontSize={11} fill="#166534" fontWeight="700">
        Ana bakir
      </text>
      <text x={endPoint.x + 10} y={endPoint.y - 10} fontSize={11} fill="#991b1b" fontWeight="700">
        Cihaz
      </text>

      {busbar.bends.map((bend) => {
        const segment = busbar.segments[Math.max(bend.bend_no - 1, 0)];
        const pivot = projectPoint(Number(segment.end_x_mm), Number(segment.end_y_mm));
        return (
          <g key={bend.bend_no}>
            <circle cx={pivot.x} cy={pivot.y} r={11} fill="rgba(217,119,6,0.12)" stroke="#d97706" strokeWidth={1.4} />
            <text x={pivot.x} y={pivot.y + 3} textAnchor="middle" fontSize={9} fill="#92400e" fontWeight="700">
              B{bend.bend_no}
            </text>
          </g>
        );
      })}

      <text x={pad} y={20} fontSize={12} fill="#0f172a" fontWeight="700">
        Bukulmus gorunum
      </text>
      <text x={pad} y={height - 10} fontSize={11} fill="#64748b">
        Yatay acilim: {busbar.cut_length_mm} mm | Gercek geometri: {spanX.toFixed(1)} x {spanY.toFixed(1)} mm
      </text>
    </svg>
  );
}
