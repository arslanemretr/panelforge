import { useEffect, useRef, useState } from "react";

import type { Busbar, Panel, ProjectDevice } from "../../types";
import { BusbarPath } from "./BusbarPath";
import { DeviceShape } from "./DeviceShape";
import { DimensionLine } from "./DimensionLine";
import { GridLayer } from "./GridLayer";
import { HoleMarker } from "./HoleMarker";

interface PanelCanvasProps {
  panel?: Panel | null;
  devices?: ProjectDevice[];
  busbars?: Busbar[];
  onDeviceMove?: (device: ProjectDevice, x: number, y: number) => void;
}

interface DragState {
  deviceId: number;
  offsetX: number;
  offsetY: number;
}

export function PanelCanvas({ panel, devices = [], busbars = [], onDeviceMove }: PanelCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [localDevices, setLocalDevices] = useState<ProjectDevice[]>(devices);
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    setLocalDevices(devices);
  }, [devices]);

  if (!panel) {
    return <div className="empty-state">Yerlesim cizimi icin once pano olculerini girin.</div>;
  }

  function pointerToSvg(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) {
      return { x: 0, y: 0 };
    }
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) {
      return { x: 0, y: 0 };
    }
    const transformed = point.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }

  function handlePointerDown(device: ProjectDevice, clientX: number, clientY: number) {
    const point = pointerToSvg(clientX, clientY);
    setDrag({
      deviceId: device.id,
      offsetX: point.x - device.x_mm,
      offsetY: point.y - device.y_mm,
    });
  }

  function handlePointerMove(clientX: number, clientY: number) {
    if (!drag) {
      return;
    }
    const point = pointerToSvg(clientX, clientY);
    setLocalDevices((current) =>
      current.map((device) =>
        device.id === drag.deviceId
          ? {
              ...device,
              x_mm: Math.max(0, Math.round(point.x - drag.offsetX)),
              y_mm: Math.max(0, Math.round(point.y - drag.offsetY)),
            }
          : device,
      ),
    );
  }

  function handlePointerUp() {
    if (!drag) {
      return;
    }
    const moved = localDevices.find((device) => device.id === drag.deviceId);
    if (moved) {
      onDeviceMove?.(moved, moved.x_mm, moved.y_mm);
    }
    setDrag(null);
  }

  return (
    <div className="canvas-shell">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${panel.width_mm} ${panel.height_mm}`}
        className="panel-canvas"
        onPointerMove={(event) => handlePointerMove(event.clientX, event.clientY)}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <rect x={0} y={0} width={panel.width_mm} height={panel.height_mm} className="panel-outline" />
        <GridLayer width={panel.width_mm} height={panel.height_mm} />
        <rect
          x={panel.left_margin_mm}
          y={panel.top_margin_mm}
          width={panel.mounting_plate_width_mm ?? panel.width_mm - panel.left_margin_mm - panel.right_margin_mm}
          height={panel.mounting_plate_height_mm ?? panel.height_mm - panel.top_margin_mm - panel.bottom_margin_mm}
          className="mounting-plate"
        />
        <DimensionLine x1={0} y1={panel.height_mm - 18} x2={panel.width_mm} y2={panel.height_mm - 18} label={`${panel.width_mm} mm`} />
        <DimensionLine x1={panel.width_mm - 18} y1={0} x2={panel.width_mm - 18} y2={panel.height_mm} label={`${panel.height_mm} mm`} />
        {busbars.map((busbar) => (
          <g key={busbar.id}>
            <BusbarPath busbar={busbar} />
            {busbar.holes.map((hole) => {
              const segment = busbar.segments.at(-1);
              const x = segment ? segment.end_x_mm : hole.x_mm;
              const y = segment ? segment.end_y_mm : hole.y_mm;
              return <HoleMarker key={`${busbar.id}-${hole.hole_no}`} x={x} y={y} />;
            })}
          </g>
        ))}
        {localDevices.map((device) => (
          <DeviceShape key={device.id} device={device} onPointerDown={handlePointerDown} />
        ))}
      </svg>
    </div>
  );
}
