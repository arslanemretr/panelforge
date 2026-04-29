interface HoleMarkerProps {
  x: number;
  y: number;
}

export function HoleMarker({ x, y }: HoleMarkerProps) {
  return (
    <g>
      <circle cx={x} cy={y} r={6} className="hole-marker" />
      <circle cx={x} cy={y} r={2} fill="#fff7d1" />
    </g>
  );
}
