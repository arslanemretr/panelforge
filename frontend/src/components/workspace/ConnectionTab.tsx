import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import type { CopperDefinition, CopperSettings, DeviceConnection, ProjectDevice } from "../../types";
import { ConfirmModal } from "../ConfirmModal";
import { Modal } from "../Modal";

interface Props {
  projectId: number;
}

const PHASES = ["L1", "L2", "L3", "N", "PE"];

interface ConnectionForm {
  source_type: string;
  source_device_id: number | "";
  source_terminal_id: number | "";
  target_device_id: number | "";
  target_terminal_id: number | "";
  phase: string;
  connection_type: string;
}

const EMPTY_FORM: ConnectionForm = {
  source_type: "busbar",
  source_device_id: "",
  source_terminal_id: "",
  target_device_id: "",
  target_terminal_id: "",
  phase: "L1",
  connection_type: "main_to_device",
};

function terminalLabel(device: ProjectDevice | undefined, terminalId: number | null | undefined): string {
  if (!device || terminalId == null) return "-";
  const terminal = device.device.terminals.find((item) => item.id === terminalId);
  return terminal ? `${terminal.terminal_name} (${terminal.phase})` : String(terminalId);
}

function toNumber(value?: number | null): number {
  return value == null ? 0 : Number(value);
}

function applyBranchDefinition(definition: CopperDefinition, current: CopperSettings): CopperSettings {
  return {
    ...current,
    branch_copper_definition_id: definition.id,
    branch_width_mm: definition.branch_width_mm ?? current.branch_width_mm ?? null,
    branch_thickness_mm: definition.branch_thickness_mm ?? current.branch_thickness_mm ?? null,
    branch_material: definition.branch_material ?? current.branch_material ?? "Cu",
    bend_inner_radius_mm: definition.bend_inner_radius_mm ?? current.bend_inner_radius_mm ?? null,
    min_hole_edge_distance_mm: definition.min_hole_edge_distance_mm ?? current.min_hole_edge_distance_mm ?? null,
    min_bend_hole_distance_mm: definition.min_bend_hole_distance_mm ?? current.min_bend_hole_distance_mm ?? null,
    default_hole_diameter_mm: definition.default_hole_diameter_mm ?? current.default_hole_diameter_mm ?? null,
    use_slot_holes: definition.use_slot_holes,
    slot_width_mm: definition.slot_width_mm ?? current.slot_width_mm ?? null,
    slot_length_mm: definition.slot_length_mm ?? current.slot_length_mm ?? null,
  };
}

