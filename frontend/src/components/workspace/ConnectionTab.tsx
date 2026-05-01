import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import type { DeviceConnection, ProjectDevice } from "../../types";
import { Modal } from "../Modal";

interface Props {
  projectId: number;
}

const SOURCE_TYPES = [
  { value: "busbar", label: "Ana Bara" },
  { value: "device", label: "Cihaz" },
];

const CONNECTION_TYPES = [
  { value: "main_to_device", label: "Ana Bara → Cihaz" },
  { value: "device_to_device", label: "Cihaz → Cihaz" },
];

const PHASES = ["L1", "L2", "L3", "N", "PE"];

function terminalLabel(pd: ProjectDevice, termId: number | null | undefined): string {
  if (termId == null) return "-";
  const term = pd.device.terminals.find((t) => t.id === termId);
  return term ? `${term.terminal_name} (${term.phase})` : String(termId);
}

function deviceLabel(devices: ProjectDevice[], id: number | null | undefined): string {
  if (id == null) return "Ana Bara";
  const pd = devices.find((d) => d.id === id);
  return pd ? pd.label : String(id);
}

interface ConnForm {
  source_type: string;
  source_device_id: number | "";
  source_terminal_id: number | "";
  target_device_id: number | "";
  target_terminal_id: number | "";
  phase: string;
  connection_type: string;
}

const EMPTY_FORM: ConnForm = {
  source_type: "busbar",
  source_device_id: "",
  source_terminal_id: "",
  target_device_id: "",
  target_terminal_id: "",
  phase: "L1",
  connection_type: "main_to_device",
};

