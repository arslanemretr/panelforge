import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import type { PanelDefinition, ProjectPanel } from "../../types";
import { Modal } from "../Modal";
import { PanelAssemblyPreview } from "../PanelAssemblyPreview";
import { LibraryPickerModal } from "./LibraryPickerModal";

interface PanelSelectionTabProps {
  projectId: number;
}

export function PanelSelectionTab({ projectId }: PanelSelectionTabProps) {
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingPanel, setEditingPanel] = useState<ProjectPanel | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const projectPanelsQuery = useQuery({
    queryKey: ["project-panels", projectId],
    queryFn: () => client.listProjectPanels(projectId),
  });

  const panelDefinitionsQuery = useQuery({
    queryKey: ["panel-definitions"],
    queryFn: () => client.listPanelDefinitions(),
  });

  const addMutation = useMutation({
    mutationFn: (def: PanelDefinition) =>
      client.createProjectPanel(projectId, { panel_definition_id: def.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-panels", projectId] });
      queryClient.invalidateQueries({ queryKey: ["panel", projectId] });
    },
  });

  const updateLabelMutation = useMutation({
    mutationFn: ({ panelId, label }: { panelId: number; label: string }) =>
      client.updateProjectPanelLabel(projectId, panelId, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-panels", projectId] });
      queryClient.invalidateQueries({ queryKey: ["panel", projectId] });
      setEditingPanel(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (panelId: number) => client.deleteProjectPanel(projectId, panelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-panels", projectId] });
      queryClient.invalidateQueries({ queryKey: ["panel", projectId] });
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

  function openEdit(item: ProjectPanel) {
    setEditingPanel(item);
    setEditLabel(item.label ?? item.panel_definition.name);
  }

  const items = projectPanelsQuery.data ?? [];
  const definitions = panelDefinitionsQuery.data ?? [];

  return (
    <div className="stack">
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
                <th>Kabin Etiketi</th>
                <th>Tip (Kütüphane Adı)</th>
                <th>Boyutlar (G × Y × D)</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: "#1a1a1a",
                        color: "#fff",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {item.seq}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--accent)" }}>
                    {item.label ?? `${item.seq} nolu Kabin`}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                    {item.panel_definition.name}
                  </td>
                  <td>
                    {item.panel_definition.width_mm} × {item.panel_definition.height_mm}
                    {item.panel_definition.depth_mm ? ` × ${item.panel_definition.depth_mm}` : ""} mm
                  </td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="ghost"
                      disabled={idx === 0 || reorderMutation.isPending}
                      onClick={() => reorderMutation.mutate({ panelId: item.id, direction: "up" })}
                      title="Yukarı taşı"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      disabled={idx === items.length - 1 || reorderMutation.isPending}
                      onClick={() => reorderMutation.mutate({ panelId: item.id, direction: "down" })}
                      title="Aşağı taşı"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => openEdit(item)}
                    >
                      Etiket Düzenle
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(item.id)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <PanelAssemblyPreview items={items} />

      {/* ── Kabin kütüphane seçici ── */}
      <LibraryPickerModal
        open={pickerOpen}
        title="Kabin Kütüphanesi"
        items={definitions}
        searchPlaceholder="İsim veya boyut ara..."
        getSearchText={(d) => `${d.name} ${d.width_mm} ${d.height_mm}`}
        renderRow={(d) => (
          <>
            <td style={{ fontWeight: 500 }}>{d.name}</td>
            <td>
              {d.width_mm} × {d.height_mm} {d.depth_mm ? `× ${d.depth_mm}` : ""} mm
            </td>
          </>
        )}
        onSelect={(def) => addMutation.mutate(def)}
        onClose={() => setPickerOpen(false)}
      />

      {/* ── Etiket düzenleme modal'ı ── */}
      <Modal
        title={editingPanel ? `Kabin ${editingPanel.seq} — Etiket Düzenle` : ""}
        open={!!editingPanel}
        onClose={() => setEditingPanel(null)}
      >
        {editingPanel && (
          <div className="modal-body">
            <p style={{ marginBottom: "0.75rem", color: "var(--muted)", fontSize: "0.9rem" }}>
              Bu etiketi pano ön görünüşünde ve cihaz yerleşimi adımında kabin adı olarak kullanılır.
            </p>
            <div
              style={{
                padding: "0.45rem 0.75rem",
                marginBottom: "1rem",
                background: "var(--accent-soft)",
                borderRadius: "8px",
                fontSize: "0.85rem",
                color: "var(--muted)",
              }}
            >
              Kütüphane tipi: <strong style={{ color: "var(--text)" }}>{editingPanel.panel_definition.name}</strong>
              &nbsp;·&nbsp;
              {editingPanel.panel_definition.width_mm} × {editingPanel.panel_definition.height_mm} mm
            </div>
            <label className="field" style={{ marginBottom: "1rem" }}>
              <span>Kabin Etiketi</span>
              <input
                className="input"
                value={editLabel}
                placeholder={`Örn: Ana Dağıtım, Kabin ${editingPanel.seq}, MCC-A`}
                onChange={(e) => setEditLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editLabel.trim()) {
                    updateLabelMutation.mutate({ panelId: editingPanel.id, label: editLabel });
                  }
                }}
                autoFocus
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={!editLabel.trim() || updateLabelMutation.isPending}
                onClick={() => updateLabelMutation.mutate({ panelId: editingPanel.id, label: editLabel })}
              >
                {updateLabelMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button type="button" className="ghost" onClick={() => setEditingPanel(null)}>
                İptal
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
