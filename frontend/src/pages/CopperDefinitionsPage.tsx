import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { client } from "../api/client";
import { ConfirmModal } from "../components/ConfirmModal";
import { Modal } from "../components/Modal";
import type { CopperDefinition } from "../types";

// ─── Branch (Tali Bakır) draft ─────────────────────────────────────────────
interface BranchDraft {
  name: string;
  width_mm: number;
  thickness_mm: number;
  material: string;
  bend_inner_radius_mm: number;
  default_hole_diameter_mm: number;
  min_hole_edge_distance_mm: number;
  min_bend_hole_distance_mm: number;
  use_slot_holes: boolean;
  slot_width_mm: number;
  slot_length_mm: number;
}

const EMPTY_BRANCH: BranchDraft = {
  name: "",
  width_mm: 30,
  thickness_mm: 5,
  material: "Cu",
  bend_inner_radius_mm: 10,
  default_hole_diameter_mm: 11,
  min_hole_edge_distance_mm: 15,
  min_bend_hole_distance_mm: 15,
  use_slot_holes: false,
  slot_width_mm: 12,
  slot_length_mm: 18,
};

function fmtDate(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

function buildBranchPayload(
  draft: BranchDraft,
): Omit<CopperDefinition, "id" | "created_at" | "updated_at"> {
  return {
    name: draft.name,
    copper_kind: "branch",
    description: null,
    main_width_mm: null,
    main_thickness_mm: null,
    main_material: "Cu",
    main_phase_spacing_mm: null,
    branch_width_mm: draft.width_mm,
    branch_thickness_mm: draft.thickness_mm,
    branch_material: draft.material,
    branch_phase_spacing_mm: null,
    bend_inner_radius_mm: draft.bend_inner_radius_mm,
    k_factor: 0.33,
    min_hole_edge_distance_mm: draft.min_hole_edge_distance_mm,
    min_bend_hole_distance_mm: draft.min_bend_hole_distance_mm,
    default_hole_diameter_mm: draft.default_hole_diameter_mm,
    use_slot_holes: draft.use_slot_holes,
    slot_width_mm: draft.use_slot_holes ? draft.slot_width_mm : null,
    slot_length_mm: draft.use_slot_holes ? draft.slot_length_mm : null,
    density_g_cm3: null,
    coating_type: null,
    busbar_x_mm: null,
    busbar_y_mm: null,
    busbar_z_mm: null,
    busbar_orientation: null,
    busbar_length_mm: null,
    phase_type: null,
    bars_per_phase: null,
    bar_gap_mm: null,
    phase_center_mm: null,
    layer_type: null,
    neutral_bar_count: null,
  };
}

// ─── Sayfa ─────────────────────────────────────────────────────────────────
export function CopperDefinitionsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<CopperDefinition | null>(null);
  const [search, setSearch] = useState<string>(
    localStorage.getItem("copper-def-search-branch") ?? "",
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [draft, setDraft] = useState<BranchDraft>(EMPTY_BRANCH);

  const definitionsQuery = useQuery({
    queryKey: ["copper-definitions", "branch"],
    queryFn: () => client.listCopperDefinitions("branch"),
  });

  const definitions = definitionsQuery.data ?? [];
  const filtered = search.trim()
    ? definitions.filter((d) =>
        d.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : definitions;

  function openCreate() {
    setEditingDef(null);
    setDraft(EMPTY_BRANCH);
    setModalOpen(true);
  }

  function openEdit(def: CopperDefinition) {
    setEditingDef(def);
    setDraft({
      name: def.name,
      width_mm: Number(def.branch_width_mm ?? 30),
      thickness_mm: Number(def.branch_thickness_mm ?? 5),
      material: def.branch_material ?? "Cu",
      bend_inner_radius_mm: Number(def.bend_inner_radius_mm ?? 10),
      default_hole_diameter_mm: Number(def.default_hole_diameter_mm ?? 11),
      min_hole_edge_distance_mm: Number(def.min_hole_edge_distance_mm ?? 15),
      min_bend_hole_distance_mm: Number(def.min_bend_hole_distance_mm ?? 15),
      use_slot_holes: def.use_slot_holes ?? false,
      slot_width_mm: Number(def.slot_width_mm ?? 12),
      slot_length_mm: Number(def.slot_length_mm ?? 18),
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingDef(null);
    setDraft(EMPTY_BRANCH);
  }

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["copper-definitions", "branch"] });

  const createMutation = useMutation({
    mutationFn: () => client.createCopperDefinition(buildBranchPayload(draft)),
    onSuccess: async () => { await invalidate(); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      client.updateCopperDefinition(editingDef!.id, buildBranchPayload(draft)),
    onSuccess: async () => { await invalidate(); closeModal(); },
  });

  const cloneMutation = useMutation({
    mutationFn: (def: CopperDefinition) =>
      client.createCopperDefinition(
        buildBranchPayload({
          name: `${def.name} (Kopya)`,
          width_mm: Number(def.branch_width_mm ?? 30),
          thickness_mm: Number(def.branch_thickness_mm ?? 5),
          material: def.branch_material ?? "Cu",
          bend_inner_radius_mm: Number(def.bend_inner_radius_mm ?? 10),
          default_hole_diameter_mm: Number(def.default_hole_diameter_mm ?? 11),
          min_hole_edge_distance_mm: Number(def.min_hole_edge_distance_mm ?? 15),
          min_bend_hole_distance_mm: Number(def.min_bend_hole_distance_mm ?? 15),
          use_slot_holes: def.use_slot_holes ?? false,
          slot_width_mm: Number(def.slot_width_mm ?? 12),
          slot_length_mm: Number(def.slot_length_mm ?? 18),
        }),
      ),
    onSuccess: async () => { await invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: client.deleteCopperDefinition,
    onSuccess: async () => { await invalidate(); setDeleteError(null); },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setDeleteError(
          error.response.data?.detail ??
            "Bu bakır tanımı projede kullanıldığı için silinemedi.",
        );
      } else {
        setDeleteError("Silme işlemi başarısız oldu.");
      }
    },
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    localStorage.setItem("copper-def-search-branch", value);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="stack">
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanımlamalar</span>
          <h1>Tali Bakır Tanımlama</h1>
          <p>
            Tüm tali bağlantılarda kullanılacak bakır standardını yönetin.
            Delik ve büküm parametreleri burada tanımlanır.
          </p>
        </div>
        <button type="button" onClick={openCreate}>
          Yeni Tali Bakır
        </button>
      </section>

      {deleteError && <div className="alert alert-warning">{deleteError}</div>}

      <section className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.9rem",
            flexWrap: "wrap",
          }}
        >
          <input
            type="search"
            className="input"
            placeholder="Tali bakır ara..."
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
                <th>Malzeme</th>
                <th>Delik / Büküm</th>
                <th>Slot</th>
                <th>Oluşturma</th>
                <th>Revizyon</th>
                <th style={{ borderLeft: "2px solid var(--line)" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((def) => (
                <tr key={def.id}>
                  <td>
                    <strong>{def.name}</strong>
                  </td>
                  <td>
                    {def.branch_width_mm ?? "-"} × {def.branch_thickness_mm ?? "-"} mm
                  </td>
                  <td>{def.branch_material}</td>
                  <td>
                    Ø{def.default_hole_diameter_mm ?? "-"} / R{def.bend_inner_radius_mm ?? "-"}
                  </td>
                  <td>
                    {def.use_slot_holes
                      ? `${def.slot_width_mm ?? "-"} × ${def.slot_length_mm ?? "-"}`
                      : "—"}
                  </td>
                  <td>{fmtDate(def.created_at)}</td>
                  <td>{fmtDate(def.updated_at)}</td>
                  <td
                    className="actions-cell"
                    style={{ borderLeft: "2px solid var(--line)" }}
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
                          message: `"${def.name}" bakır tanımını silmek istediğinizden emin misiniz?`,
                          onConfirm: () => {
                            deleteMutation.mutate(def.id);
                            setConfirmPending(null);
                          },
                        })
                      }
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      {search
                        ? "Arama kriterine uygun bakır tanımı bulunamadı."
                        : "Tanımlı tali bakır yok."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Modal ── */}
      <Modal
        title={editingDef ? "Tali Bakırı Düzenle" : "Yeni Tali Bakır"}
        open={modalOpen}
        onClose={closeModal}
      >
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            editingDef ? updateMutation.mutate() : createMutation.mutate();
          }}
        >
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Tali Bakır Adı</span>
            <input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft((v) => ({ ...v, name: e.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Genişlik (mm)</span>
            <input className="input" type="number" value={draft.width_mm}
              onChange={(e) => setDraft((v) => ({ ...v, width_mm: Number(e.target.value) }))} />
          </label>
          <label className="field">
            <span>Kalınlık (mm)</span>
            <input className="input" type="number" value={draft.thickness_mm}
              onChange={(e) => setDraft((v) => ({ ...v, thickness_mm: Number(e.target.value) }))} />
          </label>
          <label className="field">
            <span>Malzeme</span>
            <select className="input" value={draft.material}
              onChange={(e) => setDraft((v) => ({ ...v, material: e.target.value }))}>
              <option value="Cu">Cu</option>
              <option value="Al">Al</option>
            </select>
          </label>
          <label className="field">
            <span>Büküm İç R (mm)</span>
            <input className="input" type="number" value={draft.bend_inner_radius_mm}
              onChange={(e) => setDraft((v) => ({ ...v, bend_inner_radius_mm: Number(e.target.value) }))} />
          </label>
          <label className="field">
            <span>Delik Çapı (mm)</span>
            <input className="input" type="number" value={draft.default_hole_diameter_mm}
              onChange={(e) => setDraft((v) => ({ ...v, default_hole_diameter_mm: Number(e.target.value) }))} />
          </label>
          <label className="field">
            <span>Min. Delik Kenar (mm)</span>
            <input className="input" type="number" value={draft.min_hole_edge_distance_mm}
              onChange={(e) => setDraft((v) => ({ ...v, min_hole_edge_distance_mm: Number(e.target.value) }))} />
          </label>
          <label className="field">
            <span>Min. Delik-Büküm (mm)</span>
            <input className="input" type="number" value={draft.min_bend_hole_distance_mm}
              onChange={(e) => setDraft((v) => ({ ...v, min_bend_hole_distance_mm: Number(e.target.value) }))} />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Slot Delik</span>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <input type="checkbox" checked={draft.use_slot_holes}
                onChange={(e) => setDraft((v) => ({ ...v, use_slot_holes: e.target.checked }))} />
              <span>Oval delik kullanılsın</span>
            </label>
          </label>
          {draft.use_slot_holes && (
            <>
              <label className="field">
                <span>Slot Genişliği (mm)</span>
                <input className="input" type="number" value={draft.slot_width_mm}
                  onChange={(e) => setDraft((v) => ({ ...v, slot_width_mm: Number(e.target.value) }))} />
              </label>
              <label className="field">
                <span>Slot Uzunluğu (mm)</span>
                <input className="input" type="number" value={draft.slot_length_mm}
                  onChange={(e) => setDraft((v) => ({ ...v, slot_length_mm: Number(e.target.value) }))} />
              </label>
            </>
          )}
          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : editingDef ? "Güncelle" : "Kaydet"}
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
