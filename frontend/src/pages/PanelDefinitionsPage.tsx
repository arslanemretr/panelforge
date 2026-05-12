import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../api/client";
import { ConfirmModal } from "../components/ConfirmModal";
import { Modal } from "../components/Modal";
import type { PanelDefinition } from "../types";

type DraftDef = Omit<PanelDefinition, "id" | "created_at" | "updated_at" | "panel_type">;

const emptyDraft: DraftDef = {
  name: "",
  description: "",
  width_mm: 2000,
  height_mm: 2200,
  depth_mm: 600,
  mounting_plate_width_mm: 1800,
  mounting_plate_height_mm: 2000,
  left_margin_mm: 100,
  right_margin_mm: 100,
  top_margin_mm: 100,
  bottom_margin_mm: 100,
  panel_type_id: null,
  origin_x_mm: 0,
  origin_y_mm: 0,
  origin_z_mm: 0,
};

function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("tr-TR");
}

const SEARCH_KEY = "panel-def-search";

export function PanelDefinitionsPage() {
  const queryClient = useQueryClient();

  // ── Arama ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState(() => localStorage.getItem(SEARCH_KEY) ?? "");

  // ── Kabin form modal ───────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<PanelDefinition | null>(null);
  const [draft, setDraft] = useState<DraftDef>(emptyDraft);

  // ── Pano Tipi yönetimi ─────────────────────────────────────────────────────
  const [newTypeName, setNewTypeName] = useState("");

  // ── Onay modalı ───────────────────────────────────────────────────────────
  const [confirmPending, setConfirmPending] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const definitionsQuery = useQuery({
    queryKey: ["panel-definitions"],
    queryFn: client.listPanelDefinitions,
  });

  const panelTypesQuery = useQuery({
    queryKey: ["panel-types"],
    queryFn: client.listPanelTypes,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () => client.createPanelDefinition(draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["panel-definitions"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => client.updatePanelDefinition(editingDef!.id, draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["panel-definitions"] });
      closeModal();
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (src: PanelDefinition) =>
      client.createPanelDefinition({
        name: src.name + " (Kopya)",
        description: src.description,
        width_mm: src.width_mm,
        height_mm: src.height_mm,
        depth_mm: src.depth_mm,
        mounting_plate_width_mm: src.mounting_plate_width_mm,
        mounting_plate_height_mm: src.mounting_plate_height_mm,
        left_margin_mm: src.left_margin_mm,
        right_margin_mm: src.right_margin_mm,
        top_margin_mm: src.top_margin_mm,
        bottom_margin_mm: src.bottom_margin_mm,
        panel_type_id: src.panel_type_id ?? null,
        origin_x_mm: src.origin_x_mm ?? 0,
        origin_y_mm: src.origin_y_mm ?? 0,
        origin_z_mm: src.origin_z_mm ?? 0,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["panel-definitions"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: client.deletePanelDefinition,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["panel-definitions"] });
    },
  });

  const createTypeMutation = useMutation({
    mutationFn: () => client.createPanelType(newTypeName.trim()),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["panel-types"] });
      setNewTypeName("");
    },
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: number) => client.deletePanelType(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["panel-types"] });
      await queryClient.invalidateQueries({ queryKey: ["panel-definitions"] });
    },
  });

  // ── Yardımcılar ────────────────────────────────────────────────────────────
  function openCreate() {
    setEditingDef(null);
    setDraft(emptyDraft);
    setModalOpen(true);
  }

  function openEdit(def: PanelDefinition) {
    setEditingDef(def);
    setDraft({
      name: def.name,
      description: def.description ?? "",
      width_mm: def.width_mm,
      height_mm: def.height_mm,
      depth_mm: def.depth_mm ?? null,
      mounting_plate_width_mm: def.mounting_plate_width_mm ?? null,
      mounting_plate_height_mm: def.mounting_plate_height_mm ?? null,
      left_margin_mm: def.left_margin_mm,
      right_margin_mm: def.right_margin_mm,
      top_margin_mm: def.top_margin_mm,
      bottom_margin_mm: def.bottom_margin_mm,
      panel_type_id: def.panel_type_id ?? null,
      origin_x_mm: def.origin_x_mm ?? 0,
      origin_y_mm: def.origin_y_mm ?? 0,
      origin_z_mm: def.origin_z_mm ?? 0,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingDef(null);
    setDraft(emptyDraft);
  }

  function update<K extends keyof DraftDef>(key: K, value: DraftDef[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    localStorage.setItem(SEARCH_KEY, value);
  }

  const panelTypes = panelTypesQuery.data ?? [];
  const filteredDefs = (definitionsQuery.data ?? []).filter((def) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      def.name.toLowerCase().includes(term) ||
      (def.description ?? "").toLowerCase().includes(term)
    );
  });

  const isEditing = editingDef !== null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="stack">
      {/* ── Sayfa başlığı ── */}
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanımlamalar</span>
          <h1>Kabin Tanımlama</h1>
          <p>Kabin ölçülerini ve pano tiplerini yönetin.</p>
        </div>
        <button type="button" onClick={openCreate}>
          Yeni Kabin
        </button>
      </section>

      {/* ── Pano Tipleri ── */}
      <section className="card">
        <div className="section-header" style={{ marginBottom: "0.75rem" }}>
          <h3 style={{ margin: 0 }}>Pano Tipleri</h3>
        </div>
        <div className="table-wrap" style={{ marginBottom: "0.75rem" }}>
          <table>
            <thead>
              <tr>
                <th style={{ padding: "0.45rem 0.65rem" }}>Tip Adı</th>
                <th style={{
                  padding: "0.45rem 0.9rem",
                  borderLeft: "2px solid var(--line)",
                  background: "rgba(255,255,255,0.03)",
                  width: 80,
                }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {panelTypes.map((pt) => (
                <tr key={pt.id}>
                  <td style={{ padding: "0.4rem 0.65rem" }}>{pt.name}</td>
                  <td className="actions-cell" style={{
                    padding: "0.4rem 0.9rem",
                    borderLeft: "2px solid var(--line)",
                    background: "rgba(255,255,255,0.02)",
                  }}>
                    <button
                      type="button"
                      className="ghost danger"
                      disabled={deleteTypeMutation.isPending}
                      onClick={() =>
                        setConfirmPending({
                          message: `"${pt.name}" tipini silmek istediğinizden emin misiniz?`,
                          onConfirm: () => { deleteTypeMutation.mutate(pt.id); setConfirmPending(null); },
                        })
                      }
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {panelTypes.length === 0 && (
                <tr>
                  <td colSpan={2}>
                    <div className="empty-state">Henüz pano tipi tanımlanmamış.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Yeni tip ekle — inline */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="text"
            placeholder="Yeni tip adı..."
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTypeName.trim()) createTypeMutation.mutate();
            }}
            style={{ maxWidth: 260 }}
          />
          <button
            type="button"
            disabled={!newTypeName.trim() || createTypeMutation.isPending}
            onClick={() => createTypeMutation.mutate()}
          >
            {createTypeMutation.isPending ? "Ekleniyor..." : "Ekle"}
          </button>
        </div>
      </section>

      {/* ── Kabin Tanımları ── */}
      <section className="card">
        <div style={{ marginBottom: "0.75rem" }}>
          <input
            type="search"
            placeholder="Kabin ara..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{ width: "100%", maxWidth: 320 }}
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ padding: "0.5rem 0.65rem" }}>Kabin Adı</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Açıklama</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Pano Tipi</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Ölçü (G×Y×D mm)</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Montaj Plakası</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Orijin (X, Y, Z)</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Oluşturma</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Revizyon</th>
                <th style={{
                  padding: "0.5rem 0.9rem",
                  borderLeft: "2px solid var(--line)",
                  background: "rgba(255,255,255,0.03)",
                }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredDefs.map((def) => (
                <tr key={def.id}>
                  <td style={{ padding: "0.45rem 0.65rem" }}>
                    <strong>{def.name}</strong>
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem", color: "var(--muted)", fontSize: "0.85rem" }}>
                    {def.description || "—"}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem", fontSize: "0.85rem" }}>
                    {def.panel_type?.name ?? "—"}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem", fontVariantNumeric: "tabular-nums", fontSize: "0.85rem" }}>
                    {def.width_mm}×{def.height_mm}×{def.depth_mm ?? 0}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem", fontSize: "0.85rem" }}>
                    {def.mounting_plate_width_mm ?? 0}×{def.mounting_plate_height_mm ?? 0}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem", fontSize: "0.82rem", fontVariantNumeric: "tabular-nums", color: "var(--muted)" }}>
                    {def.origin_x_mm ?? 0}, {def.origin_y_mm ?? 0}, {def.origin_z_mm ?? 0}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                    {fmtDate(def.created_at)}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                    {fmtDate(def.updated_at)}
                  </td>
                  <td
                    className="actions-cell"
                    style={{
                      padding: "0.45rem 0.9rem",
                      borderLeft: "2px solid var(--line)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => openEdit(def)}
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      disabled={cloneMutation.isPending}
                      onClick={() => cloneMutation.mutate(def)}
                    >
                      Kopyala
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      disabled={deleteMutation.isPending}
                      onClick={() =>
                        setConfirmPending({
                          message: `"${def.name}" kabin tanımını silmek istediğinizden emin misiniz?`,
                          onConfirm: () => { deleteMutation.mutate(def.id); setConfirmPending(null); },
                        })
                      }
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredDefs.length && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      {search.trim() ? "Aramayla eşleşen kabin bulunamadı." : "Tanımlı kabin yok."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Kabin Ekle / Düzenle Modal ── */}
      <Modal
        title={isEditing ? "Kabini Düzenle" : "Yeni Kabin Ekle"}
        open={modalOpen}
        onClose={closeModal}
      >
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            isEditing ? updateMutation.mutate() : createMutation.mutate();
          }}
        >
          <label>
            <span>Kabin adı</span>
            <input value={draft.name} onChange={(e) => update("name", e.target.value)} required />
          </label>
          <label>
            <span>Açıklama</span>
            <input value={draft.description ?? ""} onChange={(e) => update("description", e.target.value)} />
          </label>

          <label>
            <span>Pano Tipi</span>
            <select
              value={draft.panel_type_id ?? ""}
              onChange={(e) => update("panel_type_id", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Seçiniz —</option>
              {panelTypes.map((pt) => (
                <option key={pt.id} value={pt.id}>{pt.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Genişlik (mm)</span>
            <input type="number" value={draft.width_mm} onChange={(e) => update("width_mm", Number(e.target.value))} />
          </label>
          <label>
            <span>Yükseklik (mm)</span>
            <input type="number" value={draft.height_mm} onChange={(e) => update("height_mm", Number(e.target.value))} />
          </label>
          <label>
            <span>Derinlik (mm)</span>
            <input type="number" value={draft.depth_mm ?? 0} onChange={(e) => update("depth_mm", Number(e.target.value))} />
          </label>

          <label>
            <span>Montaj genişliği (mm)</span>
            <input
              type="number"
              value={draft.mounting_plate_width_mm ?? 0}
              onChange={(e) => update("mounting_plate_width_mm", Number(e.target.value))}
            />
          </label>
          <label>
            <span>Montaj yüksekliği (mm)</span>
            <input
              type="number"
              value={draft.mounting_plate_height_mm ?? 0}
              onChange={(e) => update("mounting_plate_height_mm", Number(e.target.value))}
            />
          </label>

          <label>
            <span>Sol boşluk (mm)</span>
            <input type="number" value={draft.left_margin_mm} onChange={(e) => update("left_margin_mm", Number(e.target.value))} />
          </label>
          <label>
            <span>Sağ boşluk (mm)</span>
            <input type="number" value={draft.right_margin_mm} onChange={(e) => update("right_margin_mm", Number(e.target.value))} />
          </label>
          <label>
            <span>Üst boşluk (mm)</span>
            <input type="number" value={draft.top_margin_mm} onChange={(e) => update("top_margin_mm", Number(e.target.value))} />
          </label>
          <label>
            <span>Alt boşluk (mm)</span>
            <input type="number" value={draft.bottom_margin_mm} onChange={(e) => update("bottom_margin_mm", Number(e.target.value))} />
          </label>

          {/* XYZ Orijin */}
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--muted)" }}>
              Koordinat Orijini (0,0,0 noktası — mm)
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
              <label style={{ margin: 0 }}>
                <span>X</span>
                <input type="number" value={draft.origin_x_mm ?? 0} onChange={(e) => update("origin_x_mm", Number(e.target.value))} />
              </label>
              <label style={{ margin: 0 }}>
                <span>Y</span>
                <input type="number" value={draft.origin_y_mm ?? 0} onChange={(e) => update("origin_y_mm", Number(e.target.value))} />
              </label>
              <label style={{ margin: 0 }}>
                <span>Z</span>
                <input type="number" value={draft.origin_z_mm ?? 0} onChange={(e) => update("origin_z_mm", Number(e.target.value))} />
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : isEditing ? "Güncelle" : "Kabini Kaydet"}
            </button>
            <button type="button" className="ghost" onClick={closeModal}>
              İptal
            </button>
          </div>
        </form>
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
