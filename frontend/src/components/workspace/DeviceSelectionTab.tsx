import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import type { Device, ProjectDevice, ProjectPanel } from "../../types";
import { ConfirmModal } from "../ConfirmModal";
import { Modal } from "../Modal";
import { LibraryPickerModal } from "./LibraryPickerModal";
import { DeviceOrthographicPreview } from "./DeviceOrthographicPreview";

interface DeviceSelectionTabProps {
  projectId: number;
}

// ── Draft tip ────────────────────────────────────────────────────────────────
interface DeviceDraft {
  label: string;
  project_panel_id: number | null;
  x_mm: number;
  y_mm: number;
  z_mm: number;
  rotation_deg: number;
  rotation_x_deg: number;
  rotation_y_deg: number;
  quantity: number;
}

function deviceToDraft(pd: ProjectDevice): DeviceDraft {
  return {
    label:           pd.label,
    project_panel_id: pd.project_panel_id,
    x_mm:            Number(pd.x_mm),
    y_mm:            Number(pd.y_mm),
    z_mm:            Number(pd.z_mm ?? 0),
    rotation_deg:    Number(pd.rotation_deg),
    rotation_x_deg:  Number(pd.rotation_x_deg ?? 0),
    rotation_y_deg:  Number(pd.rotation_y_deg ?? 0),
    quantity:        pd.quantity,
  };
}

// ── Ekleme adımı tipi (modal için) ───────────────────────────────────────────
type AddStep = "pick-cabinet" | "enter-coords";

