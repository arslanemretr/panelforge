/**
 * CopperSelectionTab
 *
 * Sol: proje bakır kayıtları tablosu + seçili bakır için düzenleme formu.
 * Sağ: CopperOrthographicPreview (tüm kayıtları gösterir).
 *
 * Birden fazla ana bakır eklenebilir; her biri kütüphaneden kopyalanıp proje içinde düzenlenir.
 */

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import type { CopperDefinition, PhaseType, ProjectCopper } from "../../types";
import { CopperOrthographicPreview } from "./CopperOrthographicPreview";
import { LibraryPickerModal } from "./LibraryPickerModal";

interface CopperSelectionTabProps {
  projectId: number;
}

// ── Draft tipi — ProjectCopper'ın düzenlenebilir alanları ─────────────────────
interface CopperDraft {
  length_mm: number;
  quantity: number;
  main_width_mm: number;
  main_thickness_mm: number;
  busbar_x_mm: number;
  busbar_y_mm: number;
  busbar_z_mm: number;
  busbar_orientation: string;
  phase_type_id: number | null;
  bars_per_phase: number;
  bar_gap_mm: number;
  phase_center_mm: number;
  layer_type: string;
  neutral_bar_count: number;
}

function pcToDraft(pc: ProjectCopper): CopperDraft {
  const def = pc.copper_definition;
  return {
    length_mm:         Number(pc.length_mm ?? 1000),
    quantity:          Number(pc.quantity ?? 1),
    main_width_mm:     Number(pc.main_width_mm  ?? def.main_width_mm  ?? 40),
    main_thickness_mm: Number(pc.main_thickness_mm ?? def.main_thickness_mm ?? 5),
    busbar_x_mm:       Number(pc.busbar_x_mm   ?? def.busbar_x_mm   ?? 0),
    busbar_y_mm:       Number(pc.busbar_y_mm   ?? def.busbar_y_mm   ?? 0),
    busbar_z_mm:       Number(pc.busbar_z_mm   ?? def.busbar_z_mm   ?? 0),
    busbar_orientation: (pc.busbar_orientation ?? def.busbar_orientation ?? "horizontal"),
    phase_type_id:     pc.phase_type_id  ?? def.phase_type_id  ?? null,
    bars_per_phase:    Number(pc.bars_per_phase  ?? def.bars_per_phase  ?? 1),
    bar_gap_mm:        Number(pc.bar_gap_mm      ?? def.bar_gap_mm      ?? 5),
    phase_center_mm:   Number(pc.phase_center_mm ?? def.phase_center_mm ?? 60),
    layer_type:        (pc.layer_type ?? def.layer_type ?? "Tek Kat"),
    neutral_bar_count: Number(pc.neutral_bar_count ?? def.neutral_bar_count ?? 1),
  };
}

function hasNeutral(phaseTypeId: number | null, phaseTypes: PhaseType[]): boolean {
  if (!phaseTypeId) return false;
  const pt = phaseTypes.find((p) => p.id === phaseTypeId);
  return pt ? pt.phases.includes("N") : false;
}

