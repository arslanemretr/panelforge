import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { client } from "../api/client";
import { ConfirmModal } from "../components/ConfirmModal";
import type { CopperDefinition, PhaseLabel, PhaseType } from "../types";

function fmtDate(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

type TabKey = "definitions" | "phase-types" | "phase-labels";

// ─── Faz Tipi oluşturucu — etiket seçici + sıralama ────────────────────────
function PhaseTypeBuilder({
  phaseLabels,
  onSave,
  isPending,
}: {
  phaseLabels: PhaseLabel[];
  onSave: (name: string, phases: string) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  function addLabel(label: string) {
    if (!selected.includes(label)) setSelected((prev) => [...prev, label]);
  }
  function removeLabel(idx: number) {
    setSelected((prev) => prev.filter((_, i) => i !== idx));
  }
  function moveUp(idx: number) {
    if (idx === 0) return;
    setSelected((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }
  function moveDown(idx: number) {
    setSelected((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  const labelMap: Record<string, string> = {};
  phaseLabels.forEach((l) => { labelMap[l.label] = l.color; });

  const canSave = name.trim().length > 0 && selected.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <input
        type="text"
        placeholder="Faz tipi adı… (ör. 3 Fazlı + PE)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ maxWidth: 340 }}
      />

      {/* Mevcut etiketler — tıklayarak seç */}
      <div>
        <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.35rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Mevcut Etiketler — tıklayarak sıraya ekle
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {phaseLabels.map((pl) => (
            <button
              key={pl.id}
              type="button"
              onClick={() => addLabel(pl.label)}
              style={{
                padding: "0.25rem 0.65rem",
                borderRadius: "999px",
                border: `2px solid ${pl.color}`,
                background: selected.includes(pl.label) ? pl.color + "33" : "transparent",
                color: pl.color,
                fontWeight: 700,
                fontSize: "0.82rem",
                cursor: "pointer",
                fontFamily: "monospace",
              }}
            >
              {pl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seçili sıra */}
      {selected.length > 0 && (
        <div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: "0.35rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Seçili Sıra
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
            {selected.map((lbl, idx) => {
              const color = labelMap[lbl] ?? "#aaa";
              return (
                <span key={idx} style={{ display: "flex", alignItems: "center", gap: "0.25rem",
                  padding: "0.2rem 0.5rem", borderRadius: "999px",
                  border: `2px solid ${color}`, background: color + "22" }}>
                  <span style={{ fontWeight: 700, color, fontFamily: "monospace", fontSize: "0.82rem" }}>{lbl}</span>
                  <button type="button" onClick={() => moveUp(idx)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "0 2px", fontSize: "0.7rem" }}
                    title="Yukarı">▲</button>
                  <button type="button" onClick={() => moveDown(idx)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "0 2px", fontSize: "0.7rem" }}
                    title="Aşağı">▼</button>
                  <button type="button" onClick={() => removeLabel(idx)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "0 2px", fontSize: "0.75rem" }}
                    title="Kaldır">×</button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <button
          type="button"
          disabled={!canSave || isPending}
          onClick={() => {
            onSave(name.trim(), selected.join(","));
            setName("");
            setSelected([]);
          }}
        >
          {isPending ? "Kaydediliyor..." : "Faz Tipi Ekle"}
        </button>
      </div>
    </div>
  );
}

// ─── Sayfa ──────────────────────────────────────────────────────────────────
export function MainCopperListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>("definitions");
  const [search, setSearch] = useState<string>(
    localStorage.getItem("copper-def-search-main") ?? "",
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Yeni etiket formu
  const [newLabelText, setNewLabelText] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#cccccc");

  // ── Queries ────────────────────────────────────────────────────────────────
  const definitionsQuery = useQuery({
    queryKey: ["copper-definitions", "main"],
    queryFn: () => client.listCopperDefinitions("main"),
  });
  const phaseTypesQuery = useQuery({
    queryKey: ["phase-types"],
    queryFn: client.listPhaseTypes,
  });
  const phaseLabelsQuery = useQuery({
    queryKey: ["phase-labels"],
    queryFn: client.listPhaseLabels,
  });

  const definitions = definitionsQuery.data ?? [];
  const phaseTypes  = phaseTypesQuery.data  ?? [];
  const phaseLabels = phaseLabelsQuery.data ?? [];

  const filtered = search.trim()
    ? definitions.filter((d) =>
        d.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : definitions;

  const labelMap: Record<string, string> = {};
  phaseLabels.forEach((l) => { labelMap[l.label] = l.color; });

  function handleSearchChange(value: string) {
    setSearch(value);
    localStorage.setItem("copper-def-search-main", value);
  }

  const invalidateDefs  = () => queryClient.invalidateQueries({ queryKey: ["copper-definitions", "main"] });
  const invalidateTypes = () => queryClient.invalidateQueries({ queryKey: ["phase-types"] });
  const invalidateLabels = () => queryClient.invalidateQueries({ queryKey: ["phase-labels"] });

  // ── Mutations — Tanımlar ───────────────────────────────────────────────────
  const cloneMutation = useMutation({
    mutationFn: (def: CopperDefinition) =>
      client.createCopperDefinition({
        name: `${def.name} (Kopya)`,
        copper_kind: "main",
        description: def.description ?? null,
        main_width_mm: def.main_width_mm ?? null,
        main_thickness_mm: def.main_thickness_mm ?? null,
        main_material: def.main_material,
        main_phase_spacing_mm: def.main_phase_spacing_mm ?? null,
        branch_width_mm: null,
        branch_thickness_mm: null,
        branch_material: "Cu",
        branch_phase_spacing_mm: null,
        bend_inner_radius_mm: null,
        k_factor: null,
        min_hole_edge_distance_mm: null,
        min_bend_hole_distance_mm: null,
        default_hole_diameter_mm: null,
        use_slot_holes: false,
        slot_width_mm: null,
        slot_length_mm: null,
        density_g_cm3: null,
        coating_type: null,
        busbar_x_mm: def.busbar_x_mm ?? null,
        busbar_y_mm: def.busbar_y_mm ?? null,
        busbar_z_mm: def.busbar_z_mm ?? null,
        busbar_orientation: def.busbar_orientation ?? null,
        busbar_length_mm: def.busbar_length_mm ?? null,
        phase_type_id: def.phase_type_id ?? null,
        bars_per_phase: def.bars_per_phase ?? null,
        bar_gap_mm: def.bar_gap_mm ?? null,
        phase_center_mm: def.phase_center_mm ?? null,
        layer_type: def.layer_type ?? null,
        neutral_bar_count: def.neutral_bar_count ?? null,
      }),
    onSuccess: async () => { await invalidateDefs(); },
  });

  const deleteMutation = useMutation({
    mutationFn: client.deleteCopperDefinition,
    onSuccess: async () => { await invalidateDefs(); setDeleteError(null); },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setDeleteError(error.response.data?.detail ?? "Bu bakır tanımı projede kullanıldığı için silinemedi.");
      } else {
        setDeleteError("Silme işlemi başarısız oldu.");
      }
    },
  });

  // ── Mutations — Faz Tipleri ───────────────────────────────────────────────
  const createPhaseTypeMutation = useMutation({
    mutationFn: ({ name, phases }: { name: string; phases: string }) =>
      client.createPhaseType(name, phases),
    onSuccess: async () => { await invalidateTypes(); },
  });

  const deletePhaseTypeMutation = useMutation({
    mutationFn: client.deletePhaseType,
    onSuccess: async () => { await invalidateTypes(); await invalidateDefs(); },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        alert(error.response.data?.detail ?? "Bu faz tipi kullanımda, silinemez.");
      }
    },
  });

  // ── Mutations — Faz Etiketleri ────────────────────────────────────────────
  const createPhaseLabelMutation = useMutation({
    mutationFn: () => client.createPhaseLabel(newLabelText.trim(), newLabelColor),
    onSuccess: async () => { await invalidateLabels(); setNewLabelText(""); setNewLabelColor("#cccccc"); },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        alert(error.response.data?.detail ?? "Bu etiket zaten mevcut.");
      }
    },
  });

  const updateLabelColorMutation = useMutation({
    mutationFn: ({ id, color }: { id: number; color: string }) =>
      client.updatePhaseLabel(id, color),
    onSuccess: async () => { await invalidateLabels(); },
  });

  const deletePhaseLabelMutation = useMutation({
    mutationFn: client.deletePhaseLabel,
    onSuccess: async () => { await invalidateLabels(); },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        alert(error.response.data?.detail ?? "Sistem etiketleri silinemez.");
      }
    },
  });

  // ── Tab butonu stili ───────────────────────────────────────────────────────
  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "definitions",  label: "Ana Bakır Tanımları", count: definitions.length },
    { key: "phase-types",  label: "Faz Tipleri",         count: phaseTypes.length },
    { key: "phase-labels", label: "Faz Etiketleri",      count: phaseLabels.length },
  ];

  function tabStyle(key: TabKey) {
    const isActive = activeTab === key;
    return {
      padding: "0.6rem 1.2rem",
      fontSize: "0.88rem",
      fontWeight: isActive ? 700 : 400,
      border: "none",
      borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
      background: "transparent",
      color: isActive ? "var(--accent)" : "var(--muted)",
      cursor: "pointer",
      marginBottom: "-2px",
      transition: "color 0.15s",
      display: "flex",
      alignItems: "center",
      gap: "0.4rem",
    } as const;
  }

  return (
    <div className="stack">
      {/* Sayfa başlığı */}
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanımlamalar</span>
          <h1>Ana Bakır Tanımlama</h1>
          <p>Ana bakır kütüphanesi, faz etiketleri ve faz tiplerini yönetin.</p>
        </div>
        {activeTab === "definitions" && (
          <button type="button" onClick={() => navigate("new")}>
            Yeni Ana Bakır
          </button>
        )}
      </section>

      {deleteError && <div className="alert alert-warning">{deleteError}</div>}

      {/* Tab çubuğu */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--line)" }}>
        {tabs.map(({ key, label, count }) => (
          <button key={key} type="button" onClick={() => setActiveTab(key)} style={tabStyle(key)}>
            {label}
            {count !== undefined && count > 0 && (
              <span style={{ fontSize: "0.75rem", background: "var(--accent-soft)", color: "var(--accent)", borderRadius: "999px", padding: "0.1rem 0.45rem" }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Ana Bakır Tanımları ──────────────────────────────────────── */}
      {activeTab === "definitions" && (
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.9rem", flexWrap: "wrap" }}>
            <input
              type="search"
              className="input"
              placeholder="Ana bakır ara..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{ flex: 1, maxWidth: "320px" }}
            />
            {search.trim() && (
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                {filtered.length} / {definitions.length} kayıt
              </span>
            )}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Kesit</th>
                  <th>Faz Tipi</th>
                  <th>Kat Tipi</th>
                  <th>Faz Miktarı</th>
                  <th>Fazlar Arası</th>
                  <th>Oluşturma</th>
                  <th>Revizyon</th>
                  <th style={{ borderLeft: "2px solid var(--line)" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((def) => {
                  const ptPhases = def.phase_type?.phases ?? null;
                  return (
                    <tr key={def.id}>
                      <td><strong>{def.name}</strong></td>
                      <td>{def.main_width_mm ?? "-"} × {def.main_thickness_mm ?? "-"} mm</td>
                      <td>
                        {def.phase_type ? (
                          <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{def.phase_type.name}</span>
                            {ptPhases && ptPhases.split(",").map((lbl) => (
                              <span key={lbl} style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "0.78rem", color: labelMap[lbl] ?? "#aaa" }}>{lbl}</span>
                            ))}
                          </span>
                        ) : "—"}
                      </td>
                      <td>{def.layer_type ?? "-"}</td>
                      <td>{def.bars_per_phase ?? 1} adet</td>
                      <td>{def.phase_center_mm ? `${def.phase_center_mm} mm` : def.main_phase_spacing_mm ? `${def.main_phase_spacing_mm} mm` : "-"}</td>
                      <td>{fmtDate(def.created_at)}</td>
                      <td>{fmtDate(def.updated_at)}</td>
                      <td className="actions-cell" style={{ borderLeft: "2px solid var(--line)" }}>
                        <button type="button" className="ghost" onClick={() => navigate(`${def.id}/edit`)}>Düzenle</button>
                        <button type="button" className="ghost" disabled={cloneMutation.isPending} onClick={() => cloneMutation.mutate(def)}>Kopyala</button>
                        <button type="button" className="ghost danger" disabled={deleteMutation.isPending}
                          onClick={() => setConfirmPending({
                            message: `"${def.name}" bakır tanımını silmek istediğinizden emin misiniz?`,
                            onConfirm: () => { deleteMutation.mutate(def.id); setConfirmPending(null); },
                          })}>
                          Sil
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && (
                  <tr>
                    <td colSpan={9}>
                      <div className="empty-state">
                        {search ? "Arama kriterine uygun bakır tanımı bulunamadı." : "Tanımlı ana bakır yok."}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Tab 2: Faz Tipleri ──────────────────────────────────────────────── */}
      {activeTab === "phase-types" && (
        <section className="card">
          <div className="table-wrap" style={{ marginBottom: "1.25rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Fazlar (sıralı)</th>
                  <th style={{ borderLeft: "2px solid var(--line)", width: 80 }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {phaseTypes.map((pt: PhaseType) => (
                  <tr key={pt.id}>
                    <td><strong>{pt.name}</strong></td>
                    <td>
                      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                        {pt.phases.split(",").map((lbl) => (
                          <span key={lbl} style={{
                            padding: "0.15rem 0.5rem", borderRadius: "999px",
                            border: `2px solid ${labelMap[lbl] ?? "#555"}`,
                            color: labelMap[lbl] ?? "#aaa",
                            fontWeight: 700, fontFamily: "monospace", fontSize: "0.8rem",
                          }}>{lbl}</span>
                        ))}
                      </div>
                    </td>
                    <td className="actions-cell" style={{ borderLeft: "2px solid var(--line)" }}>
                      <button type="button" className="ghost danger"
                        disabled={deletePhaseTypeMutation.isPending}
                        onClick={() => setConfirmPending({
                          message: `"${pt.name}" faz tipini silmek istediğinizden emin misiniz?`,
                          onConfirm: () => { deletePhaseTypeMutation.mutate(pt.id); setConfirmPending(null); },
                        })}>
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
                {phaseTypes.length === 0 && (
                  <tr><td colSpan={3}><div className="empty-state">Henüz faz tipi tanımlanmamış.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)", marginBottom: "0.75rem" }}>
              Yeni Faz Tipi Ekle
            </div>
            <PhaseTypeBuilder
              phaseLabels={phaseLabels}
              onSave={(name, phases) => createPhaseTypeMutation.mutate({ name, phases })}
              isPending={createPhaseTypeMutation.isPending}
            />
          </div>
        </section>
      )}

      {/* ── Tab 3: Faz Etiketleri ───────────────────────────────────────────── */}
      {activeTab === "phase-labels" && (
        <section className="card">
          <div className="table-wrap" style={{ marginBottom: "1.25rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Etiket</th>
                  <th>Renk</th>
                  <th>Sistem?</th>
                  <th style={{ borderLeft: "2px solid var(--line)", width: 120 }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {phaseLabels.map((pl: PhaseLabel) => (
                  <tr key={pl.id}>
                    <td>
                      <span style={{ fontWeight: 700, fontFamily: "monospace", color: pl.color, fontSize: "1rem" }}>
                        {pl.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input
                          type="color"
                          defaultValue={pl.color}
                          onChange={(e) => updateLabelColorMutation.mutate({ id: pl.id, color: e.target.value })}
                          style={{ width: 36, height: 28, padding: 2, border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer", background: "none" }}
                          title="Rengi değiştir"
                        />
                        <span style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "var(--muted)" }}>{pl.color}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                      {pl.is_system ? "✓ Sistem" : "Kullanıcı"}
                    </td>
                    <td className="actions-cell" style={{ borderLeft: "2px solid var(--line)" }}>
                      {!pl.is_system && (
                        <button type="button" className="ghost danger"
                          disabled={deletePhaseLabelMutation.isPending}
                          onClick={() => setConfirmPending({
                            message: `"${pl.label}" etiketini silmek istediğinizden emin misiniz?`,
                            onConfirm: () => { deletePhaseLabelMutation.mutate(pl.id); setConfirmPending(null); },
                          })}>
                          Sil
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {phaseLabels.length === 0 && (
                  <tr><td colSpan={4}><div className="empty-state">Henüz faz etiketi tanımlanmamış.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Yeni etiket ekle */}
          <div style={{ borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--muted)", marginBottom: "0.75rem" }}>
              Yeni Etiket Ekle
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Etiket adı (ör. L4, T1)"
                value={newLabelText}
                onChange={(e) => setNewLabelText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newLabelText.trim()) createPhaseLabelMutation.mutate(); }}
                style={{ maxWidth: 200 }}
              />
              <input
                type="color"
                value={newLabelColor}
                onChange={(e) => setNewLabelColor(e.target.value)}
                style={{ width: 44, height: 34, padding: 2, border: "1px solid var(--line)", borderRadius: 4, cursor: "pointer", background: "none" }}
                title="Renk seç"
              />
              <span style={{ fontFamily: "monospace", fontSize: "0.82rem", color: newLabelColor, fontWeight: 700 }}>
                {newLabelText || "ÖNİZLEME"}
              </span>
              <button
                type="button"
                disabled={!newLabelText.trim() || createPhaseLabelMutation.isPending}
                onClick={() => createPhaseLabelMutation.mutate()}
              >
                {createPhaseLabelMutation.isPending ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          </div>
        </section>
      )}

      <ConfirmModal
        open={confirmPending !== null}
        message={confirmPending?.message ?? ""}
        onConfirm={() => confirmPending?.onConfirm()}
        onCancel={() => setConfirmPending(null)}
      />
    </div>
  );
}
