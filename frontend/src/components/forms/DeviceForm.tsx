import { useState } from "react";

import type { Device, DeviceTerminal } from "../../types";

interface DeviceFormProps {
  initialValue?: Device;
  onSubmit: (value: Omit<Device, "id">) => Promise<unknown>;
}

const defaultTerminal = (terminalName: string, phase: string, x: number): DeviceTerminal => ({
  terminal_name: terminalName,
  phase,
  x_mm: x,
  y_mm: 20,
  z_mm: 0,
  terminal_face: null,
  hole_diameter_mm: 11,
  slot_width_mm: null,
  slot_length_mm: null,
});

export function DeviceForm({ initialValue, onSubmit }: DeviceFormProps) {
  const [brand, setBrand] = useState(initialValue?.brand ?? "ABB");
  const [model, setModel] = useState(initialValue?.model ?? "Emax");
  const [deviceType, setDeviceType] = useState(initialValue?.device_type ?? "Ana Salter");
  const [poles, setPoles] = useState(initialValue?.poles ?? 3);
  const [currentA, setCurrentA] = useState<number>(Number(initialValue?.current_a ?? 1600));
  const [widthMm, setWidthMm] = useState(Number(initialValue?.width_mm ?? 260));
  const [heightMm, setHeightMm] = useState(Number(initialValue?.height_mm ?? 420));
  const [depthMm, setDepthMm] = useState(Number(initialValue?.depth_mm ?? 180));
  const [terminals, setTerminals] = useState<DeviceTerminal[]>(
    initialValue?.terminals.length
      ? initialValue.terminals.map((terminal) => ({
          terminal_name: terminal.terminal_name,
          phase: terminal.phase,
          x_mm: Number(terminal.x_mm),
          y_mm: Number(terminal.y_mm),
          z_mm: terminal.z_mm != null ? Number(terminal.z_mm) : 0,
          terminal_face: terminal.terminal_face ?? null,
          hole_diameter_mm: terminal.hole_diameter_mm != null ? Number(terminal.hole_diameter_mm) : null,
          slot_width_mm: terminal.slot_width_mm != null ? Number(terminal.slot_width_mm) : null,
          slot_length_mm: terminal.slot_length_mm != null ? Number(terminal.slot_length_mm) : null,
        }))
      : [
          defaultTerminal("L1", "L1", 30),
          defaultTerminal("L2", "L2", 90),
          defaultTerminal("L3", "L3", 150),
        ],
  );

  function updateTerminal(index: number, key: keyof DeviceTerminal, value: string | number | null) {
    setTerminals((current) =>
      current.map((terminal, terminalIndex) =>
        terminalIndex === index ? { ...terminal, [key]: value } : terminal,
      ),
    );
  }

  return (
    <form
      className="stack"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit({
          brand,
          model,
          device_type: deviceType,
          poles,
          current_a: currentA,
          width_mm: widthMm,
          height_mm: heightMm,
          depth_mm: depthMm,
          terminals,
        });
      }}
    >
      <div className="form-grid">
        <label>
          <span>Marka</span>
          <input value={brand} onChange={(event) => setBrand(event.target.value)} />
        </label>
        <label>
          <span>Model</span>
          <input value={model} onChange={(event) => setModel(event.target.value)} />
        </label>
        <label>
          <span>Cihaz tipi</span>
          <input value={deviceType} onChange={(event) => setDeviceType(event.target.value)} />
        </label>
        <label>
          <span>Kutup</span>
          <input type="number" value={poles} onChange={(event) => setPoles(Number(event.target.value))} />
        </label>
        <label>
          <span>Akim</span>
          <input type="number" value={currentA} onChange={(event) => setCurrentA(Number(event.target.value))} />
        </label>
        <label>
          <span>Genislik</span>
          <input type="number" value={widthMm} onChange={(event) => setWidthMm(Number(event.target.value))} />
        </label>
        <label>
          <span>Yukseklik</span>
          <input type="number" value={heightMm} onChange={(event) => setHeightMm(Number(event.target.value))} />
        </label>
        <label>
          <span>Derinlik</span>
          <input type="number" value={depthMm} onChange={(event) => setDepthMm(Number(event.target.value))} />
        </label>
      </div>

      <div className="card">
        <div className="section-header">
          <h3>Terminaller</h3>
          <button
            type="button"
            className="ghost"
            onClick={() =>
              setTerminals((current) => [
                ...current,
                defaultTerminal(`T${current.length + 1}`, "L1", 30 + current.length * 30),
              ])
            }
          >
            Terminal ekle
          </button>
        </div>

        <div className="terminal-grid">
          <div className="terminal-row terminal-row-header" aria-hidden="true">
            <span>Ad</span>
            <span>Faz</span>
            <span>X</span>
            <span>Y</span>
            <span>Z</span>
            <span>Yuzey</span>
            <span>Delik Capi</span>
          </div>

          {terminals.map((terminal, index) => (
            <div className="terminal-row" key={`${terminal.terminal_name}-${index}`}>
              <input
                value={terminal.terminal_name}
                onChange={(event) => updateTerminal(index, "terminal_name", event.target.value)}
                placeholder="Ad"
                aria-label={`Terminal ${index + 1} adi`}
              />
              <select
                value={terminal.phase}
                onChange={(event) => updateTerminal(index, "phase", event.target.value)}
                aria-label={`Terminal ${index + 1} fazi`}
              >
                <option value="L1">L1</option>
                <option value="L2">L2</option>
                <option value="L3">L3</option>
                <option value="N">N</option>
                <option value="PE">PE</option>
              </select>
              <input
                type="number"
                value={terminal.x_mm}
                onChange={(event) => updateTerminal(index, "x_mm", Number(event.target.value))}
                placeholder="X (mm)"
                title="X koordinati"
                aria-label={`Terminal ${index + 1} X koordinati`}
              />
              <input
                type="number"
                value={terminal.y_mm}
                onChange={(event) => updateTerminal(index, "y_mm", Number(event.target.value))}
                placeholder="Y (mm)"
                title="Y koordinati"
                aria-label={`Terminal ${index + 1} Y koordinati`}
              />
              <input
                type="number"
                value={terminal.z_mm ?? 0}
                onChange={(event) => updateTerminal(index, "z_mm", Number(event.target.value))}
                placeholder="Z (mm)"
                title="Z koordinati"
                aria-label={`Terminal ${index + 1} Z koordinati`}
              />
              <select
                value={terminal.terminal_face ?? ""}
                onChange={(event) => updateTerminal(index, "terminal_face", event.target.value || null)}
                title="Terminal yuzeyi"
                aria-label={`Terminal ${index + 1} yuzeyi`}
              >
                <option value="">Yuzey</option>
                <option value="front">On</option>
                <option value="back">Arka</option>
                <option value="left">Sol</option>
                <option value="right">Sag</option>
                <option value="top">Ust</option>
                <option value="bottom">Alt</option>
              </select>
              <input
                type="number"
                value={terminal.hole_diameter_mm ?? 0}
                onChange={(event) => updateTerminal(index, "hole_diameter_mm", Number(event.target.value))}
                placeholder="Cap (mm)"
                title="Delik capi"
                aria-label={`Terminal ${index + 1} delik capi`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit">{initialValue ? "Degisiklikleri Kaydet" : "Cihaz kutuphanesine kaydet"}</button>
      </div>
    </form>
  );
}