export function ConnectionTab({ projectId }: Props) {
  const queryClient = useQueryClient();
  const [confirmAuto, setConfirmAuto] = useState(false);
  const [confirmPending, setConfirmPending] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [editConnection, setEditConnection] = useState<DeviceConnection | null>(null);
  const [form, setForm] = useState<ConnectionForm>(EMPTY_FORM);
  const [branchDraft, setBranchDraft] = useState<CopperSettings>({ main_material: "Cu", branch_material: "Cu", use_slot_holes: false });

  const connectionsQuery = useQuery({
    queryKey: ["connections", projectId],
    queryFn: () => client.listConnections(projectId),
  });

  const devicesQuery = useQuery({
    queryKey: ["project-devices", projectId],
    queryFn: () => client.listProjectDevices(projectId),
  });

  const settingsQuery = useQuery({
    queryKey: ["copper-settings", projectId],
    queryFn: () => client.getCopperSettings(projectId),
  });

  const branchDefinitionsQuery = useQuery({
    queryKey: ["copper-definitions", "branch"],
    queryFn: () => client.listCopperDefinitions("branch"),
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setBranchDraft(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  const saveBranchMutation = useMutation({
    mutationFn: (payload: CopperSettings) => client.upsertCopperSettings(projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["copper-settings", projectId] });
    },
  });

  const autoAssignMutation = useMutation({
    mutationFn: () => client.autoAssignConnections(projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["connections", projectId] });
      setConfirmAuto(false);
    },
  });

  const updateConnectionMutation = useMutation({
    mutationFn: () =>
      client.updateConnection(projectId, editConnection!.id, {
        source_type: form.source_type,
        source_device_id: form.source_type === "device" && form.source_device_id !== "" ? Number(form.source_device_id) : null,
        source_terminal_id: form.source_type === "device" && form.source_terminal_id !== "" ? Number(form.source_terminal_id) : null,
        target_device_id: Number(form.target_device_id),
        target_terminal_id: Number(form.target_terminal_id),
        phase: form.phase,
        connection_type: form.connection_type,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["connections", projectId] });
      setEditConnection(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (connectionId: number) => client.deleteConnection(projectId, connectionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["connections", projectId] });
    },
  });

  const devices = devicesQuery.data ?? [];
  const connections = connectionsQuery.data ?? [];
  const branchDefinitions = branchDefinitionsQuery.data ?? [];

  const sourceDevice = form.source_device_id !== "" ? devices.find((item) => item.id === Number(form.source_device_id)) : undefined;
  const targetDevice = form.target_device_id !== "" ? devices.find((item) => item.id === Number(form.target_device_id)) : undefined;

  const selectedBranchDefinition = useMemo(
    () => branchDefinitions.find((item) => item.id === branchDraft.branch_copper_definition_id) ?? null,
    [branchDefinitions, branchDraft.branch_copper_definition_id],
  );

  const connectionSummary = useMemo(() => {
    const perPhase = PHASES.map((phase) => ({
      phase,
      count: connections.filter((item) => item.phase === phase).length,
    })).filter((item) => item.count > 0);
    return {
      total: connections.length,
      perPhase,
    };
  }, [connections]);

  function openEdit(connection: DeviceConnection) {
    setEditConnection(connection);
    setForm({
      source_type: connection.source_type,
      source_device_id: connection.source_device_id ?? "",
      source_terminal_id: connection.source_terminal_id ?? "",
      target_device_id: connection.target_device_id,
      target_terminal_id: connection.target_terminal_id,
      phase: connection.phase,
      connection_type: connection.connection_type,
    });
  }

  function handleBranchDefinitionChange(definitionId: number) {
    const definition = branchDefinitions.find((item) => item.id === definitionId);
    if (!definition) {
      return;
    }
    setBranchDraft((current) => applyBranchDefinition(definition, current));
  }

  function updateBranchField<K extends keyof CopperSettings>(key: K, value: CopperSettings[K]) {
    setBranchDraft((current) => ({ ...current, [key]: value }));
  }

  const canSaveConnection =
    form.target_device_id !== "" &&
    form.target_terminal_id !== "" &&
    (form.source_type === "busbar" || (form.source_device_id !== "" && form.source_terminal_id !== ""));

  return (
    <div className="stack">
      <section className="table-card">
        <div className="section-header">
          <h3 style={{ margin: 0 }}>Tali Bakir Secimi</h3>
          <span className="helper-text" style={{ fontSize: "0.82rem" }}>
            Tum tali baglantilar ayni bakir standardi ile uretilecek. Bu ekran ayni zamanda hangi terminalden iniş yapilacagini gosterir.
          </span>
        </div>

        <div className="form-grid" style={{ marginTop: "1rem" }}>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Tali Bakir Tanimi</span>
            <select
              className="input"
              value={branchDraft.branch_copper_definition_id ?? ""}
              onChange={(event) => handleBranchDefinitionChange(Number(event.target.value))}
            >
              <option value="">- Secin -</option>
              {branchDefinitions.map((definition) => (
                <option key={definition.id} value={definition.id}>
                  {definition.name} - {definition.branch_width_mm ?? "?"} x {definition.branch_thickness_mm ?? "?"} mm
                </option>
              ))}
            </select>
          </label>
          <label className="field"><span>Genislik (mm)</span><input className="input" type="number" value={toNumber(branchDraft.branch_width_mm)} onChange={(e) => updateBranchField("branch_width_mm", Number(e.target.value))} /></label>
          <label className="field"><span>Kalinlik (mm)</span><input className="input" type="number" value={toNumber(branchDraft.branch_thickness_mm)} onChange={(e) => updateBranchField("branch_thickness_mm", Number(e.target.value))} /></label>
          <label className="field"><span>Malzeme</span><select className="input" value={branchDraft.branch_material ?? "Cu"} onChange={(e) => updateBranchField("branch_material", e.target.value)}><option value="Cu">Cu</option><option value="Al">Al</option></select></label>
          <label className="field"><span>Delik Capi (mm)</span><input className="input" type="number" value={toNumber(branchDraft.default_hole_diameter_mm)} onChange={(e) => updateBranchField("default_hole_diameter_mm", Number(e.target.value))} /></label>
          <label className="field"><span>Bukum Ic R (mm)</span><input className="input" type="number" value={toNumber(branchDraft.bend_inner_radius_mm)} onChange={(e) => updateBranchField("bend_inner_radius_mm", Number(e.target.value))} /></label>
          <label className="field"><span>Min Delik Kenar (mm)</span><input className="input" type="number" value={toNumber(branchDraft.min_hole_edge_distance_mm)} onChange={(e) => updateBranchField("min_hole_edge_distance_mm", Number(e.target.value))} /></label>
          <label className="field"><span>Min Delik-Bukum (mm)</span><input className="input" type="number" value={toNumber(branchDraft.min_bend_hole_distance_mm)} onChange={(e) => updateBranchField("min_bend_hole_distance_mm", Number(e.target.value))} /></label>
        </div>

        <div className="form-actions" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="btn-primary"
            disabled={!branchDraft.branch_width_mm || !branchDraft.branch_thickness_mm || saveBranchMutation.isPending}
            onClick={() => saveBranchMutation.mutate(branchDraft)}
          >
            {saveBranchMutation.isPending ? "Kaydediliyor..." : "Tali Bakiri Kaydet"}
          </button>
          {selectedBranchDefinition && (
            <span style={{ color: "var(--muted)", fontSize: "0.85rem", alignSelf: "center" }}>
              Secili tanim: <strong style={{ color: "var(--text)" }}>{selectedBranchDefinition.name}</strong>
            </span>
          )}
        </div>
      </section>

      <section className="table-card">
        <div className="section-header">
          <h3 style={{ margin: 0 }}>Tali Baglanti Ozeti</h3>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
              Toplam {connectionSummary.total} tali bakir parcasi olusacak
            </span>
            <button type="button" className="ghost" onClick={() => setConfirmAuto(true)}>
              Otomatik Listele
            </button>
          </div>
        </div>

        {!!connectionSummary.perPhase.length && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", margin: "0.9rem 0" }}>
            {connectionSummary.perPhase.map((item) => (
              <span key={item.phase} className={`phase-badge phase-${item.phase.toLowerCase()}`}>
                {item.phase}: {item.count}
              </span>
            ))}
          </div>
        )}

        {connections.length === 0 ? (
          <div className="empty-state">
            Baglanti listesi henuz olusmadi. "Otomatik Listele" ile ana bakirdan inen tali baglantilari uretin.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Kaynak</th>
                  <th>Hedef Cihaz</th>
                  <th>Hedef Terminal</th>
                  <th>Faz</th>
                  <th>Tur</th>
                  <th>Islem</th>
                </tr>
              </thead>
              <tbody>
                {connections.map((connection) => {
                  const target = devices.find((item) => item.id === connection.target_device_id);
                  const source = devices.find((item) => item.id === connection.source_device_id);
                  return (
                    <tr key={connection.id}>
                      <td>{connection.id}</td>
                      <td>{connection.source_type === "busbar" ? "Ana Bakir" : source?.label ?? connection.source_device_id}</td>
                      <td>{target?.label ?? connection.target_device_id}</td>
                      <td>{terminalLabel(target, connection.target_terminal_id)}</td>
                      <td><span className={`phase-badge phase-${connection.phase.toLowerCase()}`}>{connection.phase}</span></td>
                      <td>{connection.connection_type === "main_to_device" ? "Ana→Cihaz" : "Cihaz→Cihaz"}</td>
                      <td className="actions-cell">
                        <button type="button" className="ghost" onClick={() => openEdit(connection)}>Duzenle</button>
                        <button
                          type="button"
                          className="ghost danger"
                          onClick={() =>
                            setConfirmPending({
                              message: "Bu tali baglantiyi silmek istediginizden emin misiniz?",
                              onConfirm: () => {
                                deleteMutation.mutate(connection.id);
                                setConfirmPending(null);
                              },
                            })
                          }
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal open={editConnection !== null} onClose={() => setEditConnection(null)} title="Tali Baglanti Duzenle">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <label className="form-label">
            Faz
            <select className="form-input" value={form.phase} onChange={(e) => setForm((current) => ({ ...current, phase: e.target.value }))}>
              {PHASES.map((phase) => (
                <option key={phase} value={phase}>{phase}</option>
              ))}
            </select>
          </label>

          <label className="form-label">
            Kaynak Turu
            <select
              className="form-input"
              value={form.source_type}
              onChange={(e) => setForm((current) => ({ ...current, source_type: e.target.value, source_device_id: "", source_terminal_id: "" }))}
            >
              <option value="busbar">Ana Bakir</option>
              <option value="device">Cihaz</option>
            </select>
          </label>

          {form.source_type === "device" && (
            <>
              <label className="form-label">
                Kaynak Cihaz
                <select
                  className="form-input"
                  value={form.source_device_id}
                  onChange={(e) => setForm((current) => ({ ...current, source_device_id: e.target.value === "" ? "" : Number(e.target.value), source_terminal_id: "" }))}
                >
                  <option value="">- Secin -</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>{device.label}</option>
                  ))}
                </select>
              </label>
              {sourceDevice && (
                <label className="form-label">
                  Kaynak Terminal
                  <select
                    className="form-input"
                    value={form.source_terminal_id}
                    onChange={(e) => setForm((current) => ({ ...current, source_terminal_id: e.target.value === "" ? "" : Number(e.target.value) }))}
                  >
                    <option value="">- Secin -</option>
                    {sourceDevice.device.terminals.map((terminal) => (
                      <option key={terminal.id} value={terminal.id}>{terminal.terminal_name} ({terminal.phase})</option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}

          <label className="form-label">
            Hedef Cihaz
            <select
              className="form-input"
              value={form.target_device_id}
              onChange={(e) => setForm((current) => ({ ...current, target_device_id: e.target.value === "" ? "" : Number(e.target.value), target_terminal_id: "" }))}
            >
              <option value="">- Secin -</option>
              {devices.map((device) => (
                <option key={device.id} value={device.id}>{device.label}</option>
              ))}
            </select>
          </label>

          {targetDevice && (
            <label className="form-label">
              Hedef Terminal
              <select
                className="form-input"
                value={form.target_terminal_id}
                onChange={(e) => setForm((current) => ({ ...current, target_terminal_id: e.target.value === "" ? "" : Number(e.target.value) }))}
              >
                <option value="">- Secin -</option>
                {targetDevice.device.terminals.map((terminal) => (
                  <option key={terminal.id} value={terminal.id}>{terminal.terminal_name} ({terminal.phase})</option>
                ))}
              </select>
            </label>
          )}

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="ghost" onClick={() => setEditConnection(null)}>
              Iptal
            </button>
            <button type="button" className="btn-primary" disabled={!canSaveConnection || updateConnectionMutation.isPending} onClick={() => updateConnectionMutation.mutate()}>
              {updateConnectionMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmAuto} onClose={() => setConfirmAuto(false)} title="Otomatik Baglanti Listesi">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Mevcut baglanti satirlari temizlenecek ve cihaz terminallerinin faz bilgilerine gore ana bakirdan inen tali baglantilar yeniden olusturulacak.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button type="button" className="ghost" onClick={() => setConfirmAuto(false)}>
              Iptal
            </button>
            <button type="button" className="btn-primary" disabled={autoAssignMutation.isPending} onClick={() => autoAssignMutation.mutate()}>
              {autoAssignMutation.isPending ? "Olusturuluyor..." : "Onayla"}
            </button>
          </div>
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
