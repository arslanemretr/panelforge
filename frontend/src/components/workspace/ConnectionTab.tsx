/**
 * ConnectionTab — Tali Bakır Seçimi
 *
 * Sol kolon:
 *   - Tali Bakır Parametreleri (CopperSettings branch alanları)
 *   - Bağlantı tablosu — cihaza göre gruplandırılmış
 *     Her satırda: Faz | Terminal | Yüzey | Büküm Tipi (inline) | Tali Bakır (inline) | Sil
 *
 * Sağ kolon (sticky):
 *   - Faz dağılımı özeti
 *   - Büküm tipi kullanım özeti
 *   - Tali bakır kullanım özeti
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import type {
  BendType,
  BranchConductor,
  CopperDefinition,
  CopperSettings,
  DeviceConnection,
  ProjectDevice,
} from "../../types";
import { ConfirmModal } from "../ConfirmModal";
import { Modal } from "../Modal";

interface Props {
  projectId: number;
}

// ── Faz renkleri ─────────────────────────────────────────────────────────────
const PHASES = ["L1", "L2", "L3", "N", "PE"];
const PHASE_COLORS: Record<string, string> = {
  L1: "#e53935", L2: "#f9a825", L3: "#1565c0", N: "#616161", PE: "#388e3c",
};

// ── Yardımcılar ───────────────────────────────────────────────────────────────
function terminalLabel(device: ProjectDevice | undefined, terminalId: number): string {
  if (!device) return String(terminalId);
  const t = device.device.terminals.find((x) => x.id === terminalId);
  return t ? `${t.terminal_name} (${t.phase})` : String(terminalId);
}

function terminalFace(device: ProjectDevice | undefined, terminalId: number): string {
  if (!device) return "—";
  const t = device.device.terminals.find((x) => x.id === terminalId);
  return t?.terminal_face ?? "—";
}

function toNum(v?: number | null) { return v == null ? 0 : Number(v); }

function applyBranchDef(def: CopperDefinition, cur: CopperSettings): CopperSettings {
  return {
    ...cur,
    branch_copper_definition_id: def.id,
    branch_width_mm: def.branch_width_mm ?? cur.branch_width_mm ?? null,
    branch_thickness_mm: def.branch_thickness_mm ?? cur.branch_thickness_mm ?? null,
    branch_material: def.branch_material ?? cur.branch_material ?? "Cu",
    branch_phase_spacing_mm: def.branch_phase_spacing_mm ?? cur.branch_phase_spacing_mm ?? null,
  };
}

// ── Bağlantı formu tipi ───────────────────────────────────────────────────────
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

// ── Faz badge ─────────────────────────────────────────────────────────────────
function PhaseBadge({ phase }: { phase: string }) {
  const color = PHASE_COLORS[phase] ?? "#888";
  return (
    <span style={{
      display: "inline-block", padding: "1px 7px", borderRadius: 4,
      background: `${color}22`, color, border: `1px solid ${color}55`,
      fontWeight: 700, fontSize: "0.78rem", fontFamily: "monospace",
    }}>
      {phase}
    </span>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export function ConnectionTab({ projectId }: Props) {
  const queryClient = useQueryClient();

  const [phaseFilter, setPhaseFilter]     = useState<string>("all");
  const [addModalOpen, setAddModalOpen]   = useState(false);
  const [form, setForm]                   = useState<ConnectionForm>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number } | null>(null);
  const [confirmAuto, setConfirmAuto]     = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<CopperSettings | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const connectionsQuery = useQuery({
    queryKey: ["connections", projectId],
    queryFn: () => client.listConnections(projectId),
  });
  const devicesQuery = useQuery({
    queryKey: ["project-devices", projectId],
    queryFn: () => client.listProjectDevices(projectId),
  });
  const bendTypesQuery = useQuery({
    queryKey: ["bend-types"],
    queryFn: () => client.listBendTypes(),
  });
  const branchCondsQuery = useQuery({
    queryKey: ["branch-conductors"],
    queryFn: () => client.listBranchConductors(),
  });
  const settingsQuery = useQuery({
    queryKey: ["copper-settings", projectId],
    queryFn: () => client.getCopperSettings(projectId),
    select: (data) => {
      if (settingsDraft === null) setSettingsDraft(data);
      return data;
    },
  });
  const branchDefsQuery = useQuery({
    queryKey: ["copper-definitions", "branch"],
    queryFn: () => client.listCopperDefinitions("branch"),
  });

  const connections    = connectionsQuery.data ?? [];
  const devices        = devicesQuery.data ?? [];
  const bendTypes      = bendTypesQuery.data ?? [];
  const branchConds    = branchCondsQuery.data ?? [];
  const branchDefs     = branchDefsQuery.data ?? [];
  const settings       = settingsQuery.data ?? null;

  const invalidateConns = () => queryClient.invalidateQueries({ queryKey: ["connections", projectId] });
  const invalidateSettings = () => queryClient.invalidateQueries({ queryKey: ["copper-settings", projectId] });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: ConnectionForm) =>
      client.createConnection(projectId, {
        source_type:       payload.source_type,
        source_device_id:  payload.source_device_id !== "" ? Number(payload.source_device_id) : null,
        source_terminal_id: payload.source_terminal_id !== "" ? Number(payload.source_terminal_id) : null,
        target_device_id:  Number(payload.target_device_id),
        target_terminal_id: Number(payload.target_terminal_id),
        phase:             payload.phase,
        connection_type:   payload.connection_type,
      }),
    onSuccess: async () => { await invalidateConns(); setAddModalOpen(false); setForm(EMPTY_FORM); },
  });

  const inlineUpdateMutation = useMutation({
    mutationFn: ({
      conn,
      bend_type_id,
      branch_conductor_id,
    }: {
      conn: DeviceConnection;
      bend_type_id: number | null;
      branch_conductor_id: number | null;
    }) =>
      client.updateConnection(projectId, conn.id, {
        source_type:        conn.source_type,
        source_device_id:   conn.source_device_id,
        source_terminal_id: conn.source_terminal_id,
        target_device_id:   conn.target_device_id,
        target_terminal_id: conn.target_terminal_id,
        phase:              conn.phase,
        connection_type:    conn.connection_type,
        bend_type_id,
        branch_conductor_id,
      }),
    onSuccess: () => invalidateConns(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => client.deleteConnection(projectId, id),
    onSuccess: async () => { await invalidateConns(); setConfirmDelete(null); },
  });

  const autoMutation = useMutation({
    mutationFn: () => client.autoAssignConnections(projectId),
    onSuccess: async () => { await invalidateConns(); setConfirmAuto(false); },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: () => {
      if (!settingsDraft) throw new Error("no draft");
      return client.upsertCopperSettings(projectId, settingsDraft);
    },
    onSuccess: () => invalidateSettings(),
  });

  // ── Gruplama ─────────────────────────────────────────────────────────────────
  const groupedConnections = useMemo(() => {
    const filtered = connections.filter(
      (c) => phaseFilter === "all" || c.phase === phaseFilter,
    );
    const map = new Map<number, { device: ProjectDevice; conns: DeviceConnection[] }>();
    for (const conn of filtered) {
      const device = devices.find((d) => d.id === conn.target_device_id);
      if (!device) continue;
      if (!map.has(device.id)) map.set(device.id, { device, conns: [] });
      map.get(device.id)!.conns.push(conn);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.device.label.localeCompare(b.device.label),
    );
  }, [connections, devices, phaseFilter]);

  // ── Özet istatistikler ───────────────────────────────────────────────────────
  const phaseStats = useMemo(() =>
    PHASES.map((p) => ({ phase: p, count: connections.filter((c) => c.phase === p).length }))
      .filter((x) => x.count > 0),
    [connections],
  );

  const bendTypeStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of connections) {
      const name = c.bend_type?.name ?? null;
      if (name) map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [connections]);

  const branchCondStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of connections) {
      const name = c.branch_conductor?.name ?? null;
      if (name) map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [connections]);

  // ── Form yardımcıları ────────────────────────────────────────────────────────
  const formDevice = form.target_device_id !== ""
    ? devices.find((d) => d.id === Number(form.target_device_id))
    : undefined;
  const formSourceDevice = form.source_device_id !== ""
    ? devices.find((d) => d.id === Number(form.source_device_id))
    : undefined;

  const selectedBranchDef = branchDefs.find(
    (d) => d.id === settingsDraft?.branch_copper_definition_id,
  ) ?? null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: "1.5rem", alignItems: "start" }}>

      {/* ── SOL KOLON ──────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Tali Bakır Parametreleri */}
        <section className="table-card">
          <div className="section-header">
            <h3 style={{ margin: 0 }}>Tali Bakır Parametreleri</h3>
          </div>
          {settingsDraft && (
            <div className="form-grid" style={{ marginTop: "0.75rem" }}>
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Tali Bakır Tanımı</span>
                <select
                  className="input"
                  value={settingsDraft.branch_copper_definition_id ?? ""}
                  onChange={(e) => {
                    if (!e.target.value) {
                      setSettingsDraft((d) => d ? { ...d, branch_copper_definition_id: null } : d);
                    } else {
                      const def = branchDefs.find((d) => d.id === Number(e.target.value));
                      if (def) setSettingsDraft((d) => d ? applyBranchDef(def, d) : d);
                    }
                  }}
                >
                  <option value="">— Seçin —</option>
                  {branchDefs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.branch_width_mm ?? "?"}×{d.branch_thickness_mm ?? "?"} mm
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Genişlik (mm)</span>
                <input className="input" type="number"
                  value={toNum(settingsDraft.branch_width_mm)}
                  onChange={(e) => setSettingsDraft((d) => d ? { ...d, branch_width_mm: Number(e.target.value) } : d)} />
              </label>
              <label className="field">
                <span>Kalınlık (mm)</span>
                <input className="input" type="number"
                  value={toNum(settingsDraft.branch_thickness_mm)}
                  onChange={(e) => setSettingsDraft((d) => d ? { ...d, branch_thickness_mm: Number(e.target.value) } : d)} />
              </label>
              <label className="field">
                <span>Malzeme</span>
                <select className="input" value={settingsDraft.branch_material ?? "Cu"}
                  onChange={(e) => setSettingsDraft((d) => d ? { ...d, branch_material: e.target.value } : d)}>
                  <option value="Cu">Cu</option>
                  <option value="Al">Al</option>
                </select>
              </label>
              <label className="field">
                <span>Büküm İç Yarıçapı (mm)</span>
                <input className="input" type="number"
                  value={toNum(settingsDraft.bend_inner_radius_mm)}
                  onChange={(e) => setSettingsDraft((d) => d ? { ...d, bend_inner_radius_mm: Number(e.target.value) } : d)} />
              </label>
              <label className="field">
                <span>Min Delik-Kenar (mm)</span>
                <input className="input" type="number"
                  value={toNum(settingsDraft.min_hole_edge_distance_mm)}
                  onChange={(e) => setSettingsDraft((d) => d ? { ...d, min_hole_edge_distance_mm: Number(e.target.value) } : d)} />
              </label>
              <label className="field">
                <span>Min Delik-Büküm (mm)</span>
                <input className="input" type="number"
                  value={toNum(settingsDraft.min_bend_hole_distance_mm)}
                  onChange={(e) => setSettingsDraft((d) => d ? { ...d, min_bend_hole_distance_mm: Number(e.target.value) } : d)} />
              </label>
            </div>
          )}
          <div className="form-actions" style={{ marginTop: "0.75rem" }}>
            <button
              type="button"
              className="btn-primary"
              disabled={saveSettingsMutation.isPending || !settingsDraft}
              onClick={() => saveSettingsMutation.mutate()}
            >
              {saveSettingsMutation.isPending ? "Kaydediliyor…" : "Tali Bakırı Kaydet"}
            </button>
            {selectedBranchDef && (
              <span style={{ color: "var(--muted)", fontSize: "0.82rem", alignSelf: "center" }}>
                Seçili: <strong style={{ color: "var(--text)" }}>{selectedBranchDef.name}</strong>
              </span>
            )}
            {saveSettingsMutation.isSuccess && (
              <span style={{ color: "#22c55e", fontSize: "0.82rem", alignSelf: "center" }}>✓ Kaydedildi</span>
            )}
          </div>
        </section>

        {/* Bağlantı Tablosu */}
        <section className="table-card">
          <div className="section-header">
            <h3 style={{ margin: 0 }}>Tali Bağlantılar</h3>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" className="btn-primary" onClick={() => setAddModalOpen(true)}>
                + Bağlantı Ekle
              </button>
              <button type="button" className="ghost" onClick={() => setConfirmAuto(true)}>
                Otomatik Listele
              </button>
            </div>
          </div>

          {/* Faz filtresi */}
          <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            {["all", ...PHASES].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPhaseFilter(p)}
                style={{
                  padding: "2px 10px",
                  borderRadius: 4,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  fontFamily: "monospace",
                  cursor: "pointer",
                  border: `1px solid ${phaseFilter === p ? (PHASE_COLORS[p] ?? "var(--accent)") : "var(--line)"}`,
                  background: phaseFilter === p
                    ? `${PHASE_COLORS[p] ?? "var(--accent)"}22`
                    : "transparent",
                  color: phaseFilter === p
                    ? (PHASE_COLORS[p] ?? "var(--accent)")
                    : "var(--muted)",
                }}
              >
                {p === "all" ? "Tümü" : p}
                {p !== "all" && ` (${connections.filter((c) => c.phase === p).length})`}
              </button>
            ))}
          </div>

          {/* Gruplandırılmış tablo */}
          {groupedConnections.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
              {connections.length === 0
                ? "Henüz bağlantı yok. \"Bağlantı Ekle\" veya \"Otomatik Listele\" kullanın."
                : "Seçilen filtre için bağlantı bulunamadı."}
            </p>
          ) : (
            <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {groupedConnections.map(({ device, conns }) => (
                <div key={device.id}
                  style={{ border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden" }}>
                  {/* Cihaz başlık satırı */}
                  <div style={{
                    padding: "0.4rem 0.75rem",
                    background: "var(--surface)",
                    borderBottom: "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}>
                    <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{device.label}</span>
                    <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {device.device.brand} {device.device.model}
                    </span>
                    <span style={{
                      marginLeft: "auto", fontSize: "0.75rem",
                      color: "var(--muted)", fontFamily: "monospace",
                    }}>
                      {conns.length} bağlantı
                    </span>
                  </div>

                  <table className="table" style={{ margin: 0, borderRadius: 0 }}>
                    <thead>
                      <tr>
                        <th>Faz</th>
                        <th>Terminal</th>
                        <th>Yüzey</th>
                        <th>Büküm Tipi</th>
                        <th>Tali Bakır</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {conns.map((conn) => (
                        <tr key={conn.id}>
                          <td><PhaseBadge phase={conn.phase} /></td>
                          <td style={{ fontFamily: "monospace", fontSize: "0.82rem" }}>
                            {terminalLabel(device, conn.target_terminal_id)}
                          </td>
                          <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                            {terminalFace(device, conn.target_terminal_id)}
                          </td>
                          <td>
                            <select
                              className="input"
                              style={{ padding: "2px 4px", fontSize: "0.8rem", minWidth: 100 }}
                              value={conn.bend_type_id ?? ""}
                              onChange={(e) =>
                                inlineUpdateMutation.mutate({
                                  conn,
                                  bend_type_id: e.target.value ? Number(e.target.value) : null,
                                  branch_conductor_id: conn.branch_conductor_id ?? null,
                                })
                              }
                            >
                              <option value="">— Seçin —</option>
                              {bendTypes.map((bt: BendType) => (
                                <option key={bt.id} value={bt.id}>{bt.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              className="input"
                              style={{ padding: "2px 4px", fontSize: "0.8rem", minWidth: 120 }}
                              value={conn.branch_conductor_id ?? ""}
                              onChange={(e) =>
                                inlineUpdateMutation.mutate({
                                  conn,
                                  bend_type_id: conn.bend_type_id ?? null,
                                  branch_conductor_id: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                            >
                              <option value="">— Seçin —</option>
                              {branchConds.map((bc: BranchConductor) => (
                                <option key={bc.id} value={bc.id}>{bc.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="ghost"
                              style={{ color: "var(--danger, #ef4444)", padding: "1px 6px", fontSize: "0.8rem" }}
                              onClick={() => setConfirmDelete({ id: conn.id })}
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── SAĞ KOLON ─────────────────────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Genel durum */}
        <section className="table-card">
          <h3 style={{ margin: "0 0 0.75rem" }}>Genel Durum</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {[
              ["Toplam Bağlantı", connections.length],
              ["Büküm Atanmış", connections.filter((c) => c.bend_type_id).length],
              ["Tali Bakır Atanmış", connections.filter((c) => c.branch_conductor_id).length],
              ["Eksik Atama", connections.filter((c) => !c.bend_type_id || !c.branch_conductor_id).length],
            ].map(([label, value]) => (
              <div key={label as string}
                style={{ background: "var(--surface)", borderRadius: 4, padding: "0.4rem 0.6rem" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: "1rem", fontWeight: 700 }}>{value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Faz dağılımı */}
        {phaseStats.length > 0 && (
          <section className="table-card">
            <h3 style={{ margin: "0 0 0.75rem" }}>Faz Dağılımı</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              {phaseStats.map(({ phase, count }) => (
                <div key={phase} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <PhaseBadge phase={phase} />
                  <div style={{
                    flex: 1, height: 6, borderRadius: 3, background: "var(--line)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      width: `${Math.round((count / connections.length) * 100)}%`,
                      height: "100%",
                      background: PHASE_COLORS[phase] ?? "#888",
                      borderRadius: 3,
                    }} />
                  </div>
                  <span style={{ fontSize: "0.82rem", fontWeight: 600, minWidth: 24 }}>{count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Büküm tipi kullanımı */}
        {bendTypeStats.length > 0 && (
          <section className="table-card">
            <h3 style={{ margin: "0 0 0.75rem" }}>Büküm Tipi Kullanımı</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {bendTypeStats.map(({ name, count }) => (
                <div key={name} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: "0.83rem", padding: "0.2rem 0",
                  borderBottom: "1px solid var(--line)",
                }}>
                  <span style={{ fontWeight: 500 }}>{name}</span>
                  <span style={{ color: "var(--muted)" }}>{count} bağlantı</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tali bakır kullanımı */}
        {branchCondStats.length > 0 && (
          <section className="table-card">
            <h3 style={{ margin: "0 0 0.75rem" }}>Tali Bakır Kullanımı</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {branchCondStats.map(({ name, count }) => (
                <div key={name} style={{
                  display: "flex", justifyContent: "space-between",
                  fontSize: "0.83rem", padding: "0.2rem 0",
                  borderBottom: "1px solid var(--line)",
                }}>
                  <span style={{ fontWeight: 500 }}>{name}</span>
                  <span style={{ color: "var(--muted)" }}>{count} bağlantı</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Henüz veri yoksa ipucu */}
        {connections.length === 0 && (
          <section className="table-card">
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>
              Bağlantı eklendikten sonra burada özet istatistikler görünür.
            </p>
          </section>
        )}
      </div>

      {/* ── Bağlantı Ekle Modal ───────────────────────────────────────────────── */}
      <Modal
        open={addModalOpen}
        title="Bağlantı Ekle"
        onClose={() => { setAddModalOpen(false); setForm(EMPTY_FORM); }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <label className="field">
            <span>Faz</span>
            <select className="input" value={form.phase}
              onChange={(e) => setForm((f) => ({ ...f, phase: e.target.value }))}>
              {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Kaynak Türü</span>
            <select className="input" value={form.source_type}
              onChange={(e) => setForm((f) => ({
                ...f,
                source_type: e.target.value,
                connection_type: e.target.value === "busbar" ? "main_to_device" : "device_to_device",
                source_device_id: "",
                source_terminal_id: "",
              }))}>
              <option value="busbar">Ana Bakır</option>
              <option value="device">Cihaz</option>
            </select>
          </label>
          {form.source_type === "device" && (
            <>
              <label className="field">
                <span>Kaynak Cihaz</span>
                <select className="input" value={form.source_device_id}
                  onChange={(e) => setForm((f) => ({ ...f, source_device_id: Number(e.target.value) || "", source_terminal_id: "" }))}>
                  <option value="">— Seçin —</option>
                  {devices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </label>
              {formSourceDevice && (
                <label className="field">
                  <span>Kaynak Terminal</span>
                  <select className="input" value={form.source_terminal_id}
                    onChange={(e) => setForm((f) => ({ ...f, source_terminal_id: Number(e.target.value) || "" }))}>
                    <option value="">— Seçin —</option>
                    {formSourceDevice.device.terminals.map((t) => (
                      <option key={t.id} value={t.id}>{t.terminal_name} ({t.phase})</option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
          <label className="field">
            <span>Hedef Cihaz</span>
            <select className="input" value={form.target_device_id}
              onChange={(e) => setForm((f) => ({ ...f, target_device_id: Number(e.target.value) || "", target_terminal_id: "" }))}>
              <option value="">— Seçin —</option>
              {devices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>
          {formDevice && (
            <label className="field">
              <span>Hedef Terminal</span>
              <select className="input" value={form.target_terminal_id}
                onChange={(e) => setForm((f) => ({ ...f, target_terminal_id: Number(e.target.value) || "" }))}>
                <option value="">— Seçin —</option>
                {formDevice.device.terminals.map((t) => (
                  <option key={t.id} value={t.id}>{t.terminal_name} ({t.phase})</option>
                ))}
              </select>
            </label>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={
                createMutation.isPending ||
                !form.target_device_id ||
                !form.target_terminal_id
              }
              onClick={() => createMutation.mutate(form)}
            >
              {createMutation.isPending ? "Ekleniyor…" : "Ekle"}
            </button>
            <button type="button" className="ghost"
              onClick={() => { setAddModalOpen(false); setForm(EMPTY_FORM); }}>
              İptal
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Sil Onay Modal ────────────────────────────────────────────────────── */}
      <ConfirmModal
        open={!!confirmDelete}
        message="Bu bağlantıyı silmek istediğinizden emin misiniz?"
        confirmLabel="Sil"
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* ── Otomatik Listele Onay ──────────────────────────────────────────────── */}
      <ConfirmModal
        open={confirmAuto}
        message="Tüm mevcut bağlantılar silinecek ve terminal faz bilgisine göre yeniden oluşturulacak. Devam edilsin mi?"
        confirmLabel="Otomatik Listele"
        onConfirm={() => autoMutation.mutate()}
        onCancel={() => setConfirmAuto(false)}
      />
    </div>
  );
}