export function DeviceSelectionTab({ projectId }: DeviceSelectionTabProps) {
  const queryClient = useQueryClient();

  // ── Seçim + form state ────────────────────────────────────────────────────
  const [selectedId,    setSelectedId]    = useState<number | null>(null);
  const [draft,         setDraft]         = useState<DeviceDraft | null>(null);
  const [confirmPending, setConfirmPending] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // ── Ekleme modal state ────────────────────────────────────────────────────
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [pickedDevice, setPickedDevice] = useState<Device | null>(null);
  const [addStep,      setAddStep]      = useState<AddStep>("pick-cabinet");
  const [addPanel,     setAddPanel]     = useState<ProjectPanel | null>(null);
  const [addLabel,     setAddLabel]     = useState("");
  const [addX,         setAddX]         = useState(0);
  const [addY,         setAddY]         = useState(0);
  const [addZ,         setAddZ]         = useState(0);
  const [addRotZ,      setAddRotZ]      = useState(0);
  const [addRotX,      setAddRotX]      = useState(0);
  const [addRotY,      setAddRotY]      = useState(0);
  const [addQty,       setAddQty]       = useState(1);

  // ── Queries ───────────────────────────────────────────────────────────────
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

  const panel         = panelQuery.data ?? null;
  const projectPanels = projectPanelsQuery.data ?? [];
  const allDevices    = devicesQuery.data ?? [];
  const placed        = projectDevicesQuery.data ?? [];
  const selectedDevice = placed.find((p) => p.id === selectedId) ?? null;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: (payload: Omit<ProjectDevice, "id" | "project_id" | "device">) =>
      client.createProjectDevice(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-devices", projectId] });
      closeAddModal();
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedId || !draft) throw new Error("no selection");
      return client.updateProjectDevice(projectId, selectedId, {
        project_panel_id: draft.project_panel_id,
        device_id:        selectedDevice!.device_id,
        label:            draft.label,
        x_mm:             draft.x_mm,
        y_mm:             draft.y_mm,
        z_mm:             draft.z_mm,
        rotation_deg:     draft.rotation_deg,
        rotation_x_deg:   draft.rotation_x_deg,
        rotation_y_deg:   draft.rotation_y_deg,
        quantity:         draft.quantity,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["project-devices", projectId] });
      setDraft(deviceToDraft(updated));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => client.deleteProjectDevice(projectId, id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["project-devices", projectId] });
      if (selectedId === id) { setSelectedId(null); setDraft(null); }
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  function selectRow(pd: ProjectDevice) {
    if (selectedId === pd.id) { setSelectedId(null); setDraft(null); return; }
    setSelectedId(pd.id);
    setDraft(deviceToDraft(pd));
  }

  function setD<K extends keyof DeviceDraft>(key: K, val: DeviceDraft[K]) {
    setDraft((d) => d ? { ...d, [key]: val } : d);
  }

  const isDirty = draft !== null && selectedDevice !== null
    && JSON.stringify(draft) !== JSON.stringify(deviceToDraft(selectedDevice));

  function panelLabel(pp: ProjectPanel) {
    return `Kabin ${pp.seq} — ${pp.label ?? pp.panel_definition.name} (${Number(pp.width_mm)}×${Number(pp.height_mm)} mm)`;
  }

  function panelLabelForDevice(pd: ProjectDevice) {
    const pp = projectPanels.find((p) => p.id === pd.project_panel_id);
    return pp ? `Kabin ${pp.seq} — ${pp.label ?? pp.panel_definition.name}` : "—";
  }

  // ── Add modal helpers ─────────────────────────────────────────────────────
  function openAddFlow(device: Device) {
    setPickedDevice(device);
    setAddLabel(`${device.brand}_${device.model}`);
    setAddX(0); setAddY(0); setAddZ(0);
    setAddRotZ(0); setAddRotX(0); setAddRotY(0);
    setAddQty(1);
    if (projectPanels.length === 1) {
      setAddPanel(projectPanels[0]);
      setAddStep("enter-coords");
    } else {
      setAddPanel(null);
      setAddStep("pick-cabinet");
    }
  }

  function closeAddModal() {
    setPickedDevice(null);
    setAddPanel(null);
    setAddStep("pick-cabinet");
  }

  function handleAdd() {
    if (!pickedDevice || !addPanel) return;
    addMutation.mutate({
      project_panel_id: addPanel.id,
      device_id:        pickedDevice.id,
      label:            addLabel,
      x_mm:             addX,
      y_mm:             addY,
      z_mm:             addZ,
      rotation_deg:     addRotZ,
      rotation_x_deg:   addRotX,
      rotation_y_deg:   addRotY,
      quantity:         addQty,
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "1.5rem", alignItems: "start" }}>

        {/* ──────────────── SOL KOLON ──────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* ── Cihaz tablosu ── */}
          <section className="table-card">
            <div className="section-header">
              <h3>Yerleştirilen Cihazlar</h3>
              <button type="button" className="btn-primary" onClick={() => setPickerOpen(true)}>
                + Cihaz Ekle
              </button>
            </div>

            {placed.length === 0 ? (
              <p className="empty-state">Henüz cihaz eklenmedi. "Cihaz Ekle" ile kütüphaneden cihaz seçin.</p>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kabin</th>
                    <th>Etiket</th>
                    <th>Model</th>
                    <th>X</th>
                    <th>Y</th>
                    <th>Rot.</th>
                    <th>Adet</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {placed.map((pd) => {
                    const isSelected = pd.id === selectedId;
                    return (
                      <tr
                        key={pd.id}
                        onClick={() => selectRow(pd)}
                        style={{
                          cursor: "pointer",
                          background: isSelected ? "rgba(34,211,238,0.07)" : undefined,
                          outline: isSelected ? "1px solid rgba(34,211,238,0.35)" : undefined,
                        }}
                      >
                        <td style={{ fontSize: "0.82rem", color: "var(--accent)" }}>
                          {panelLabelForDevice(pd)}
                        </td>
                        <td style={{ fontWeight: 600 }}>{pd.label}</td>
                        <td style={{ fontSize: "0.83rem" }}>{pd.device.brand} {pd.device.model}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.83rem" }}>{Number(pd.x_mm)}</td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.83rem" }}>{Number(pd.y_mm)}</td>
                        <td style={{ fontSize: "0.83rem" }}>{Number(pd.rotation_deg)}°</td>
                        <td>{pd.quantity}</td>
                        <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button" className="ghost danger"
                            disabled={deleteMutation.isPending}
                            onClick={() =>
                              setConfirmPending({
                                message: `"${pd.label}" cihazını yerleşimden kaldırmak istediğinizden emin misiniz?`,
                                onConfirm: () => { deleteMutation.mutate(pd.id); setConfirmPending(null); },
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

          {/* ── Satır içi düzenleme formu ── */}
          {draft && selectedDevice && (
            <section className="table-card">
              <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                <div>
                  <h3 style={{ margin: 0 }}>{selectedDevice.label} — Düzenle</h3>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    {selectedDevice.device.brand} {selectedDevice.device.model}
                    &ensp;·&ensp;{selectedDevice.device.width_mm} × {selectedDevice.device.height_mm} mm
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    type="button" className="btn-primary"
                    disabled={saveMutation.isPending || !isDirty}
                    onClick={() => saveMutation.mutate()}
                  >
                    {saveMutation.isPending ? "Kaydediliyor…" : "Kaydet"}
                  </button>
                  <button type="button" className="ghost" onClick={() => { setSelectedId(null); setDraft(null); }}>
                    İptal
                  </button>
                </div>
              </div>

              <div className="form-grid">
                {/* Etiket — tam genişlik */}
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Etiket</span>
                  <input className="input" value={draft.label} onChange={(e) => setD("label", e.target.value)} />
                </label>

                {/* Kabin seçimi */}
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Kabin</span>
                  <select
                    className="input"
                    value={draft.project_panel_id ?? ""}
                    onChange={(e) => setD("project_panel_id", e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">— Kabin Yok —</option>
                    {projectPanels.map((pp) => (
                      <option key={pp.id} value={pp.id}>{panelLabel(pp)}</option>
                    ))}
                  </select>
                </label>

                {/* X / Y / Z */}
                <label className="field">
                  <span>X — Yatay merkez (mm)</span>
                  <input className="input" type="number" step={1} value={draft.x_mm}
                    onChange={(e) => setD("x_mm", Number(e.target.value))} />
                </label>
                <label className="field">
                  <span>Y — Alttan mesafe (mm)</span>
                  <input className="input" type="number" step={1} value={draft.y_mm}
                    onChange={(e) => setD("y_mm", Number(e.target.value))} />
                </label>
                <label className="field">
                  <span>Z — Derinlik (mm)</span>
                  <input className="input" type="number" step={1} value={draft.z_mm}
                    onChange={(e) => setD("z_mm", Number(e.target.value))} />
                </label>

                {/* Rotasyonlar */}
                <label className="field">
                  <span>Dönüş Z (°)</span>
                  <select className="input" value={draft.rotation_deg}
                    onChange={(e) => setD("rotation_deg", Number(e.target.value))}>
                    <option value={0}>0°</option>
                    <option value={90}>90°</option>
                    <option value={180}>180°</option>
                    <option value={270}>270°</option>
                  </select>
                </label>
                <label className="field">
                  <span>Dönüş X (°)</span>
                  <input className="input" type="number" step={1} value={draft.rotation_x_deg}
                    onChange={(e) => setD("rotation_x_deg", Number(e.target.value))} />
                </label>
                <label className="field">
                  <span>Dönüş Y (°)</span>
                  <input className="input" type="number" step={1} value={draft.rotation_y_deg}
                    onChange={(e) => setD("rotation_y_deg", Number(e.target.value))} />
                </label>

                {/* Adet */}
                <label className="field">
                  <span>Adet</span>
                  <input className="input" type="number" min={1} step={1} value={draft.quantity}
                    onChange={(e) => setD("quantity", Math.max(1, Number(e.target.value)))} />
                </label>
              </div>

              {isDirty && (
                <p style={{ fontSize: "0.76rem", color: "#f59e0b", marginTop: "0.5rem" }}>
                  ● Kaydedilmemiş değişiklikler
                </p>
              )}
              {saveMutation.isError && (
                <p style={{ color: "var(--error)", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                  Kayıt sırasında hata oluştu.
                </p>
              )}
            </section>
          )}
        </div>

        {/* ──────────────── SAĞ KOLON — Ortografik Önizleme ──────────────── */}
        <div style={{ position: "sticky", top: "1rem" }}>
          <DeviceOrthographicPreview
            panel={panel}
            projectPanels={projectPanels}
            devices={placed}
            highlightId={selectedId}
          />
        </div>
      </div>

      {/* ── Cihaz kütüphane seçici ── */}
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
            <td>{d.poles}P{d.current_a ? ` ${d.current_a}A` : ""}</td>
            <td style={{ color: "var(--muted)", fontSize: "0.8rem" }}>{d.width_mm}×{d.height_mm} mm</td>
          </>
        )}
        onSelect={(dev) => { setPickerOpen(false); openAddFlow(dev); }}
        onClose={() => setPickerOpen(false)}
      />

      {/* ── Ekleme modal'ı (2 adım: kabin → koordinat) ── */}
      <Modal
        title={
          addStep === "pick-cabinet"
            ? `Hangi Kabine? — ${pickedDevice ? `${pickedDevice.brand} ${pickedDevice.model}` : ""}`
            : `Koordinat Gir — ${addPanel ? `Kabin ${addPanel.seq}` : ""}`
        }
        open={!!pickedDevice}
        onClose={closeAddModal}
      >
        <div className="modal-body">
          {pickedDevice && (
            <p style={{ marginBottom: "0.75rem", color: "var(--muted)", fontSize: "0.9rem" }}>
              <strong style={{ color: "var(--text)" }}>{pickedDevice.brand} {pickedDevice.model}</strong>
              {" "}&mdash; {pickedDevice.device_type}, {pickedDevice.poles}P
              {pickedDevice.current_a ? `, ${pickedDevice.current_a}A` : ""}
              &ensp;|&ensp;{pickedDevice.width_mm} × {pickedDevice.height_mm} mm
            </p>
          )}

          {/* Adım A: kabin seç */}
          {addStep === "pick-cabinet" && (
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
                      borderRadius: 12, padding: "0.85rem 1.2rem",
                      textAlign: "left", color: "var(--text)",
                      cursor: "pointer", display: "flex", alignItems: "center", gap: "1rem",
                    }}
                    onClick={() => { setAddPanel(pp); setAddStep("enter-coords"); }}
                  >
                    <span style={{
                      background: "#1a1a1a", color: "white", borderRadius: "50%",
                      width: 28, height: 28, display: "inline-flex", alignItems: "center",
                      justifyContent: "center", fontWeight: 700, fontSize: "0.9rem", flexShrink: 0,
                    }}>{pp.seq}</span>
                    <span>
                      <strong>{pp.label ?? pp.panel_definition.name}</strong>
                      <span style={{ color: "var(--muted)", marginLeft: "0.5rem", fontSize: "0.85rem" }}>
                        {Number(pp.width_mm)} × {Number(pp.height_mm)} mm
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              <div className="form-actions">
                <button type="button" className="ghost" onClick={closeAddModal}>İptal</button>
              </div>
            </>
          )}

          {/* Adım B: koordinat gir */}
          {addStep === "enter-coords" && addPanel && (
            <>
              <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.45rem 0.75rem", marginBottom: "1rem",
                background: "rgba(255,138,61,0.08)", border: "1px solid rgba(255,138,61,0.25)",
                borderRadius: 8, fontSize: "0.82rem", color: "#ffd4a6",
              }}>
                <span>📐</span>
                <span><strong>X</strong> = yatay merkez&nbsp;·&nbsp;<strong>Y=0</strong> = zemin&nbsp;·&nbsp;Kabin {addPanel.seq}</span>
                {projectPanels.length > 1 && (
                  <button type="button" className="ghost"
                    style={{ marginLeft: "auto", padding: "0.15rem 0.5rem", fontSize: "0.8rem" }}
                    onClick={() => setAddStep("pick-cabinet")}>
                    ← Kabini Değiştir
                  </button>
                )}
              </div>

              <div className="form-grid">
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Etiket</span>
                  <input className="input" value={addLabel} onChange={(e) => setAddLabel(e.target.value)} />
                </label>
                <label className="field">
                  <span>X (mm)</span>
                  <input className="input" type="number" min={0} step={1} value={addX} onChange={(e) => setAddX(Number(e.target.value))} />
                </label>
                <label className="field">
                  <span>Y (mm)</span>
                  <input className="input" type="number" min={0} step={1} value={addY} onChange={(e) => setAddY(Number(e.target.value))} />
                </label>
                <label className="field">
                  <span>Z (mm)</span>
                  <input className="input" type="number" min={0} step={1} value={addZ} onChange={(e) => setAddZ(Number(e.target.value))} />
                </label>
                <label className="field">
                  <span>Dönüş Z (°)</span>
                  <select className="input" value={addRotZ} onChange={(e) => setAddRotZ(Number(e.target.value))}>
                    <option value={0}>0°</option>
                    <option value={90}>90°</option>
                    <option value={180}>180°</option>
                    <option value={270}>270°</option>
                  </select>
                </label>
                <label className="field">
                  <span>Dönüş X (°)</span>
                  <input className="input" type="number" step={1} value={addRotX} onChange={(e) => setAddRotX(Number(e.target.value))} />
                </label>
                <label className="field">
                  <span>Dönüş Y (°)</span>
                  <input className="input" type="number" step={1} value={addRotY} onChange={(e) => setAddRotY(Number(e.target.value))} />
                </label>
                <label className="field">
                  <span>Adet</span>
                  <input className="input" type="number" min={1} step={1} value={addQty}
                    onChange={(e) => setAddQty(Math.max(1, Number(e.target.value)))} />
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-primary"
                  disabled={!addLabel.trim() || addMutation.isPending}
                  onClick={handleAdd}>
                  {addMutation.isPending ? "Ekleniyor..." : "Kabine Yerleştir"}
                </button>
                <button type="button" className="ghost" onClick={closeAddModal}>İptal</button>
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
