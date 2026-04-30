import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import type { CopperSettings } from "../../types";

interface ParametersTabProps {
  projectId: number;
}

// ── Read-only info chip ───────────────────────────────────────────────────────
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

function val(v?: number | null, unit = "mm") {
  return v != null ? `${Number(v)} ${unit}` : "—";
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ParametersTab({ projectId }: ParametersTabProps) {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["copper-settings", projectId],
    queryFn: () => client.getCopperSettings(projectId),
  });

  const s = settingsQuery.data;

  // ── Local form state (calculation params only) ────────────────────────────
  const [bendRadius, setBendRadius]         = useState<number>(10);
  const [kFactor, setKFactor]               = useState<number>(0.33);
  const [minEdge, setMinEdge]               = useState<number>(15);
  const [minBend, setMinBend]               = useState<number>(15);
  const [holeDiam, setHoleDiam]             = useState<number>(11);
  const [useSlot, setUseSlot]               = useState<boolean>(false);
  const [slotW, setSlotW]                   = useState<number>(12);
  const [slotL, setSlotL]                   = useState<number>(18);

  // Sync from server when loaded
  useEffect(() => {
    if (!s) return;
    setBendRadius(Number(s.bend_inner_radius_mm ?? 10));
    setKFactor(Number(s.k_factor ?? 0.33));
    setMinEdge(Number(s.min_hole_edge_distance_mm ?? 15));
    setMinBend(Number(s.min_bend_hole_distance_mm ?? 15));
    setHoleDiam(Number(s.default_hole_diameter_mm ?? 11));
    setUseSlot(s.use_slot_holes ?? false);
    setSlotW(Number(s.slot_width_mm ?? 12));
    setSlotL(Number(s.slot_length_mm ?? 18));
  }, [s]);

  const saveMutation = useMutation({
    mutationFn: (payload: CopperSettings) => client.upsertCopperSettings(projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["copper-settings", projectId] }),
  });

  function handleSave() {
    // Merge calculation params with existing settings (preserve busbar specs)
    const merged: CopperSettings = {
      // preserve busbar geometry from previous screen
      main_width_mm:            s?.main_width_mm ?? null,
      main_thickness_mm:        s?.main_thickness_mm ?? null,
      main_material:            s?.main_material ?? "Cu",
      main_phase_spacing_mm:    s?.main_phase_spacing_mm ?? null,
      branch_width_mm:          s?.branch_width_mm ?? null,
      branch_thickness_mm:      s?.branch_thickness_mm ?? null,
      branch_material:          s?.branch_material ?? "Cu",
      branch_phase_spacing_mm:  s?.branch_phase_spacing_mm ?? null,
      busbar_x_mm:              s?.busbar_x_mm ?? null,
      busbar_y_mm:              s?.busbar_y_mm ?? null,
      busbar_z_mm:              s?.busbar_z_mm ?? null,
      busbar_orientation:       s?.busbar_orientation ?? "horizontal",
      busbar_length_mm:         s?.busbar_length_mm ?? null,
      busbar_phase_count:       s?.busbar_phase_count ?? 3,
      bars_per_phase:           s?.bars_per_phase ?? 1,
      bar_gap_mm:               s?.bar_gap_mm ?? 0,
      busbar_plane:             s?.busbar_plane ?? "XY",
      phase_stack_axis:         s?.phase_stack_axis ?? "Y",
      // calculation params (editable here)
      bend_inner_radius_mm:     bendRadius,
      k_factor:                 kFactor,
      min_hole_edge_distance_mm:minEdge,
      min_bend_hole_distance_mm:minBend,
      default_hole_diameter_mm: holeDiam,
      use_slot_holes:           useSlot,
      slot_width_mm:            useSlot ? slotW : null,
      slot_length_mm:           useSlot ? slotL : null,
    };
    saveMutation.mutate(merged);
  }

  if (settingsQuery.isLoading) {
    return <div className="loading-state">Yükleniyor...</div>;
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="stack">

      {/* ══════════════════════════════════════
          BÖLÜM 1 — Tanımlı Bakır Bilgileri (read-only)
          ══════════════════════════════════════ */}
      <section className="table-card">
        <div className="section-header" style={{ marginBottom: "1rem" }}>
          <h3>Tanımlı Bakır Bilgileri</h3>
          <span className="helper-text" style={{ fontSize: "0.82rem" }}>
            Salt okunur · Değiştirmek için "3 · Bakır Seçimi" sekmesine dönün
          </span>
        </div>

        {!s?.main_width_mm && !s?.branch_width_mm ? (
          <div className="alert alert-warning">
            ⚠ Bakır seçimi ekranında henüz bakır standardı tanımlanmamış.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {/* Ana Bakır */}
            <div
              style={{
                border: "1.5px solid rgba(224,104,0,0.3)",
                borderRadius: "14px",
                padding: "1rem 1.2rem",
                background: "rgba(224,104,0,0.04)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>⚡</span> Ana Bakır
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <InfoChip label="En (mm)"        value={val(s?.main_width_mm)} />
                <InfoChip label="Kalınlık (mm)"  value={val(s?.main_thickness_mm)} />
                <InfoChip label="Faz Aralığı"    value={val(s?.main_phase_spacing_mm)} />
                <InfoChip label="Malzeme"        value={s?.main_material ?? "—"} />
              </div>
            </div>

            {/* Tali Bakır */}
            <div
              style={{
                border: "1.5px solid rgba(21,101,192,0.3)",
                borderRadius: "14px",
                padding: "1rem 1.2rem",
                background: "rgba(21,101,192,0.04)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>🔗</span> Tali Bakır
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <InfoChip label="En (mm)"        value={val(s?.branch_width_mm)} />
                <InfoChip label="Kalınlık (mm)"  value={val(s?.branch_thickness_mm)} />
                <InfoChip label="Malzeme"        value={s?.branch_material ?? "—"} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════
          BÖLÜM 2 — Hesaplama Parametreleri
          ══════════════════════════════════════ */}
      <section className="table-card">
        <div className="section-header" style={{ marginBottom: "1.25rem" }}>
          <h3>Hesaplama Parametreleri</h3>
          <span className="helper-text" style={{ fontSize: "0.82rem" }}>
            Kesim boyu, büküm ve delik hesaplarında kullanılan mühendislik değerleri
          </span>
        </div>

        <div className="form-grid">
          {/* Büküm iç yarıçapı */}
          <label className="field">
            <span>Büküm İç Yarıçapı (mm)</span>
            <input
              className="input"
              type="number"
              min={0}
              step={0.5}
              value={bendRadius}
              onChange={(e) => setBendRadius(Number(e.target.value))}
            />
            <small style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
              Bakırın büküldüğü noktadaki minimum eğrilik yarıçapı
            </small>
          </label>

          {/* K faktörü */}
          <label className="field">
            <span>K Faktörü</span>
            <input
              className="input"
              type="number"
              min={0}
              max={0.5}
              step={0.01}
              value={kFactor}
              onChange={(e) => setKFactor(Number(e.target.value))}
            />
            <small style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
              Büküm telafisi katsayısı — bakır için varsayılan: 0.33
            </small>
          </label>

          {/* Min delik-kenar */}
          <label className="field">
            <span>Min. Delik-Kenar Mesafesi (mm)</span>
            <input
              className="input"
              type="number"
              min={0}
              step={0.5}
              value={minEdge}
              onChange={(e) => setMinEdge(Number(e.target.value))}
            />
            <small style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
              Deliğin bakır kenarına minimum uzaklığı
            </small>
          </label>

          {/* Min delik-büküm */}
          <label className="field">
            <span>Min. Delik-Büküm Mesafesi (mm)</span>
            <input
              className="input"
              type="number"
              min={0}
              step={0.5}
              value={minBend}
              onChange={(e) => setMinBend(Number(e.target.value))}
            />
            <small style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
              Deliğin büküm noktasına en yakın mesafesi
            </small>
          </label>

          {/* Varsayılan delik çapı */}
          <label className="field">
            <span>Varsayılan Delik Çapı (mm)</span>
            <input
              className="input"
              type="number"
              min={1}
              step={0.5}
              value={holeDiam}
              onChange={(e) => setHoleDiam(Number(e.target.value))}
            />
            <small style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
              Sistem tarafından oluşturulan tüm deliklerin çapı
            </small>
          </label>

          {/* Slot delik */}
          <div className="field">
            <span>Slot (Oval) Delik</span>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                cursor: "pointer",
                padding: "0.65rem 0.9rem",
                border: "1px solid var(--line)",
                borderRadius: "10px",
                background: useSlot ? "var(--accent-soft)" : "var(--bg-input)",
                transition: "background 160ms ease",
              }}
            >
              <input
                type="checkbox"
                style={{ width: "auto", accentColor: "var(--accent)" }}
                checked={useSlot}
                onChange={(e) => setUseSlot(e.target.checked)}
              />
              <span style={{ fontSize: "0.9rem" }}>
                {useSlot ? "Aktif — delikler oval oluşturulur" : "Pasif — delikler yuvarlak oluşturulur"}
              </span>
            </label>
          </div>

          {/* Slot boyutları (koşullu) */}
          {useSlot && (
            <>
              <label className="field">
                <span>Slot Genişliği (mm)</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  step={0.5}
                  value={slotW}
                  onChange={(e) => setSlotW(Number(e.target.value))}
                />
              </label>
              <label className="field">
                <span>Slot Uzunluğu (mm)</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  step={0.5}
                  value={slotL}
                  onChange={(e) => setSlotL(Number(e.target.value))}
                />
              </label>
            </>
          )}

          {/* Save button */}
          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <button
              type="button"
              className="btn-primary"
              disabled={saveMutation.isPending}
              onClick={handleSave}
            >
              {saveMutation.isPending ? "Kaydediliyor..." : "Parametreleri Kaydet"}
            </button>
            {saveMutation.isSuccess && (
              <span style={{ color: "var(--ok)", fontSize: "0.88rem", alignSelf: "center" }}>
                ✓ Kaydedildi
              </span>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
