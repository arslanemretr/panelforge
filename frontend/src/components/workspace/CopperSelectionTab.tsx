import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import type { CopperDefinition, CopperSettings } from "../../types";
import { TechnicalDrawingView } from "./TechnicalDrawingView";

interface CopperSelectionTabProps {
  projectId: number;
}

const EMPTY_SETTINGS: CopperSettings = {
  main_material: "Cu",
  branch_material: "Cu",
  use_slot_holes: false,
  busbar_orientation: "horizontal",
  busbar_plane: "XY",
  phase_stack_axis: "Y",
  busbar_phase_count: 3,
  bars_per_phase: 1,
  bar_gap_mm: 0,
};

function toNumber(value?: number | null): number {
  return value == null ? 0 : Number(value);
}

function applyMainDefinition(
  definition: CopperDefinition,
  current: CopperSettings,
): CopperSettings {
  return {
    ...current,
    main_copper_definition_id: definition.id,
    main_width_mm: definition.main_width_mm ?? current.main_width_mm ?? null,
    main_thickness_mm: definition.main_thickness_mm ?? current.main_thickness_mm ?? null,
    main_material: definition.main_material ?? current.main_material ?? "Cu",
    main_phase_spacing_mm: definition.main_phase_spacing_mm ?? current.main_phase_spacing_mm ?? null,
    busbar_x_mm: definition.busbar_x_mm ?? current.busbar_x_mm ?? null,
    busbar_y_mm: definition.busbar_y_mm ?? current.busbar_y_mm ?? null,
    busbar_z_mm: definition.busbar_z_mm ?? current.busbar_z_mm ?? null,
    busbar_orientation: definition.busbar_orientation ?? current.busbar_orientation ?? "horizontal",
    busbar_length_mm: definition.busbar_length_mm ?? current.busbar_length_mm ?? null,
  };
}

export function CopperSelectionTab({ projectId }: CopperSelectionTabProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CopperSettings>(EMPTY_SETTINGS);

  const settingsQuery = useQuery({
    queryKey: ["copper-settings", projectId],
    queryFn: () => client.getCopperSettings(projectId),
  });

  const definitionsQuery = useQuery({
    queryKey: ["copper-definitions", "main"],
    queryFn: () => client.listCopperDefinitions("main"),
  });

  const panelQuery = useQuery({
    queryKey: ["panel", projectId],
    queryFn: () => client.getPanel(projectId),
  });

  const projectPanelsQuery = useQuery({
    queryKey: ["project-panels", projectId],
    queryFn: () => client.listProjectPanels(projectId),
  });

  const projectDevicesQuery = useQuery({
    queryKey: ["project-devices", projectId],
    queryFn: () => client.listProjectDevices(projectId),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft(settingsQuery.data);
    } else {
      setDraft(EMPTY_SETTINGS);
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload: CopperSettings) => client.upsertCopperSettings(projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["copper-settings", projectId] });
    },
  });

  const definitions = definitionsQuery.data ?? [];
  const selectedDefinition = useMemo(
    () => definitions.find((item) => item.id === draft.main_copper_definition_id) ?? null,
    [definitions, draft.main_copper_definition_id],
  );

  function updateField<K extends keyof CopperSettings>(key: K, value: CopperSettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleDefinitionChange(definitionId: number) {
    const definition = definitions.find((item) => item.id === definitionId);
    if (!definition) {
      return;
    }
    setDraft((current) => applyMainDefinition(definition, current));
  }

  return (
    <div className="stack">
      <section className="table-card">
        <div className="section-header">
          <h3 style={{ margin: 0 }}>Ana Bakir Secimi</h3>
          <span className="helper-text" style={{ fontSize: "0.82rem" }}>
            Secilen ana bakir kutuphanesi tum alanlari doldurur. Projeye ozel konum, yon, faz araligi ve uzunluk burada override edilebilir.
          </span>
        </div>

        <div className="form-grid" style={{ marginTop: "1rem" }}>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Ana Bakir Tanimi</span>
            <select
              className="input"
              value={draft.main_copper_definition_id ?? ""}
              onChange={(event) => handleDefinitionChange(Number(event.target.value))}
            >
              <option value="">- Secin -</option>
              {definitions.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.name} - {definition.main_width_mm ?? "?"} x {definition.main_thickness_mm ?? "?"} mm
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Genislik (mm)</span>
            <input className="input" type="number" value={toNumber(draft.main_width_mm)} onChange={(e) => updateField("main_width_mm", Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Kalinlik (mm)</span>
            <input className="input" type="number" value={toNumber(draft.main_thickness_mm)} onChange={(e) => updateField("main_thickness_mm", Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Malzeme</span>
            <select className="input" value={draft.main_material ?? "Cu"} onChange={(e) => updateField("main_material", e.target.value)}>
              <option value="Cu">Cu</option>
              <option value="Al">Al</option>
            </select>
          </label>
          <label className="field">
            <span>Faz Araligi (mm)</span>
            <input className="input" type="number" value={toNumber(draft.main_phase_spacing_mm)} onChange={(e) => updateField("main_phase_spacing_mm", Number(e.target.value))} />
          </label>

          <label className="field">
            <span>X (mm)</span>
            <input className="input" type="number" value={toNumber(draft.busbar_x_mm)} onChange={(e) => updateField("busbar_x_mm", Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Y (mm)</span>
            <input className="input" type="number" value={toNumber(draft.busbar_y_mm)} onChange={(e) => updateField("busbar_y_mm", Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Z (mm)</span>
            <input className="input" type="number" value={toNumber(draft.busbar_z_mm)} onChange={(e) => updateField("busbar_z_mm", Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Yon</span>
            <select className="input" value={draft.busbar_orientation ?? "horizontal"} onChange={(e) => updateField("busbar_orientation", e.target.value)}>
              <option value="horizontal">Yatay</option>
              <option value="vertical">Dikey</option>
            </select>
          </label>

          <label className="field">
            <span>Uzunluk (mm)</span>
            <input className="input" type="number" value={toNumber(draft.busbar_length_mm)} onChange={(e) => updateField("busbar_length_mm", Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Faz Sayisi</span>
            <input className="input" type="number" min={1} max={5} value={toNumber(draft.busbar_phase_count)} onChange={(e) => updateField("busbar_phase_count", Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Faz Basina Bar</span>
            <input className="input" type="number" min={1} value={toNumber(draft.bars_per_phase)} onChange={(e) => updateField("bars_per_phase", Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Ayni Faz Bar Boslugu (mm)</span>
            <input className="input" type="number" min={0} value={toNumber(draft.bar_gap_mm)} onChange={(e) => updateField("bar_gap_mm", Number(e.target.value))} />
          </label>
        </div>

        <div className="form-actions" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="btn-primary"
            disabled={!draft.main_width_mm || !draft.main_thickness_mm || saveMutation.isPending}
            onClick={() => saveMutation.mutate({ ...EMPTY_SETTINGS, ...draft })}
          >
            {saveMutation.isPending ? "Kaydediliyor..." : "Ana Bakiri Kaydet"}
          </button>
          {selectedDefinition && (
            <span style={{ color: "var(--muted)", fontSize: "0.85rem", alignSelf: "center" }}>
              Secili tanim: <strong style={{ color: "var(--text)" }}>{selectedDefinition.name}</strong>
            </span>
          )}
        </div>
      </section>

      <TechnicalDrawingView
        panel={panelQuery.data}
        projectPanels={projectPanelsQuery.data ?? []}
        devices={projectDevicesQuery.data ?? []}
        copperSettings={draft}
        title="Ana Bakir Teknik Gorunumu"
      />
    </div>
  );
}
