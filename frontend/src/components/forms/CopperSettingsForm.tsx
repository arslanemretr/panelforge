import { useEffect, useState } from "react";

import type { CopperSettings } from "../../types";

interface CopperSettingsFormProps {
  initialValue?: CopperSettings | null;
  onSubmit: (value: CopperSettings) => Promise<unknown>;
}

const fallbackSettings: CopperSettings = {
  main_width_mm: 40,
  main_thickness_mm: 10,
  main_material: "Cu",
  main_phase_spacing_mm: 50,
  branch_width_mm: 30,
  branch_thickness_mm: 5,
  branch_material: "Cu",
  branch_phase_spacing_mm: 40,
  bend_inner_radius_mm: 10,
  k_factor: 0.33,
  min_hole_edge_distance_mm: 15,
  min_bend_hole_distance_mm: 15,
  default_hole_diameter_mm: 11,
  use_slot_holes: false,
  slot_width_mm: 0,
  slot_length_mm: 0,
};

export function CopperSettingsForm({ initialValue, onSubmit }: CopperSettingsFormProps) {
  const [value, setValue] = useState<CopperSettings>(initialValue ?? fallbackSettings);

  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
    }
  }, [initialValue]);

  function update<K extends keyof CopperSettings>(key: K, nextValue: CopperSettings[K]) {
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
        <span>Ana bara genisligi</span>
        <input type="number" value={value.main_width_mm ?? 0} onChange={(event) => update("main_width_mm", Number(event.target.value))} />
      </label>
      <label>
        <span>Ana bara kalinligi</span>
        <input
          type="number"
          value={value.main_thickness_mm ?? 0}
          onChange={(event) => update("main_thickness_mm", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Ana faz araligi</span>
        <input
          type="number"
          value={value.main_phase_spacing_mm ?? 0}
          onChange={(event) => update("main_phase_spacing_mm", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Tali bara genisligi</span>
        <input type="number" value={value.branch_width_mm ?? 0} onChange={(event) => update("branch_width_mm", Number(event.target.value))} />
      </label>
      <label>
        <span>Tali bara kalinligi</span>
        <input
          type="number"
          value={value.branch_thickness_mm ?? 0}
          onChange={(event) => update("branch_thickness_mm", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Tali faz araligi</span>
        <input
          type="number"
          value={value.branch_phase_spacing_mm ?? 0}
          onChange={(event) => update("branch_phase_spacing_mm", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Bukum ic yari capi</span>
        <input
          type="number"
          value={value.bend_inner_radius_mm ?? 0}
          onChange={(event) => update("bend_inner_radius_mm", Number(event.target.value))}
        />
      </label>
      <label>
        <span>K faktoru (bakir: 0.33)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          max="0.5"
          value={value.k_factor ?? 0.33}
          onChange={(event) => update("k_factor", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Min delik-kenar mesafesi (mm)</span>
        <input
          type="number"
          value={value.min_hole_edge_distance_mm ?? 0}
          onChange={(event) => update("min_hole_edge_distance_mm", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Min delik-bukum mesafesi (mm)</span>
        <input
          type="number"
          value={value.min_bend_hole_distance_mm ?? 0}
          onChange={(event) => update("min_bend_hole_distance_mm", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Varsayilan delik capi</span>
        <input
          type="number"
          value={value.default_hole_diameter_mm ?? 0}
          onChange={(event) => update("default_hole_diameter_mm", Number(event.target.value))}
        />
      </label>
      <label className="checkbox-field">
        <input type="checkbox" checked={value.use_slot_holes} onChange={(event) => update("use_slot_holes", event.target.checked)} />
        <span>Slot delik kullan</span>
      </label>
      <div className="form-actions">
        <button type="submit">Bakir ayarlarini kaydet</button>
      </div>
    </form>
  );
}
