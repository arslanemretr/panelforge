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

  const SectionTitle = ({ title }: { title: string }) => (
    <div
      style={{
        gridColumn: "1 / -1",
        borderBottom: "1px solid var(--border)",
        paddingBottom: "0.3rem",
        marginTop: "0.5rem",
        fontWeight: 700,
        fontSize: "0.9rem",
        color: "var(--accent)",
      }}
    >
      {title}
    </div>
  );

  return (
    <form
      className="form-grid"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSubmit(value);
      }}
    >
      {/* ── Ana Bakır Konumlandırma ──────────────────────────────────────── */}
      <SectionTitle title="Ana Bara Konumlandırma" />
      <label>
        <span>Bara X konumu (mm)</span>
        <input
          type="number"
          value={value.busbar_x_mm ?? ""}
          placeholder="50"
          onChange={(event) => update("busbar_x_mm", event.target.value === "" ? null : Number(event.target.value))}
        />
      </label>
      <label>
        <span>Bara Y konumu (mm)</span>
        <input
          type="number"
          value={value.busbar_y_mm ?? ""}
          placeholder="100"
          onChange={(event) => update("busbar_y_mm", event.target.value === "" ? null : Number(event.target.value))}
        />
      </label>
      <label>
        <span>Bara Z konumu (mm)</span>
        <input
          type="number"
          value={value.busbar_z_mm ?? ""}
          placeholder="0"
          onChange={(event) => update("busbar_z_mm", event.target.value === "" ? null : Number(event.target.value))}
        />
      </label>
      <label>
        <span>Bara boyu (mm)</span>
        <input
          type="number"
          value={value.busbar_length_mm ?? ""}
          placeholder="1000"
          onChange={(event) => update("busbar_length_mm", event.target.value === "" ? null : Number(event.target.value))}
        />
      </label>
      <label>
        <span>Faz sayisi</span>
        <input
          type="number"
          min={1}
          max={5}
          value={value.busbar_phase_count ?? 3}
          onChange={(event) => update("busbar_phase_count", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Faz basi paralel bar</span>
        <input
          type="number"
          min={1}
          max={4}
          value={value.bars_per_phase ?? 1}
          onChange={(event) => update("bars_per_phase", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Bar arasi bosluk (mm)</span>
        <input
          type="number"
          value={value.bar_gap_mm ?? 0}
          onChange={(event) => update("bar_gap_mm", Number(event.target.value))}
        />
      </label>
      <label>
        <span>Bara yonelimi</span>
        <select
          className="form-input"
          value={value.busbar_orientation ?? "horizontal"}
          onChange={(event) => update("busbar_orientation", event.target.value)}
        >
          <option value="horizontal">Yatay</option>
          <option value="vertical">Dikey</option>
        </select>
      </label>

      {/* ── Ana Bakır Kesiti ──────────────────────────────────────────────── */}
      <SectionTitle title="Ana Bara Kesiti" />
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
        <span>Ana faz merkez mesafesi (mm)</span>
        <input
          type="number"
          step="0.1"
          value={value.main_phase_center_mm ?? ""}
          placeholder="opsiyonel"
          onChange={(event) => update("main_phase_center_mm", event.target.value === "" ? null : Number(event.target.value))}
        />
      </label>
      {/* ── Tali Bakır ───────────────────────────────────────────────────── */}
      <SectionTitle title="Tali Bara Kesiti" />
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
        <span>Tali faz merkez mesafesi (mm)</span>
        <input
          type="number"
          step="0.1"
          value={value.branch_phase_center_mm ?? ""}
          placeholder="opsiyonel"
          onChange={(event) => update("branch_phase_center_mm", event.target.value === "" ? null : Number(event.target.value))}
        />
      </label>
      {/* ── Büküm + Delik ────────────────────────────────────────────────── */}
      <SectionTitle title="Büküm ve Delik" />
      <label>
        <span>Bukum ic yari capi</span>
        <input
          type="number"
          value={value.bend_inner_radius_mm ?? 0}
          onChange={(event) => update("bend_inner_radius_mm", Number(event.target.value))}
        />
      </label>
      <label>
        <span>K faktoru flatwise (0.33)</span>
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
        <span>K faktoru edgewise (0.40)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          max="0.5"
          value={value.k_factor_edgewise ?? 0.40}
          onChange={(event) => update("k_factor_edgewise", Number(event.target.value))}
        />
      </label>
      {/* ── Boşluk Kontrolleri ───────────────────────────────────────────── */}
      <SectionTitle title="Boşluk ve Güvenlik Mesafeleri" />
      <label>
        <span>Ana bara bogazi (mm)</span>
        <input
          type="number"
          value={value.busbar_clearance_mm ?? ""}
          placeholder="opsiyonel"
          onChange={(event) => update("busbar_clearance_mm", event.target.value === "" ? null : Number(event.target.value))}
        />
      </label>
      <label>
        <span>Tali bara bogazi (mm)</span>
        <input
          type="number"
          value={value.branch_clearance_mm ?? ""}
          placeholder="opsiyonel"
          onChange={(event) => update("branch_clearance_mm", event.target.value === "" ? null : Number(event.target.value))}
        />
      </label>
      <label>
        <span>Min. delik-delik mesafesi (mm)</span>
        <input
          type="number"
          value={value.min_hole_hole_distance_mm ?? ""}
          placeholder="opsiyonel"
          onChange={(event) => update("min_hole_hole_distance_mm", event.target.value === "" ? null : Number(event.target.value))}
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
      {/* ── Malzeme ve Özkütle ───────────────────────────────────────────── */}
      <SectionTitle title="Malzeme ve Özkütle" />
      <label className="checkbox-field">
        <input type="checkbox" checked={value.use_slot_holes} onChange={(event) => update("use_slot_holes", event.target.checked)} />
        <span>Slot delik kullan</span>
      </label>
      <label>
        <span>Kaplama tipi</span>
        <select
          className="form-input"
          value={value.coating_type ?? ""}
          onChange={(event) => update("coating_type", event.target.value || null)}
        >
          <option value="">— Seçiniz —</option>
          <option value="Kaplamasız">Kaplamasız</option>
          <option value="Kalay Kaplı">Kalay Kaplı</option>
          <option value="Makaron Kaplı">Makaron Kaplı</option>
          <option value="Boyalı">Boyalı</option>
          <option value="Üre Kaplamalı">Üre Kaplamalı</option>
        </select>
      </label>
      {/* ── Koordinat Sistemi ─────────────────────────────────────────────── */}
      <SectionTitle title="Koordinat Sistemi" />
      <label>
        <span>Faz istifleme ekseni</span>
        <select
          className="form-input"
          value={value.phase_stack_axis ?? "Z"}
          onChange={(event) => update("phase_stack_axis", event.target.value)}
        >
          <option value="Z">Z — derinlikte katmanlı (varsayılan)</option>
          <option value="Y">Y — dikey katmanlı</option>
        </select>
      </label>
      <label>
        <span>Bara düzlemi</span>
        <select
          className="form-input"
          value={value.busbar_plane ?? "XY"}
          onChange={(event) => update("busbar_plane", event.target.value)}
        >
          <option value="XY">XY — yatay düzlem (varsayılan)</option>
          <option value="XZ">XZ — derinlik düzlemi</option>
        </select>
      </label>
      <div className="form-actions">
        <button type="submit">Bakir ayarlarini kaydet</button>
      </div>
    </form>
  );
}
