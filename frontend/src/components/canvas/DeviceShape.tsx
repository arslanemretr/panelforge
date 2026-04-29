import type { ProjectDevice } from "../../types";

interface DeviceShapeProps {
  device: ProjectDevice;
  onPointerDown?: (device: ProjectDevice, clientX: number, clientY: number) => void;
}

export function DeviceShape({ device, onPointerDown }: DeviceShapeProps) {
  return (
    <g
      transform={`translate(${device.x_mm}, ${device.y_mm}) rotate(${device.rotation_deg})`}
      onPointerDown={(event) => onPointerDown?.(device, event.clientX, event.clientY)}
      className="device-shape"
    >
      <rect width={device.device.width_mm} height={device.device.height_mm} rx={16} />
      <text x={12} y={24}>
        {device.label}
      </text>
      <text x={12} y={46} className="device-subtitle">
        {device.device.brand} {device.device.model}
      </text>
      {device.device.terminals.map((terminal) => (
        <g key={`${device.id}-${terminal.terminal_name}`}>
          <circle cx={terminal.x_mm} cy={terminal.y_mm} r={7} className="terminal-dot" />
          <text x={terminal.x_mm + 10} y={terminal.y_mm + 4} className="terminal-label">
            {terminal.phase}
          </text>
        </g>
      ))}
    </g>
  );
}
