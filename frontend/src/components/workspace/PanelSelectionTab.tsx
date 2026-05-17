import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import type { PanelDefinition, ProjectPanel } from "../../types";
import { ConfirmModal } from "../ConfirmModal";
import { Modal } from "../Modal";
import { LibraryPickerModal } from "./LibraryPickerModal";
import { PanelOrthographicPreview } from "./PanelOrthographicPreview";
import type { PanelGeo } from "./PanelOrthographicPreview";

interface PanelSelectionTabProps {
  projectId: number;
}

// ── Draft type ────────────────────────────────────────────────────────────────
interface PanelDraft extends PanelGeo {
  label: string;
  quantity: number;
  busbar_orientation: string | null;
  phase_system: string | null;
  busbar_rail_offset_mm: number | null;
  busbar_end_setback_mm: number | null;
  origin_x_mm: number;
  origin_y_mm: number;
  origin_z_mm: number;
}

function panelToDraft(p: ProjectPanel): PanelDraft {
  return {
    label: p.label ?? p.panel_definition.name,
    quantity: p.quantity,
    width_mm: Number(p.width_mm),
    height_mm: Number(p.height_mm),
    depth_mm: p.depth_mm != null ? Number(p.depth_mm) : null,
    mounting_plate_width_mm: p.mounting_plate_width_mm != null ? Number(p.mounting_plate_width_mm) : null,
    mounting_plate_height_mm: p.mounting_plate_height_mm != null ? Number(p.mounting_plate_height_mm) : null,
    left_margin_mm: Number(p.left_margin_mm),
    right_margin_mm: Number(p.right_margin_mm),
    top_margin_mm: Number(p.top_margin_mm),
    bottom_margin_mm: Number(p.bottom_margin_mm),
    busbar_orientation: p.busbar_orientation ?? null,
    phase_system: p.phase_system ?? null,
    busbar_rail_offset_mm: p.busbar_rail_offset_mm != null ? Number(p.busbar_rail_offset_mm) : null,
    busbar_end_setback_mm: p.busbar_end_setback_mm != null ? Number(p.busbar_end_setback_mm) : null,
    origin_x_mm: Number(p.origin_x_mm),
    origin_y_mm: Number(p.origin_y_mm),
    origin_z_mm: Number(p.origin_z_mm),
  };
}

type FormTab = "dimensions" | "margins" | "busbar" | "origin";

