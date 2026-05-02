import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import type { CopperSettings } from "../../types";

interface ParametersTabProps {
  projectId: number;
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--panel-strong)",
        border: "1px solid var(--line)",
        borderRadius: "10px",
        padding: "0.6rem 0.9rem",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "1rem", color: "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}

function val(value?: number | null, unit = "mm") {
  return value != null ? `${Number(value)} ${unit}` : "-";
}

export function ParametersTab({ projectId }: ParametersTabProps) {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["copper-settings", projectId],
    queryFn: () => client.getCopperSettings(projectId),
  });

  const settings = settingsQuery.data;

  const [bendRadius, setBendRadius] = useState<number>(10);
  const [kFactor, setKFactor] = useState<number>(0.33);
  const [minEdge, setMinEdge] = useState<number>(15);
  const [minBend, setMinBend] = useState<number>(15);
  const [holeDiam, setHoleDiam] = useState<number>(11);
  const [useSlot, setUseSlot] = useState<boolean>(false);
  const [slotW, setSlotW] = useState<number>(12);
  const [slotL, setSlotL] = useState<number>(18);

  useEffect(() => {
    if (!settings) return;
    setBendRadius(Number(settings.bend_inner_radius_mm ?? 10));
    setKFactor(Number(settings.k_factor ?? 0.33));
    setMinEdge(Number(settings.min_hole_edge_distance_mm ?? 15));
    setMinBend(Number(settings.min_bend_hole_distance_mm ?? 15));
    setHoleDiam(Number(settings.default_hole_diameter_mm ?? 11));
    setUseSlot(settings.use_slot_holes ?? false);
    setSlotW(Number(settings.slot_width_mm ?? 12));
    setSlotL(Number(settings.slot_length_mm ?? 18));
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (payload: CopperSettings) => client.upsertCopperSettings(projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["copper-settings", projectId] });
    },
  });

  function handleSave() {
    const merged: CopperSettings = {
      ...settings,
      main_material: settings?.main_material ?? "Cu",
      branch_material: settings?.branch_material ?? "Cu",
      bend_inner_radius_mm: bendRadius,
      k_factor: kFactor,
      min_hole_edge_distance_mm: minEdge,
      min_bend_hole_distance_mm: minBend,
      default_hole_diameter_mm: holeDiam,
      use_slot_holes: useSlot,
      slot_width_mm: useSlot ? slotW : null,
      slot_length_mm: useSlot ? slotL : null,
    };
    saveMutation.mutate(merged);
  }

  if (settingsQuery.isLoading) {
    return <div className="loading-state">Yukleniyor...</div>;
  }

  return (
    <div className="stack">
      <section className="table-card">
        <div className="section-header" style={{ marginBottom: "1rem" }}>
          <h3>Secili Bakir Ozetleri</h3>
          <span className="helper-text" style={{ fontSize: "0.82rem" }}>
            Ana ve tali bakir secimlerinde gelen aktif proje degerleri
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div style={{ border: "1.5px solid rgba(224,104,0,0.3)", borderRadius: "14px", padding: "1rem 1.2rem", background: "rgba(224,104,0,0.04)" }}>
            <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Ana Bakir</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <InfoChip label="Kesit" value={`${settings?.main_width_mm ?? "-"} x ${settings?.main_thickness_mm ?? "-"}`} />
              <InfoChip label="Faz Araligi" value={val(settings?.main_phase_spacing_mm)} />
              <InfoChip label="Yon" value={settings?.busbar_orientation ?? "-"} />
              <InfoChip label="Uzunluk" value={val(settings?.busbar_length_mm)} />
            </div>
          </div>

          <div style={{ border: "1.5px solid rgba(21,101,192,0.3)", borderRadius: "14px", padding: "1rem 1.2rem", background: "rgba(21,101,192,0.04)" }}>
            <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Tali Bakir</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <InfoChip label="Kesit" value={`${settings?.branch_width_mm ?? "-"} x ${settings?.branch_thickness_mm ?? "-"}`} />
              <InfoChip label="Malzeme" value={settings?.branch_material ?? "-"} />
              <InfoChip label="Delik Capi" value={val(settings?.default_hole_diameter_mm)} />
              <InfoChip label="Bukum Ic R" value={val(settings?.bend_inner_radius_mm)} />
            </div>
          </div>
        </div>
      </section>

      <section className="table-card">
        <div className="section-header" style={{ marginBottom: "1.25rem" }}>
          <h3>Hesaplama Parametreleri</h3>
          <span className="helper-text" style={{ fontSize: "0.82rem" }}>
            Delik ve bukum hesaplarinda kullanilan ortak proje parametreleri
          </span>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>Bukum Ic Yaricapi (mm)</span>
            <input className="input" type="number" min={0} step={0.5} value={bendRadius} onChange={(e) => setBendRadius(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>K Faktor</span>
            <input className="input" type="number" min={0} max={0.5} step={0.01} value={kFactor} onChange={(e) => setKFactor(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Min Delik-Kenar (mm)</span>
            <input className="input" type="number" min={0} step={0.5} value={minEdge} onChange={(e) => setMinEdge(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Min Delik-Bukum (mm)</span>
            <input className="input" type="number" min={0} step={0.5} value={minBend} onChange={(e) => setMinBend(Number(e.target.value))} />
          </label>
          <label className="field">
            <span>Varsayilan Delik Capi (mm)</span>
            <input className="input" type="number" min={1} step={0.5} value={holeDiam} onChange={(e) => setHoleDiam(Number(e.target.value))} />
          </label>
          <div className="field">
            <span>Slot Delik</span>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.65rem 0.9rem", border: "1px solid var(--line)", borderRadius: "10px", background: useSlot ? "var(--accent-soft)" : "var(--bg-input)" }}>
              <input type="checkbox" checked={useSlot} onChange={(e) => setUseSlot(e.target.checked)} />
              <span>{useSlot ? "Aktif" : "Pasif"}</span>
            </label>
          </div>
          {useSlot && (
            <>
              <label className="field">
                <span>Slot Genisligi (mm)</span>
                <input className="input" type="number" min={1} step={0.5} value={slotW} onChange={(e) => setSlotW(Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Slot Uzunlugu (mm)</span>
                <input className="input" type="number" min={1} step={0.5} value={slotL} onChange={(e) => setSlotL(Number(e.target.value))} />
              </label>
            </>
          )}

          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <button type="button" className="btn-primary" disabled={saveMutation.isPending} onClick={handleSave}>
              {saveMutation.isPending ? "Kaydediliyor..." : "Parametreleri Kaydet"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
