interface DimensionLineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
}

export function DimensionLine({ x1, y1, x2, y2, label }: DimensionLineProps) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="dimension-line" />
      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} className="dimension-label">
        {label}
      </text>
    </g>
  );
}