// ── Number input helper ───────────────────────────────────────────────────────
function NumInput({
  label,
  value,
  onChange,
  nullable = false,
  unit = "mm",
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  nullable?: boolean;
  unit?: string;
}) {
  return (
    <label className="field" style={{ flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input
          className="input"
          type="number"
          step="any"
          value={value ?? ""}
          placeholder={nullable ? "—" : "0"}
          style={{ flex: 1, fontSize: "0.9rem" }}
          onChange={(e) => {
            const s = e.target.value;
            if (s === "" && nullable) { onChange(null); return; }
            const n = parseFloat(s);
            if (!isNaN(n)) onChange(n);
          }}
        />
        {unit && <span style={{ fontSize: "0.8rem", color: "var(--muted)", minWidth: 22 }}>{unit}</span>}
      </div>
    </label>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function PanelSelectionTab({ projectId }: PanelSelectionTabProps) {
  const queryClient = useQueryClient();

  // ── List / picker state ────────────────────────────────────────────────────
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingDef, setPendingDef] = useState<PanelDefinition | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState(1);
  const [confirmPending, setConfirmPending] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // ── Selection + draft form state ───────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<PanelDraft | null>(null);
  const [formTab, setFormTab] = useState<FormTab>("dimensions");

  // ── Queries ────────────────────────────────────────────────────────────────
  const projectPanelsQuery = useQuery({
    queryKey: ["project-panels", projectId],
    queryFn: () => client.listProjectPanels(projectId),
  });

  const panelDefinitionsQuery = useQuery({
    queryKey: ["panel-definitions"],
    queryFn: () => client.listPanelDefinitions(),
  });

  const items      = projectPanelsQuery.data ?? [];
  const definitions = panelDefinitionsQuery.data ?? [];
  const selectedPanel = items.find((p) => p.id === selectedId) ?? null;

  // Keep draft in sync with fetched data (after save/reset mutations update the item)
  // If server returns new values, we don't auto-overwrite an in-progress edit;
  // mutations explicitly call setDraft(panelToDraft(updatedItem)).

  // ── Mutations ──────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: ({ def, quantity }: { def: PanelDefinition; quantity: number }) =>
      client.createProjectPanel(projectId, { panel_definition_id: def.id, quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-panels", projectId] });
      queryClient.invalidateQueries({ queryKey: ["panel", projectId] });
      setPendingDef(null);
      setPendingQuantity(1);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      client.updateProjectPanel(projectId, selectedId!, {
        label:                     draft!.label,
        quantity:                  draft!.quantity,
        width_mm:                  draft!.width_mm,
        height_mm:                 draft!.height_mm,
        depth_mm:                  draft!.depth_mm,
        mounting_plate_width_mm:   draft!.mounting_plate_width_mm,
        mounting_plate_height_mm:  draft!.mounting_plate_height_mm,
        left_margin_mm:            draft!.left_margin_mm,
        right_margin_mm:           draft!.right_margin_mm,
        top_margin_mm:             draft!.top_margin_mm,
        bottom_margin_mm:          draft!.bottom_margin_mm,
        busbar_orientation:        draft!.busbar_orientation,
        phase_system:              draft!.phase_system,
        busbar_rail_offset_mm:     draft!.busbar_rail_offset_mm,
        busbar_end_setback_mm:     draft!.busbar_end_setback_mm,
        origin_x_mm:               draft!.origin_x_mm,
        origin_y_mm:               draft!.origin_y_mm,
        origin_z_mm:               draft!.origin_z_mm,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["project-panels", projectId] });
      queryClient.invalidateQueries({ queryKey: ["panel", projectId] });
      setDraft(panelToDraft(updated));
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => client.resetProjectPanelFromLibrary(projectId, selectedId!),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["project-panels", projectId] });
      queryClient.invalidateQueries({ queryKey: ["panel", projectId] });
      setDraft(panelToDraft(updated));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (panelId: number) => client.deleteProjectPanel(projectId, panelId),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["project-panels", projectId] });
      queryClient.invalidateQueries({ queryKey: ["panel", projectId] });
      if (selectedId === deletedId) { setSelectedId(null); setDraft(null); }
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({ panelId, direction }: { panelId: number; direction: "up" | "down" }) =>
      client.reorderProjectPanel(projectId, panelId, direction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-panels", projectId] });
      queryClient.invalidateQueries({ queryKey: ["panel", projectId] });
    },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function selectRow(item: ProjectPanel) {
    if (selectedId === item.id) {
      // toggle off
      setSelectedId(null);
      setDraft(null);
    } else {
      setSelectedId(item.id);
      setDraft(panelToDraft(item));
      setFormTab("dimensions");
    }
  }

  function setD<K extends keyof PanelDraft>(key: K, val: PanelDraft[K]) {
    setDraft((d) => d ? { ...d, [key]: val } : d);
  }

  const isDirty = draft !== null && selectedPanel !== null
    && JSON.stringify(draft) !== JSON.stringify(panelToDraft(selectedPanel));

  // ── Preview geometry ──────────────────────────────────────────────────────
  // Seçili kabin varsa → tekli geo (draft ile canlı)
  // Seçili kabin yoksa → items doğrudan MultiView'e gönderilir
  const previewGeo: PanelGeo | null = draft ?? (selectedPanel ? panelToDraft(selectedPanel) : null);

  const rightLabel = selectedPanel
    ? (selectedPanel.label ?? `Kabin ${selectedPanel.seq}`)
    : items.length > 1
      ? `Birleşik — ${items.length} kabin`
      : items.length === 1
        ? (items[0].label ?? `Kabin 1`)
        : undefined;

  // ── Form tab labels ────────────────────────────────────────────────────────
  const formTabs: { key: FormTab; label: string }[] = [
    { key: "dimensions", label: "Boyutlar" },
    { key: "margins",    label: "Marjinler" },
    { key: "busbar",     label: "Bara" },
    { key: "origin",     label: "Orijin" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "1.5rem", alignItems: "start" }}>

        {/* ──────────────── LEFT COLUMN ──────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* ── Panel table ── */}
          <section className="table-card">
            <div className="section-header">
              <h3>Seçilen Kabinler</h3>
              <button type="button" className="btn-primary" onClick={() => setPickerOpen(true)}>
                + Kabin Ekle
              </button>
            </div>

            {items.length === 0 ? (
              <p className="empty-state">Henüz kabin seçilmedi. "Kabin Ekle" ile kütüphaneden kabin seçin.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Sıra</th>
                    <th>Etiket</th>
                    <th>Boyutlar (G × Y × D)</th>
                    <th>Adet</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const isSelected = item.id === selectedId;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => selectRow(item)}
                        style={{
                          cursor: "pointer",
                          background: isSelected ? "rgba(34,211,238,0.07)" : undefined,
                          outline: isSelected ? "1px solid rgba(34,211,238,0.35)" : undefined,
                        }}
                      >
                        <td>
                          <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 24, height: 24, borderRadius: "50%",
                            background: "#1a1a1a", color: "#fff",
                            fontSize: "0.8rem", fontWeight: 700,
                          }}>
                            {item.seq}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--accent)" }}>
                          {item.label ?? `Kabin ${item.seq}`}
                        </td>
                        <td style={{ fontSize: "0.86rem", fontFamily: "monospace" }}>
                          {Number(item.width_mm)} × {Number(item.height_mm)}
                          {item.depth_mm ? ` × ${Number(item.depth_mm)}` : ""} mm
                        </td>
                        <td>{item.quantity}</td>
                        <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button" className="ghost"
                            disabled={idx === 0 || reorderMutation.isPending}
                            onClick={() => reorderMutation.mutate({ panelId: item.id, direction: "up" })}
                            title="Yukarı"
                          >↑</button>
                          <button
                            type="button" className="ghost"
                            disabled={idx === items.length - 1 || reorderMutation.isPending}
                            onClick={() => reorderMutation.mutate({ panelId: item.id, direction: "down" })}
                            title="Aşağı"
                          >↓</button>
                          <button
                            type="button" className="ghost danger"
                            disabled={deleteMutation.isPending}
                            onClick={() =>
                              setConfirmPending({
                                message: `"${item.label ?? `Kabin ${item.seq}`}" kabinini yerleşimden kaldırmak istediğinizden emin misiniz?`,
                                onConfirm: () => { deleteMutation.mutate(item.id); setConfirmPending(null); },
                              })
                            }
                          >Sil</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* ── Edit form (only when a panel is selected) ── */}
          {draft && selectedPanel && (
            <section className="table-card">
              <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {selectedPanel.label ?? `Kabin ${selectedPanel.seq}`} — Geometri Düzenle
                  </h3>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    Kütüphane: {selectedPanel.panel_definition.name}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={saveMutation.isPending || !isDirty}
                    onClick={() => saveMutation.mutate()}
                  >
                    {saveMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    disabled={resetMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Kabin geometrisini kütüphane tanımından sıfırlamak istediğinizden emin misiniz?")) {
                        resetMutation.mutate();
                      }
                    }}
                    title="Kütüphanedeki orijinal değerlere döner"
                  >
                    {resetMutation.isPending ? "Sıfırlanıyor…" : "Kütüphaneden Sıfırla"}
                  </button>
                </div>
              </div>

              {/* Form tabs */}
              <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem", borderBottom: "1px solid var(--border)" }}>
                {formTabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFormTab(t.key)}
                    style={{
                      padding: "0.35rem 0.85rem",
                      fontSize: "0.83rem",
                      background: "none",
                      border: "none",
                      borderBottom: formTab === t.key ? "2px solid var(--accent)" : "2px solid transparent",
                      color: formTab === t.key ? "var(--accent)" : "var(--muted)",
                      cursor: "pointer",
                      fontWeight: formTab === t.key ? 600 : 400,
                      marginBottom: "-1px",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab: Boyutlar */}
              {formTab === "dimensions" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                  <label className="field" style={{ flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Etiket</span>
                    <input
                      className="input"
                      value={draft.label}
                      onChange={(e) => setD("label", e.target.value)}
                      style={{ fontSize: "0.9rem" }}
                    />
                  </label>
                  <label className="field" style={{ flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Adet</span>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={draft.quantity}
                      onChange={(e) => setD("quantity", Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ fontSize: "0.9rem" }}
                    />
                  </label>
                  <NumInput label="Genişlik" value={draft.width_mm}  onChange={(v) => setD("width_mm", v ?? 100)} />
                  <NumInput label="Yükseklik" value={draft.height_mm} onChange={(v) => setD("height_mm", v ?? 200)} />
                  <NumInput label="Derinlik" value={draft.depth_mm}  onChange={(v) => setD("depth_mm", v)} nullable />
                  <NumInput label="Mont. Plaka Genişliği" value={draft.mounting_plate_width_mm}  onChange={(v) => setD("mounting_plate_width_mm", v)} nullable />
                  <NumInput label="Mont. Plaka Yüksekliği" value={draft.mounting_plate_height_mm} onChange={(v) => setD("mounting_plate_height_mm", v)} nullable />
                </div>
              )}

              {/* Tab: Marjinler */}
              {formTab === "margins" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", maxWidth: 360 }}>
                  <NumInput label="Sol Marjin"  value={draft.left_margin_mm}   onChange={(v) => setD("left_margin_mm",   v ?? 0)} />
                  <NumInput label="Sağ Marjin"  value={draft.right_margin_mm}  onChange={(v) => setD("right_margin_mm",  v ?? 0)} />
                  <NumInput label="Üst Marjin"  value={draft.top_margin_mm}    onChange={(v) => setD("top_margin_mm",    v ?? 0)} />
                  <NumInput label="Alt Marjin"  value={draft.bottom_margin_mm} onChange={(v) => setD("bottom_margin_mm", v ?? 0)} />
                </div>
              )}

              {/* Tab: Bara */}
              {formTab === "busbar" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem", maxWidth: 420 }}>
                  <label className="field" style={{ flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Bara Yönü</span>
                    <select
                      className="input"
                      value={draft.busbar_orientation ?? ""}
                      onChange={(e) => setD("busbar_orientation", e.target.value || null)}
                      style={{ fontSize: "0.9rem" }}
                    >
                      <option value="">—</option>
                      <option value="horizontal">Yatay</option>
                      <option value="vertical">Dikey</option>
                    </select>
                  </label>
                  <label className="field" style={{ flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Faz Sistemi</span>
                    <select
                      className="input"
                      value={draft.phase_system ?? ""}
                      onChange={(e) => setD("phase_system", e.target.value || null)}
                      style={{ fontSize: "0.9rem" }}
                    >
                      <option value="">—</option>
                      <option value="3P">3P</option>
                      <option value="3P+N">3P+N</option>
                      <option value="3P+N+PE">3P+N+PE</option>
                    </select>
                  </label>
                  <NumInput label="Bara Rayı Ofseti" value={draft.busbar_rail_offset_mm} onChange={(v) => setD("busbar_rail_offset_mm", v)} nullable />
                  <NumInput label="Bara Uç Geri Çekmesi" value={draft.busbar_end_setback_mm} onChange={(v) => setD("busbar_end_setback_mm", v)} nullable />
                </div>
              )}

              {/* Tab: Orijin */}
              {formTab === "origin" && (
                <div>
                  <p style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.75rem" }}>
                    Kabin koordinat orijini (pano montaj planında konumlandırma için)
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", maxWidth: 380 }}>
                    <NumInput label="Orijin X" value={draft.origin_x_mm} onChange={(v) => setD("origin_x_mm", v ?? 0)} />
                    <NumInput label="Orijin Y" value={draft.origin_y_mm} onChange={(v) => setD("origin_y_mm", v ?? 0)} />
                    <NumInput label="Orijin Z" value={draft.origin_z_mm} onChange={(v) => setD("origin_z_mm", v ?? 0)} />
                  </div>
                </div>
              )}

              {saveMutation.isError && (
                <p style={{ color: "var(--error)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
                  Kayıt sırasında hata oluştu.
                </p>
              )}
            </section>
          )}
        </div>

        {/* ──────────────── RIGHT COLUMN — Preview ──────────────── */}
        <div style={{ position: "sticky", top: "1rem" }}>
          {previewGeo || items.length > 0 ? (
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                fontSize: "0.78rem", color: "var(--muted)", marginBottom: "0.5rem",
                textTransform: "uppercase", letterSpacing: "0.08em", paddingLeft: 2,
              }}>
                <span>Ortografik Önizleme</span>
                {!selectedPanel && items.length > 1 && (
                  <span style={{
                    fontSize: "0.72rem", background: "var(--accent-soft)",
                    color: "var(--accent)", borderRadius: 6, padding: "1px 7px",
                    fontWeight: 600, textTransform: "none", letterSpacing: 0,
                  }}>
                    Birleşik
                  </span>
                )}
              </div>

              {/* Seçili kabin: tek görünüm (draft ile canlı) */}
              {previewGeo && (
                <PanelOrthographicPreview geo={previewGeo} label={rightLabel} />
              )}

              {/* Seçim yok: tüm kabinler yan yana */}
              {!previewGeo && items.length > 0 && (
                <PanelOrthographicPreview items={items} label={rightLabel} />
              )}

              {isDirty && (
                <p style={{ fontSize: "0.76rem", color: "#f59e0b", marginTop: "0.4rem", textAlign: "center" }}>
                  ● Kaydedilmemiş değişiklikler
                </p>
              )}
              {!selectedPanel && items.length > 0 && (
                <p style={{ fontSize: "0.76rem", color: "var(--muted)", marginTop: "0.4rem", textAlign: "center" }}>
                  Düzenlemek için tablodan bir kabin seçin
                </p>
              )}
            </div>
          ) : (
            <div style={{
              background: "#0d1117",
              borderRadius: 8,
              padding: "3rem 1rem",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "0.88rem",
            }}>
              Önizleme için kabin ekleyin
            </div>
          )}
        </div>
      </div>

      {/* ── Kabin kütüphane seçici ── */}
      <LibraryPickerModal
        open={pickerOpen}
        title="Kabin Kütüphanesi"
        items={definitions}
        searchPlaceholder="İsim veya boyut ara..."
        getSearchText={(d) => `${d.name} ${d.panel_type?.name ?? ""} ${d.width_mm} ${d.height_mm}`}
        renderRow={(d) => (
          <>
            <td style={{ fontWeight: 600 }}>{d.name}</td>
            <td style={{ fontSize: "0.83rem" }}>
              {d.panel_type ? (
                <span style={{
                  padding: "1px 6px", borderRadius: 8, fontSize: "0.75rem",
                  background: "var(--accent-soft)", color: "var(--accent)", fontWeight: 600,
                }}>
                  {d.panel_type.name}
                </span>
              ) : <span style={{ color: "var(--muted)" }}>—</span>}
            </td>
            <td style={{ fontFamily: "monospace", fontSize: "0.83rem" }}>
              {d.width_mm} × {d.height_mm}{d.depth_mm ? ` × ${d.depth_mm}` : ""} mm
            </td>
          </>
        )}
        onSelect={(def) => {
          setPickerOpen(false);
          setPendingDef(def);
          setPendingQuantity(1);
        }}
        onClose={() => setPickerOpen(false)}
      />

      {/* ── Adet onay modal'ı ── */}
      <Modal
        title={pendingDef ? `Kabin Ekle — ${pendingDef.name}` : ""}
        open={!!pendingDef}
        onClose={() => setPendingDef(null)}
      >
        {pendingDef && (
          <div className="modal-body">
            <p style={{ marginBottom: "1rem", color: "var(--muted)", fontSize: "0.9rem" }}>
              {pendingDef.width_mm} × {pendingDef.height_mm}
              {pendingDef.depth_mm ? ` × ${pendingDef.depth_mm}` : ""} mm
            </p>
            <label className="field" style={{ marginBottom: "1.25rem" }}>
              <span>Adet</span>
              <input
                className="input"
                type="number"
                min={1}
                step={1}
                value={pendingQuantity}
                onChange={(e) => setPendingQuantity(Math.max(1, Number(e.target.value)))}
                autoFocus
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={addMutation.isPending}
                onClick={() => addMutation.mutate({ def: pendingDef, quantity: pendingQuantity })}
              >
                {addMutation.isPending ? "Ekleniyor..." : "Kabin Ekle"}
              </button>
              <button type="button" className="ghost" onClick={() => setPendingDef(null)}>
                İptal
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={confirmPending !== null}
        message={confirmPending?.message ?? ""}
        onConfirm={() => confirmPending?.onConfirm()}
        onCancel={() => setConfirmPending(null)}
      />
    </div>
  );
}