export function ConnectionTab({ projectId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmAuto, setConfirmAuto] = useState(false);
  const [form, setForm] = useState<ConnForm>(EMPTY_FORM);

  const connectionsQ = useQuery({
    queryKey: ["connections", projectId],
    queryFn: () => client.listConnections(projectId),
  });

  const devicesQ = useQuery({
    queryKey: ["project-devices", projectId],
    queryFn: () => client.listProjectDevices(projectId),
  });

  const createMut = useMutation({
    mutationFn: () =>
      client.createConnection(projectId, {
        source_type: form.source_type,
        source_device_id: form.source_type === "device" && form.source_device_id !== "" ? Number(form.source_device_id) : null,
        source_terminal_id: form.source_type === "device" && form.source_terminal_id !== "" ? Number(form.source_terminal_id) : null,
        target_device_id: Number(form.target_device_id),
        target_terminal_id: Number(form.target_terminal_id),
        phase: form.phase,
        connection_type: form.connection_type,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections", projectId] });
      setOpen(false);
      setForm(EMPTY_FORM);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (connId: number) => client.deleteConnection(projectId, connId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["connections", projectId] }),
  });

  const autoMut = useMutation({
    mutationFn: () => client.autoAssignConnections(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections", projectId] });
      setConfirmAuto(false);
    },
  });

  const devices = devicesQ.data ?? [];
  const connections = connectionsQ.data ?? [];

  const sourceDevice = form.source_device_id !== "" ? devices.find((d) => d.id === Number(form.source_device_id)) : undefined;
  const targetDevice = form.target_device_id !== "" ? devices.find((d) => d.id === Number(form.target_device_id)) : undefined;

  const canSubmit =
    form.target_device_id !== "" &&
    form.target_terminal_id !== "" &&
    (form.source_type === "busbar" ||
      (form.source_device_id !== "" && form.source_terminal_id !== ""));

  return (
    <div className="stack">
      <section className="table-card">
        <div className="section-header">
          <h3 style={{ margin: 0 }}>Bağlantı Tanımları</h3>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {connections.length > 0 && (
              <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                Explicit yönlendirme aktif — {connections.length} bağlantı
              </span>
            )}
            <button
              type="button"
              className="ghost"
              onClick={() => setConfirmAuto(true)}
              title="Cihazların terminallerini faz eşleştirmesiyle otomatik ata"
            >
              ⚡ Otomatik Ata
            </button>
            <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
              + Bağlantı Ekle
            </button>
          </div>
        </div>

        {connections.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: "1rem 0" }}>
            Henüz bağlantı tanımı yok. Bağlantı eklenmezse hesaplama terminal faz eşleştirmesi
            (otomatik) kullanır.
          </p>
        ) : (
          <table className="data-table" style={{ marginTop: "0.75rem" }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Kaynak</th>
                <th>Hedef Cihaz</th>
                <th>Hedef Terminal</th>
                <th>Faz</th>
                <th>Tür</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {connections.map((c: DeviceConnection) => {
                const tgt = devices.find((d) => d.id === c.target_device_id);
                return (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>
                      {c.source_type === "busbar"
                        ? "Ana Bara"
                        : deviceLabel(devices, c.source_device_id)}
                    </td>
                    <td>{tgt?.label ?? c.target_device_id}</td>
                    <td>
                      {tgt ? terminalLabel(tgt, c.target_terminal_id) : c.target_terminal_id}
                    </td>
                    <td>
                      <span className={`phase-badge phase-${c.phase.toLowerCase()}`}>{c.phase}</span>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                      {c.connection_type === "main_to_device" ? "Ana→Cihaz" : "Cihaz→Cihaz"}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-danger-sm"
                        onClick={() => deleteMut.mutate(c.id)}
                        title="Sil"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Add connection modal */}
      <Modal open={open} onClose={() => { setOpen(false); setForm(EMPTY_FORM); }} title="Bağlantı Ekle">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {/* Connection type */}
          <label className="form-label">
            Bağlantı Türü
            <select
              className="form-input"
              value={form.connection_type}
              onChange={(e) => setForm((f) => ({ ...f, connection_type: e.target.value }))}
            >
              {CONNECTION_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>{ct.label}</option>
              ))}
            </select>
          </label>

          {/* Phase */}
          <label className="form-label">
            Faz
            <select
              className="form-input"
              value={form.phase}
              onChange={(e) => setForm((f) => ({ ...f, phase: e.target.value }))}
            >
              {PHASES.map((ph) => (
                <option key={ph} value={ph}>{ph}</option>
              ))}
            </select>
          </label>

          {/* Source */}
          <label className="form-label">
            Kaynak Türü
            <select
              className="form-input"
              value={form.source_type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  source_type: e.target.value,
                  source_device_id: "",
                  source_terminal_id: "",
                }))
              }
            >
              {SOURCE_TYPES.map((st) => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </label>

          {form.source_type === "device" && (
            <>
              <label className="form-label">
                Kaynak Cihaz
                <select
                  className="form-input"
                  value={form.source_device_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, source_device_id: e.target.value === "" ? "" : Number(e.target.value), source_terminal_id: "" }))
                  }
                >
                  <option value="">— Seçin —</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.label} ({d.device.brand} {d.device.model})</option>
                  ))}
                </select>
              </label>
              {sourceDevice && (
                <label className="form-label">
                  Kaynak Terminal
                  <select
                    className="form-input"
                    value={form.source_terminal_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, source_terminal_id: e.target.value === "" ? "" : Number(e.target.value) }))
                    }
                  >
                    <option value="">— Seçin —</option>
                    {sourceDevice.device.terminals.map((t) => {
                      const meta = [t.phase, t.terminal_role, t.terminal_group].filter(Boolean).join(" · ");
                      return <option key={t.id} value={t.id}>{t.terminal_name} ({meta})</option>;
                    })}
                  </select>
                </label>
              )}
            </>
          )}

          <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "0.2rem 0" }} />

          {/* Target */}
          <label className="form-label">
            Hedef Cihaz
            <select
              className="form-input"
              value={form.target_device_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, target_device_id: e.target.value === "" ? "" : Number(e.target.value), target_terminal_id: "" }))
              }
            >
              <option value="">— Seçin —</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>{d.label} ({d.device.brand} {d.device.model})</option>
              ))}
            </select>
          </label>

          {targetDevice && (
            <label className="form-label">
              Hedef Terminal
              <select
                className="form-input"
                value={form.target_terminal_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, target_terminal_id: e.target.value === "" ? "" : Number(e.target.value) }))
                }
              >
                <option value="">— Seçin —</option>
                {targetDevice.device.terminals.map((t) => {
                  const meta = [t.phase, t.terminal_role, t.terminal_group].filter(Boolean).join(" · ");
                  return <option key={t.id} value={t.id}>{t.terminal_name} ({meta})</option>;
                })}
              </select>
            </label>
          )}

          {createMut.isError && (
            <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.85rem" }}>
              Hata oluştu. Lütfen tekrar deneyin.
            </p>
          )}

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="ghost" onClick={() => { setOpen(false); setForm(EMPTY_FORM); }}>
              İptal
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!canSubmit || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? "Ekleniyor…" : "Ekle"}
            </button>
          </div>
        </div>
      </Modal>
      {/* Auto-assign confirmation modal */}
      <Modal
        open={confirmAuto}
        onClose={() => setConfirmAuto(false)}
        title="Otomatik Ata — Onayla"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Mevcut tüm bağlantılar silinecek ve cihaz terminallerinden faz eşleştirmesiyle
            otomatik olarak yeniden oluşturulacak.
          </p>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>
            Devam etmek istiyor musunuz?
          </p>
          {autoMut.isError && (
            <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.85rem" }}>
              İşlem başarısız. Lütfen tekrar deneyin.
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="ghost"
              onClick={() => setConfirmAuto(false)}
              disabled={autoMut.isPending}
            >
              İptal
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={autoMut.isPending}
              onClick={() => autoMut.mutate()}
            >
              {autoMut.isPending ? "Atanıyor…" : "Onayla"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
