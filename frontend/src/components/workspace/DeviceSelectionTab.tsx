import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import type { Device, ProjectDevice, ProjectPanel } from "../../types";
import { ConfirmModal } from "../ConfirmModal";
import { Modal } from "../Modal";
import { LibraryPickerModal } from "./LibraryPickerModal";
import { TechnicalDrawingView } from "./TechnicalDrawingView";

interface DeviceSelectionTabProps {
  projectId: number;
}

// Hangi adımda olduğumuzu tutan tip
type ConfigStep = "pick-cabinet" | "enter-coords";

export function DeviceSelectionTab({ projectId }: DeviceSelectionTabProps) {
  const queryClient = useQueryClient();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedDevice, setPickedDevice] = useState<Device | null>(null);
  const [editingDevice, setEditingDevice] = useState<ProjectDevice | null>(null);
  const [configStep, setConfigStep] = useState<ConfigStep>("pick-cabinet");

  // Config form fields
  const [selectedPanel, setSelectedPanel] = useState<ProjectPanel | null>(null);
  const [configLabel, setConfigLabel] = useState("");
  const [configX, setConfigX] = useState(0);   // mm, soldan
  const [configY, setConfigY] = useState(0);   // mm, alttan
  const [configZ, setConfigZ] = useState(0);   // mm, derinlik (ön yüzeyden)
  const [configRotation, setConfigRotation] = useState(0);
  const [configQuantity, setConfigQuantity] = useState(1);
  const [confirmPending, setConfirmPending] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const panelQuery = useQuery({
    queryKey: ["panel", projectId],
    queryFn: () => client.getPanel(projectId),
  });

  const projectPanelsQuery = useQuery({
    queryKey: ["project-panels", projectId],
    queryFn: () => client.listProjectPanels(projectId),
  });

  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: () => client.listDevices(),
  });

  const projectDevicesQuery = useQuery({
    queryKey: ["project-devices", projectId],
    queryFn: () => client.listProjectDevices(projectId),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: (payload: Omit<ProjectDevice, "id" | "project_id" | "device">) =>
      client.createProjectDevice(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-devices", projectId] });
      closeConfig();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Omit<ProjectDevice, "id" | "project_id" | "device">;
    }) => client.updateProjectDevice(projectId, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-devices", projectId] });
      closeConfig();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => client.deleteProjectDevice(projectId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-devices", projectId] }),
  });

  // ── Data ──────────────────────────────────────────────────────────────────────
  const panel = panelQuery.data ?? null;
  const projectPanels = projectPanelsQuery.data ?? [];
  const allDevices = devicesQuery.data ?? [];
  const placed = projectDevicesQuery.data ?? [];

  // ── Helpers ───────────────────────────────────────────────────────────────────
  function closeConfig() {
    setPickedDevice(null);
    setEditingDevice(null);
    setSelectedPanel(null);
    setConfigStep("pick-cabinet");
  }

  function openAddFlow(device: Device) {
    setPickedDevice(device);
    setConfigLabel(`${device.brand}_${device.model}`);
    setConfigX(0);
    setConfigY(0);
    setConfigZ(0);
    setConfigRotation(0);
    setConfigQuantity(1);
    setSelectedPanel(projectPanels.length === 1 ? projectPanels[0] : null);
    setConfigStep(projectPanels.length === 1 ? "enter-coords" : "pick-cabinet");
  }

  function openEditFlow(pd: ProjectDevice) {
    const panel = projectPanels.find((p) => p.id === pd.project_panel_id) ?? null;
    setEditingDevice(pd);
    setSelectedPanel(panel);
    setConfigLabel(pd.label);
    setConfigX(pd.x_mm);
    setConfigY(pd.y_mm);
    setConfigZ(pd.z_mm ?? 0);
    setConfigRotation(pd.rotation_deg);
    setConfigQuantity(pd.quantity);
    setConfigStep("enter-coords");
  }

  function handleCabinetSelect(pp: ProjectPanel) {
    setSelectedPanel(pp);
    setConfigStep("enter-coords");
  }

  function handleAdd() {
    if (!pickedDevice || !selectedPanel) return;
    addMutation.mutate({
      project_panel_id: selectedPanel.id,
      device_id: pickedDevice.id,
      label: configLabel,
      x_mm: configX,
      y_mm: configY,
      z_mm: configZ,
      rotation_deg: configRotation,
      quantity: configQuantity,
    });
  }

  function handleUpdate() {
    if (!editingDevice || !selectedPanel) return;
    updateMutation.mutate({
      id: editingDevice.id,
      payload: {
        project_panel_id: selectedPanel.id,
        device_id: editingDevice.device_id,
        label: configLabel,
        x_mm: configX,
        y_mm: configY,
        z_mm: configZ,
        rotation_deg: configRotation,
        quantity: configQuantity,
      },
    });
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  const isConfigOpen = !!pickedDevice || !!editingDevice;
  const activeDevice = pickedDevice ?? editingDevice?.device ?? null;

  function cabinetLabel(pp: ProjectPanel) {
    const name = pp.label ?? pp.panel_definition.name;
    return `Kabin ${pp.seq} — ${name} (${pp.panel_definition.width_mm} × ${pp.panel_definition.height_mm} mm)`;
  }

  function panelLabelForDevice(pd: ProjectDevice) {
    const pp = projectPanels.find((p) => p.id === pd.project_panel_id);
    if (!pp) return "—";
    return `Kabin ${pp.seq} — ${pp.label ?? pp.panel_definition.name}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="stack">
      {/* ── Device table ── */}
      <section className="table-card">
        <div className="section-header">
          <h3>Yerleştirilen Cihazlar</h3>
          <button type="button" className="btn-primary" onClick={() => setPickerOpen(true)}>
            + Cihaz Ekle
          </button>
        </div>

        {placed.length === 0 ? (
          <p className="empty-state">Henüz cihaz eklenmedi.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Kabin</th>
                <th>Etiket</th>
                <th>Marka / Model</th>
                <th>X (mm)</th>
                <th>Y (mm)</th>
                <th>Dönüş</th>
                <th>Adet</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {placed.map((pd) => (
                <tr key={pd.id}>
                  <td style={{ fontWeight: 600, color: "var(--accent)" }}>{panelLabelForDevice(pd)}</td>
                  <td style={{ fontWeight: 600 }}>{pd.label}</td>
                  <td>{pd.device.brand} {pd.device.model}</td>
                  <td>{pd.x_mm}</td>
                  <td>{pd.y_mm}</td>
                  <td>{pd.rotation_deg}°</td>
                  <td>{pd.quantity}</td>
                  <td className="actions-cell">
                    <button type="button" className="ghost" onClick={() => openEditFlow(pd)}>
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      disabled={deleteMutation.isPending}
                      onClick={() =>
                        setConfirmPending({
                          message: `"${pd.label}" cihazını yerleşimden kaldırmak istediğinizden emin misiniz?`,
                          onConfirm: () => { deleteMutation.mutate(pd.id); setConfirmPending(null); },
                        })
                      }
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

      {/* ── Teknik Resim Görünümü (Ön + Yan + Üst) ── */}
      <TechnicalDrawingView panel={panel} projectPanels={projectPanels} devices={placed} />

      {/* ── Step 1: pick device from library ── */}
      <LibraryPickerModal
        open={pickerOpen}
        title="Cihaz Kütüphanesi"
        items={allDevices}
        searchPlaceholder="Marka, model veya tip ara..."
        getSearchText={(d) => `${d.brand} ${d.model} ${d.device_type}`}
        renderRow={(d) => (
          <>
            <td style={{ fontWeight: 500 }}>{d.brand} {d.model}</td>
            <td>{d.device_type}</td>
            <td>{d.poles}P {d.current_a ? `${d.current_a}A` : ""}</td>
            <td style={{ color: "var(--color-muted)", fontSize: "0.8rem" }}>{d.width_mm}×{d.height_mm} mm</td>
          </>
        )}
        onSelect={(dev) => {
          setPickerOpen(false);
          openAddFlow(dev);
        }}
        onClose={() => setPickerOpen(false)}
      />

      {/* ── Config modal (2-step: cabinet → coords) ── */}
      <Modal
        title={
          configStep === "pick-cabinet"
            ? `Hangi Kabine? — ${activeDevice ? `${activeDevice.brand} ${activeDevice.model}` : ""}`
            : `Koordinat Gir — ${selectedPanel ? cabinetLabel(selectedPanel) : ""}`
        }
        open={isConfigOpen}
        onClose={closeConfig}
      >
        <div className="modal-body">
          {/* Device info line */}
          {activeDevice && (
            <p style={{ marginBottom: "0.75rem", color: "var(--color-muted)", fontSize: "0.9rem" }}>
              <strong style={{ color: "var(--text)" }}>
                {activeDevice.brand} {activeDevice.model}
              </strong>{" "}
              — {activeDevice.device_type}, {activeDevice.poles}P
              {activeDevice.current_a ? `, ${activeDevice.current_a}A` : ""}
              &ensp;|&ensp;{activeDevice.width_mm} × {activeDevice.height_mm} mm
            </p>
          )}

          {/* ── Step A: Cabinet selection ── */}
          {configStep === "pick-cabinet" && (
            <>
              <p style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "var(--muted)" }}>
                Cihazı yerleştireceğiniz kabini seçin:
              </p>
              <div className="stack" style={{ gap: "0.5rem" }}>
                {projectPanels.map((pp) => (
                  <button
                    key={pp.id}
                    type="button"
                    style={{
                      background: "rgba(255,138,61,0.08)",
                      border: "1px solid rgba(255,138,61,0.3)",
                      borderRadius: "12px",
                      padding: "0.85rem 1.2rem",
                      textAlign: "left",
                      color: "var(--text)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                    onClick={() => handleCabinetSelect(pp)}
                  >
                    <span
                      style={{
                        background: "#1a1a1a",
                        color: "white",
                        borderRadius: "50%",
                        width: "28px",
                        height: "28px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                        flexShrink: 0,
                      }}
                    >
                      {pp.seq}
                    </span>
                    <span>
                      <strong>{pp.label ?? pp.panel_definition.name}</strong>
                      <span style={{ color: "var(--muted)", marginLeft: "0.5rem", fontSize: "0.85rem" }}>
                        {pp.panel_definition.name !== (pp.label ?? "") && (
                          <span style={{ marginRight: "0.4rem", fontStyle: "italic" }}>
                            ({pp.panel_definition.name})
                          </span>
                        )}
                        {pp.panel_definition.width_mm} × {pp.panel_definition.height_mm} mm
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="form-actions">
                <button type="button" className="ghost" onClick={closeConfig}>İptal</button>
              </div>
            </>
          )}

          {/* ── Step B: Coordinate entry ── */}
          {configStep === "enter-coords" && selectedPanel && (
            <>
              {/* Coord system hint */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.45rem 0.75rem",
                  marginBottom: "1rem",
                  background: "rgba(255,138,61,0.08)",
                  border: "1px solid rgba(255,138,61,0.25)",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  color: "#ffd4a6",
                }}
              >
                <span>📐</span>
                <span>
                  <strong>X</strong> = cihaz yatay merkezi &nbsp;·&nbsp;
                  <strong>Y=0</strong> = alt iç kenar (zemin) &nbsp;·&nbsp;
                  <strong>Kabin {selectedPanel.seq}</strong>
                </span>
                {/* Back button if multiple cabinets */}
                {projectPanels.length > 1 && (
                  <button
                    type="button"
                    className="ghost"
                    style={{ marginLeft: "auto", padding: "0.15rem 0.5rem", fontSize: "0.8rem" }}
                    onClick={() => setConfigStep("pick-cabinet")}
                  >
                    ← Kabini Değiştir
                  </button>
                )}
              </div>

              <div className="form-grid">
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Etiket</span>
                  <input
                    className="input"
                    value={configLabel}
                    onChange={(e) => setConfigLabel(e.target.value)}
                  />
                </label>

                <label className="field">
                  <span>X — Yatay merkez (mm)</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={1}
                    value={configX}
                    onChange={(e) => setConfigX(Number(e.target.value))}
                  />
                </label>

                <label className="field">
                  <span>Y — Alttan mesafe (mm)</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={1}
                    value={configY}
                    onChange={(e) => setConfigY(Number(e.target.value))}
                  />
                </label>

                <label className="field">
                  <span>Z — Derinlik (mm, ön yüzeyden)</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step={1}
                    value={configZ}
                    onChange={(e) => setConfigZ(Number(e.target.value))}
                  />
                </label>

                <label className="field">
                  <span>Dönüş</span>
                  <select
                    className="input"
                    value={configRotation}
                    onChange={(e) => setConfigRotation(Number(e.target.value))}
                  >
                    <option value={0}>0°</option>
                    <option value={90}>90°</option>
                    <option value={180}>180°</option>
                    <option value={270}>270°</option>
                  </select>
                </label>

                <label className="field">
                  <span>Adet</span>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    step={1}
                    value={configQuantity}
                    onChange={(e) => setConfigQuantity(Math.max(1, Number(e.target.value)))}
                  />
                </label>
              </div>

              <div className="form-actions">
                {pickedDevice ? (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!configLabel.trim() || addMutation.isPending}
                    onClick={handleAdd}
                  >
                    {addMutation.isPending ? "Ekleniyor..." : "Kabin İçine Yerleştir"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!configLabel.trim() || updateMutation.isPending}
                    onClick={handleUpdate}
                  >
                    {updateMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                )}
                <button type="button" className="ghost" onClick={closeConfig}>
                  İptal
                </button>
              </div>
            </>
          )}
        </div>
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