// ── Bölüm başlığı ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem", marginBottom: "0.1rem" }}>
      <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.08em", color: "var(--muted)" }}>
        {children}
      </span>
    </div>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export function CopperSelectionTab({ projectId }: CopperSelectionTabProps) {
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft]           = useState<CopperDraft | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // ── Sorgular ─────────────────────────────────────────────────────────────────
  const coppersQuery = useQuery({
    queryKey: ["project-coppers", projectId],
    queryFn: () => client.listProjectCoppers(projectId),
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

  const phaseTypesQuery = useQuery({
    queryKey: ["phase-types"],
    queryFn: client.listPhaseTypes,
  });

  const coppers      = coppersQuery.data ?? [];
  const definitions  = definitionsQuery.data ?? [];
  const phaseTypes   = phaseTypesQuery.data ?? [];
  const selectedPC   = coppers.find((c) => c.id === selectedId) ?? null;

  // Seçim değişince draft'ı güncelle
  useEffect(() => {
    if (selectedPC) {
      setDraft(pcToDraft(selectedPC));
    } else {
      setDraft(null);
    }
  }, [selectedId, coppersQuery.data]);

  // ── Mutasyonlar ──────────────────────────────────────────────────────────────
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["project-coppers", projectId] });

  const createMutation = useMutation({
    mutationFn: (def: CopperDefinition) =>
      client.createProjectCopper(projectId, {
        copper_definition_id: def.id,
        length_mm: Number(def.busbar_length_mm ?? 1000),
        quantity: 1,
      }),
    onSuccess: async (created) => {
      await invalidate();
      setSelectedId(created.id);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedId || !draft) throw new Error("no selection");
      return client.updateProjectCopper(projectId, selectedId, draft);
    },
    onSuccess: async () => {
      await invalidate();
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => {
      if (!selectedId) throw new Error("no selection");
      return client.resetProjectCopperFromLibrary(projectId, selectedId);
    },
    onSuccess: async () => {
      await invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => client.deleteProjectCopper(projectId, id),
    onSuccess: async (_, deletedId) => {
      if (selectedId === deletedId) {
        setSelectedId(null);
        setDraft(null);
      }
      await invalidate();
    },
  });

  function set<K extends keyof CopperDraft>(key: K, value: CopperDraft[K]) {
    setDraft((v) => v ? { ...v, [key]: value } : v);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "1.5rem", alignItems: "start" }}>

      {/* ── SOL KOLON ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Tablo */}
        <section className="table-card">
          <div className="section-header">
            <h3 style={{ margin: 0 }}>Ana Bakırlar</h3>
            <button type="button" className="btn-primary" onClick={() => setPickerOpen(true)}>
              + Bakır Ekle
            </button>
          </div>

          {coppers.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", padding: "0.5rem 0" }}>
              Henüz bakır eklenmedi. Kütüphaneden seçin.
            </p>
          ) : (
            <table className="table" style={{ marginTop: "0.5rem" }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Bakır Tanımı</th>
                  <th>Kesit (mm)</th>
                  <th>Uzunluk (mm)</th>
                  <th>Adet</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {coppers.map((pc) => {
                  const isSelected = pc.id === selectedId;
                  const w = Number(pc.main_width_mm  ?? pc.copper_definition.main_width_mm  ?? "?");
                  const t = Number(pc.main_thickness_mm ?? pc.copper_definition.main_thickness_mm ?? "?");
                  return (
                    <tr
                      key={pc.id}
                      onClick={() => setSelectedId(isSelected ? null : pc.id)}
                      style={{
                        cursor: "pointer",
                        background: isSelected ? "var(--highlight, rgba(59,130,246,0.08))" : undefined,
                        outline: isSelected ? "1px solid var(--accent, #3b82f6)" : undefined,
                      }}
                    >
                      <td>{pc.seq}</td>
                      <td style={{ fontWeight: 500 }}>{pc.copper_definition.name}</td>
                      <td>{w} × {t}</td>
                      <td>{Number(pc.length_mm)}</td>
                      <td>{pc.quantity}</td>
                      <td>
                        <button
                          type="button"
                          className="ghost"
                          style={{ color: "var(--danger, #ef4444)", padding: "0.1rem 0.4rem" }}
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(pc.id); }}
                          disabled={deleteMutation.isPending}
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* Düzenleme Formu */}
        {selectedPC && draft && (
          <section className="table-card">
            <div className="section-header">
              <h3 style={{ margin: 0 }}>Düzenle — {selectedPC.copper_definition.name}</h3>
            </div>

            <div className="form-grid" style={{ marginTop: "1rem" }}>

              <SectionLabel>Genel</SectionLabel>

              <label className="field">
                <span>Uzunluk (mm)</span>
                <input className="input" type="number" min={1} value={draft.length_mm}
                  onChange={(e) => set("length_mm", Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Adet</span>
                <input className="input" type="number" min={1} value={draft.quantity}
                  onChange={(e) => set("quantity", Number(e.target.value))} />
              </label>

              <SectionLabel>Kesit</SectionLabel>

              <label className="field">
                <span>Genişlik (mm)</span>
                <input className="input" type="number" min={1} value={draft.main_width_mm}
                  onChange={(e) => set("main_width_mm", Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Kalınlık (mm)</span>
                <input className="input" type="number" min={1} value={draft.main_thickness_mm}
                  onChange={(e) => set("main_thickness_mm", Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Kat Tipi</span>
                <select className="input" value={draft.layer_type}
                  onChange={(e) => set("layer_type", e.target.value)}>
                  <option value="Tek Kat">Tek Kat</option>
                  <option value="Çift Kat">Çift Kat</option>
                </select>
              </label>

              <SectionLabel>Elektriksel Yerleşim</SectionLabel>

              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Faz Tipi</span>
                <select className="input" value={draft.phase_type_id ?? ""}
                  onChange={(e) => set("phase_type_id", e.target.value ? Number(e.target.value) : null)}
                  disabled={phaseTypesQuery.isLoading}>
                  <option value="">— Seçiniz —</option>
                  {phaseTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>{pt.name} ({pt.phases})</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Faz Miktarı (adet/faz)</span>
                <input className="input" type="number" min={1} max={8} value={draft.bars_per_phase}
                  onChange={(e) => set("bars_per_phase", Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Faz İçi Aralığı (mm)</span>
                <input className="input" type="number" min={0} value={draft.bar_gap_mm}
                  onChange={(e) => set("bar_gap_mm", Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Fazlar Arası (mm)</span>
                <input className="input" type="number" min={1} value={draft.phase_center_mm}
                  onChange={(e) => set("phase_center_mm", Number(e.target.value))} />
              </label>

              {hasNeutral(draft.phase_type_id, phaseTypes) && (
                <label className="field">
                  <span>Nötr Bakır Miktarı (adet)</span>
                  <input className="input" type="number" min={1} max={8} value={draft.neutral_bar_count}
                    onChange={(e) => set("neutral_bar_count", Number(e.target.value))} />
                </label>
              )}

              <SectionLabel>Konum</SectionLabel>

              <label className="field">
                <span>X — Başlangıç (mm)</span>
                <input className="input" type="number" value={draft.busbar_x_mm}
                  onChange={(e) => set("busbar_x_mm", Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Y — Alttan (mm)</span>
                <input className="input" type="number" value={draft.busbar_y_mm}
                  onChange={(e) => set("busbar_y_mm", Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Z — Ön yüzeyden (mm)</span>
                <input className="input" type="number" value={draft.busbar_z_mm}
                  onChange={(e) => set("busbar_z_mm", Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Yön</span>
                <select className="input" value={draft.busbar_orientation}
                  onChange={(e) => set("busbar_orientation", e.target.value)}>
                  <option value="horizontal">Yatay</option>
                  <option value="vertical">Dikey</option>
                </select>
              </label>
            </div>

            <div className="form-actions" style={{ marginTop: "1rem" }}>
              <button
                type="button"
                className="btn-primary"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
              </button>
              <button
                type="button"
                className="ghost"
                disabled={resetMutation.isPending}
                onClick={() => resetMutation.mutate()}
              >
                {resetMutation.isPending ? "Sıfırlanıyor…" : "Kütüphaneden Sıfırla"}
              </button>
              {saveMutation.isSuccess && (
                <span style={{ color: "#22c55e", fontSize: "0.82rem", alignSelf: "center" }}>✓ Kaydedildi</span>
              )}
            </div>
          </section>
        )}
      </div>

      {/* ── SAĞ KOLON — Ortografik Önizleme ──────────────────────────────── */}
      <div style={{ position: "sticky", top: "1rem" }}>
        <CopperOrthographicPreview
          panel={panelQuery.data}
          projectPanels={projectPanelsQuery.data ?? []}
          projectCoppers={coppers}
        />
      </div>

      {/* ── Kütüphane Seçici Modal ────────────────────────────────────────── */}
      <LibraryPickerModal
        open={pickerOpen}
        title="Ana Bakır Seç"
        items={definitions}
        getSearchText={(def) => def.name}
        renderRow={(def) => (
          <>
            <td style={{ fontWeight: 500 }}>{def.name}</td>
            <td>{def.main_width_mm ?? "?"} × {def.main_thickness_mm ?? "?"} mm</td>
            <td style={{ color: "var(--muted)" }}>{def.phase_type?.name ?? "—"}</td>
          </>
        )}
        onSelect={(def) => {
          createMutation.mutate(def);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </div>
  );
}
