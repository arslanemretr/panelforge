import { useEffect, useState } from "react";

import type { Panel } from "../../types";

interface PanelFormProps {
  initialValue?: Panel | null;
  onSubmit: (value: Panel) => Promise<unknown>;
}

const fallbackPanel: Panel = {
  width_mm: 2000,
  height_mm: 2200,
  depth_mm: 600,
  mounting_plate_width_mm: 1800,
  mounting_plate_height_mm: 2000,
  left_margin_mm: 100,
  right_margin_mm: 100,
  top_margin_mm: 120,
  bottom_margin_mm: 120,
  busbar_orientation: "horizontal",
  phase_system: "3P",
  busbar_rail_offset_mm: 100,
  busbar_end_setback_mm: 60,
};

export function PanelForm({ initialValue, onSubmit }: PanelFormProps) {
  const [value, setValue] = useState<Panel>(initialValue ?? fallbackPanel);

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
    }
  }, [initialValue]);

  function update<K extends keyof Panel>(key: K, nextValue: Panel[K]) {
    setValue((current) => ({ ...current, [key]: nextValue }));
  }

  return (
    <form
      className="form-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(value);
      }}
    >
      <label>
        <span>Pano genisligi</span>
        <input type="number" value={value.width_mm} onChange={(event) => update("width_mm", Number(event.target.value))} />
      </label>
      <label>
        <span>Pano yuksekligi</span>
        <input type="number" value={value.height_mm} onChange={(event) => update("height_mm", Number(event.target.value))} />
      </label>
      <label>
        <span>Pano derinligi</span>
        <input type="number" value={value.depth_mm ?? 0} onChange={(event) => update("depth_mm", Number(event.target.value))} />
      </label>
      <label>
        <span>Montaj plakasi genisligi</span>
        <input
          type="number"
          value={value.mounting_plate_width_mm ?? 0}
          onChange={(event) => update("mounting_plate_width_mm", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Montaj plakasi yuksekligi</span>
        <input
          type="number"
          value={value.mounting_plate_height_mm ?? 0}
          onChange={(event) => update("mounting_plate_height_mm", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Sol bosluk</span>
        <input type="number" value={value.left_margin_mm} onChange={(event) => update("left_margin_mm", Number(event.target.value))} />
      </label>
      <label>
        <span>Sag bosluk</span>
        <input type="number" value={value.right_margin_mm} onChange={(event) => update("right_margin_mm", Number(event.target.value))} />
      </label>
      <label>
        <span>Ust bosluk</span>
        <input type="number" value={value.top_margin_mm} onChange={(event) => update("top_margin_mm", Number(event.target.value))} />
      </label>
      <label>
        <span>Alt bosluk</span>
        <input type="number" value={value.bottom_margin_mm} onChange={(event) => update("bottom_margin_mm", Number(event.target.value))} />
      </label>
      <label>
        <span>Bara yonu</span>
        <select
          value={value.busbar_orientation ?? "horizontal"}
          onChange={(event) => update("busbar_orientation", event.target.value)}
        >
          <option value="horizontal">Yatay</option>
          <option value="vertical">Dikey</option>
        </select>
      </label>
      <label>
        <span>Faz yapisi</span>
        <select value={value.phase_system ?? "3P"} onChange={(event) => update("phase_system", event.target.value)}>
          <option value="3P">3P</option>
          <option value="3P+N">3P+N</option>
          <option value="3P+N+PE">3P+N+PE</option>
        </select>
      </label>
      <label>
        <span>Bara rayi ofseti (mm)</span>
        <input
          type="number"
          value={value.busbar_rail_offset_mm ?? 100}
          onChange={(event) => update("busbar_rail_offset_mm", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Bara bitis gerisi (mm)</span>
        <input
          type="number"
          value={value.busbar_end_setback_mm ?? 60}
          onChange={(event) => update("busbar_end_setback_mm", Number(event.target.value))}
        />
      </label>
      <div className="form-actions">
        <button type="submit">Kaydet</button>
      </div>
    </form>
  );
}
