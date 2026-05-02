import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { client } from "../api/client";
import { ConfirmModal } from "../components/ConfirmModal";
import { Modal } from "../components/Modal";
import type { CopperDefinition } from "../types";

type CopperKind = "main" | "branch";

interface CopperDefinitionsPageProps {
  kind: CopperKind;
}

interface MainDraft {
  name: string;
  width_mm: number;
  thickness_mm: number;
  material: string;
  phase_spacing_mm: number;
  busbar_x_mm: number;
  busbar_y_mm: number;
  busbar_z_mm: number;
  busbar_orientation: string;
  busbar_length_mm: number;
}

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

const EMPTY_MAIN: MainDraft = {
  name: "",
  width_mm: 40,
  thickness_mm: 10,
  material: "Cu",
  phase_spacing_mm: 60,
  busbar_x_mm: 120,
  busbar_y_mm: 140,
  busbar_z_mm: 0,
  busbar_orientation: "horizontal",
  busbar_length_mm: 800,
};

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

function buildMainPayload(draft: MainDraft): Omit<CopperDefinition, "id" | "created_at" | "updated_at"> {
  return {
    name: draft.name,
    copper_kind: "main",
    description: null,
    main_width_mm: draft.width_mm,
    main_thickness_mm: draft.thickness_mm,
    main_material: draft.material,
    main_phase_spacing_mm: draft.phase_spacing_mm,
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
    busbar_x_mm: draft.busbar_x_mm,
    busbar_y_mm: draft.busbar_y_mm,
    busbar_z_mm: draft.busbar_z_mm,
    busbar_orientation: draft.busbar_orientation,
    busbar_length_mm: draft.busbar_length_mm,
  };
}

function buildBranchPayload(draft: BranchDraft): Omit<CopperDefinition, "id" | "created_at" | "updated_at"> {
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
  };
}

export function CopperDefinitionsPage({ kind }: CopperDefinitionsPageProps) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState<string>(localStorage.getItem(`copper-def-search-${kind}`) ?? "");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [mainDraft, setMainDraft] = useState<MainDraft>(EMPTY_MAIN);
  const [branchDraft, setBranchDraft] = useState<BranchDraft>(EMPTY_BRANCH);

  const title = kind === "main" ? "Ana Bakir Tanimlama" : "Tali Bakir Tanimlama";
  const createLabel = kind === "main" ? "Yeni Ana Bakir" : "Yeni Tali Bakir";

  const definitionsQuery = useQuery({
    queryKey: ["copper-definitions", kind],
    queryFn: () => client.listCopperDefinitions(kind),
  });

  const definitions = definitionsQuery.data ?? [];
  const filtered = search.trim()
    ? definitions.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()))
    : definitions;

  const createMutation = useMutation({
    mutationFn: () => client.createCopperDefinition(kind === "main" ? buildMainPayload(mainDraft) : buildBranchPayload(branchDraft)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["copper-definitions", kind] });
      setModalOpen(false);
      setMainDraft(EMPTY_MAIN);
      setBranchDraft(EMPTY_BRANCH);
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (definition: CopperDefinition) =>
      client.createCopperDefinition({
        name: `${definition.name} (Kopya)`,
        copper_kind: definition.copper_kind,
        description: definition.description ?? null,
        main_width_mm: definition.main_width_mm ?? null,
        main_thickness_mm: definition.main_thickness_mm ?? null,
        main_material: definition.main_material,
        main_phase_spacing_mm: definition.main_phase_spacing_mm ?? null,
        branch_width_mm: definition.branch_width_mm ?? null,
        branch_thickness_mm: definition.branch_thickness_mm ?? null,
        branch_material: definition.branch_material,
        branch_phase_spacing_mm: definition.branch_phase_spacing_mm ?? null,
        bend_inner_radius_mm: definition.bend_inner_radius_mm ?? null,
        k_factor: definition.k_factor ?? null,
        min_hole_edge_distance_mm: definition.min_hole_edge_distance_mm ?? null,
        min_bend_hole_distance_mm: definition.min_bend_hole_distance_mm ?? null,
        default_hole_diameter_mm: definition.default_hole_diameter_mm ?? null,
        use_slot_holes: definition.use_slot_holes,
        slot_width_mm: definition.slot_width_mm ?? null,
        slot_length_mm: definition.slot_length_mm ?? null,
        density_g_cm3: definition.density_g_cm3 ?? null,
        coating_type: definition.coating_type ?? null,
        busbar_x_mm: definition.busbar_x_mm ?? null,
        busbar_y_mm: definition.busbar_y_mm ?? null,
        busbar_z_mm: definition.busbar_z_mm ?? null,
        busbar_orientation: definition.busbar_orientation ?? null,
        busbar_length_mm: definition.busbar_length_mm ?? null,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["copper-definitions", kind] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: client.deleteCopperDefinition,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["copper-definitions", kind] });
      setDeleteError(null);
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setDeleteError(error.response.data?.detail ?? "Bu bakir tanimi projede kullanildigi icin silinemedi.");
      } else {
        setDeleteError("Silme islemi basarisiz oldu.");
      }
    },
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    localStorage.setItem(`copper-def-search-${kind}`, value);
  }

  return (
    <div className="stack">
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanimlamalar</span>
          <h1>{title}</h1>
          <p>
            {kind === "main"
              ? "Ana bakir kutuphanesini yonetin. Konum, yon, faz araligi ve uzunluk varsayimlari burada tutulur."
              : "Tum tali baglantilarda kullanilacak bakir standardini yonetin. Delik ve bukum parametreleri burada tanimlanir."}
          </p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)}>
          {createLabel}
        </button>
      </section>

      {deleteError && <div className="alert alert-warning">{deleteError}</div>}

      <section className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.9rem", flexWrap: "wrap" }}>
          <input
            type="search"
            className="input"
            placeholder={`${kind === "main" ? "Ana" : "Tali"} bakir ara...`}
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            style={{ flex: 1, maxWidth: "320px" }}
          />
          {search.trim() && (
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              {filtered.length} / {definitions.length} kayit
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
                <th>{kind === "main" ? "Faz Araligi" : "Delik / Bukum"}</th>
                <th>{kind === "main" ? "Konum / Uzunluk" : "Slot"}</th>
                <th>Olusturma</th>
                <th>Revizyon</th>
                <th style={{ borderLeft: "2px solid var(--line)" }}>Islem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((definition) => {
                const width = kind === "main" ? definition.main_width_mm : definition.branch_width_mm;
                const thickness = kind === "main" ? definition.main_thickness_mm : definition.branch_thickness_mm;
                const material = kind === "main" ? definition.main_material : definition.branch_material;
                return (
                  <tr key={definition.id}>
                    <td><strong>{definition.name}</strong></td>
                    <td>{width ?? "-"} x {thickness ?? "-"} mm</td>
                    <td>{material}</td>
                    <td>
                      {kind === "main"
                        ? (definition.main_phase_spacing_mm ? `${definition.main_phase_spacing_mm} mm` : "-")
                        : `Ø${definition.default_hole_diameter_mm ?? "-"} / R${definition.bend_inner_radius_mm ?? "-"}`}
                    </td>
                    <td>
                      {kind === "main"
                        ? `X:${definition.busbar_x_mm ?? "-"} Y:${definition.busbar_y_mm ?? "-"} L:${definition.busbar_length_mm ?? "-"}`
                        : (definition.use_slot_holes ? `${definition.slot_width_mm ?? "-"} x ${definition.slot_length_mm ?? "-"}` : "Slot yok")}
                    </td>
                    <td>{fmtDate(definition.created_at)}</td>
                    <td>{fmtDate(definition.updated_at)}</td>
                    <td className="actions-cell" style={{ borderLeft: "2px solid var(--line)" }}>
                      <button type="button" className="ghost" disabled={cloneMutation.isPending} onClick={() => cloneMutation.mutate(definition)}>
                        Kopyala
                      </button>
                      <button
                        type="button"
                        className="ghost danger"
                        disabled={deleteMutation.isPending}
                        onClick={() =>
                          setConfirmPending({
                            message: `"${definition.name}" bakir tanimini silmek istediginizden emin misiniz?`,
                            onConfirm: () => {
                              deleteMutation.mutate(definition.id);
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
              {!filtered.length && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      {search ? "Arama kriterine uygun bakir tanimi bulunamadi." : "Tanimli bakir yok."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal title={createLabel} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          {kind === "main" ? (
            <>
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Ana Bakir Adi</span>
                <input className="input" value={mainDraft.name} onChange={(e) => setMainDraft((v) => ({ ...v, name: e.target.value }))} required />
              </label>
              <label className="field"><span>Genislik (mm)</span><input className="input" type="number" value={mainDraft.width_mm} onChange={(e) => setMainDraft((v) => ({ ...v, width_mm: Number(e.target.value) }))} /></label>
              <label className="field"><span>Kalinlik (mm)</span><input className="input" type="number" value={mainDraft.thickness_mm} onChange={(e) => setMainDraft((v) => ({ ...v, thickness_mm: Number(e.target.value) }))} /></label>
              <label className="field"><span>Malzeme</span><select className="input" value={mainDraft.material} onChange={(e) => setMainDraft((v) => ({ ...v, material: e.target.value }))}><option value="Cu">Cu</option><option value="Al">Al</option></select></label>
              <label className="field"><span>Faz Araligi (mm)</span><input className="input" type="number" value={mainDraft.phase_spacing_mm} onChange={(e) => setMainDraft((v) => ({ ...v, phase_spacing_mm: Number(e.target.value) }))} /></label>
              <label className="field"><span>X (mm)</span><input className="input" type="number" value={mainDraft.busbar_x_mm} onChange={(e) => setMainDraft((v) => ({ ...v, busbar_x_mm: Number(e.target.value) }))} /></label>
              <label className="field"><span>Y (mm)</span><input className="input" type="number" value={mainDraft.busbar_y_mm} onChange={(e) => setMainDraft((v) => ({ ...v, busbar_y_mm: Number(e.target.value) }))} /></label>
              <label className="field"><span>Z (mm)</span><input className="input" type="number" value={mainDraft.busbar_z_mm} onChange={(e) => setMainDraft((v) => ({ ...v, busbar_z_mm: Number(e.target.value) }))} /></label>
              <label className="field"><span>Yon</span><select className="input" value={mainDraft.busbar_orientation} onChange={(e) => setMainDraft((v) => ({ ...v, busbar_orientation: e.target.value }))}><option value="horizontal">Yatay</option><option value="vertical">Dikey</option></select></label>
              <label className="field"><span>Uzunluk (mm)</span><input className="input" type="number" value={mainDraft.busbar_length_mm} onChange={(e) => setMainDraft((v) => ({ ...v, busbar_length_mm: Number(e.target.value) }))} /></label>
            </>
          ) : (
            <>
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Tali Bakir Adi</span>
                <input className="input" value={branchDraft.name} onChange={(e) => setBranchDraft((v) => ({ ...v, name: e.target.value }))} required />
              </label>
              <label className="field"><span>Genislik (mm)</span><input className="input" type="number" value={branchDraft.width_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, width_mm: Number(e.target.value) }))} /></label>
              <label className="field"><span>Kalinlik (mm)</span><input className="input" type="number" value={branchDraft.thickness_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, thickness_mm: Number(e.target.value) }))} /></label>
              <label className="field"><span>Malzeme</span><select className="input" value={branchDraft.material} onChange={(e) => setBranchDraft((v) => ({ ...v, material: e.target.value }))}><option value="Cu">Cu</option><option value="Al">Al</option></select></label>
              <label className="field"><span>Bukum Ic R (mm)</span><input className="input" type="number" value={branchDraft.bend_inner_radius_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, bend_inner_radius_mm: Number(e.target.value) }))} /></label>
              <label className="field"><span>Delik Capi (mm)</span><input className="input" type="number" value={branchDraft.default_hole_diameter_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, default_hole_diameter_mm: Number(e.target.value) }))} /></label>
              <label className="field"><span>Min. Delik Kenar (mm)</span><input className="input" type="number" value={branchDraft.min_hole_edge_distance_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, min_hole_edge_distance_mm: Number(e.target.value) }))} /></label>
              <label className="field"><span>Min. Delik-Bukum (mm)</span><input className="input" type="number" value={branchDraft.min_bend_hole_distance_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, min_bend_hole_distance_mm: Number(e.target.value) }))} /></label>
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Slot Delik</span>
                <label style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <input type="checkbox" checked={branchDraft.use_slot_holes} onChange={(e) => setBranchDraft((v) => ({ ...v, use_slot_holes: e.target.checked }))} />
                  <span>Oval delik kullanilsin</span>
                </label>
              </label>
              {branchDraft.use_slot_holes && (
                <>
                  <label className="field"><span>Slot Genisligi (mm)</span><input className="input" type="number" value={branchDraft.slot_width_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, slot_width_mm: Number(e.target.value) }))} /></label>
                  <label className="field"><span>Slot Uzunlugu (mm)</span><input className="input" type="number" value={branchDraft.slot_length_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, slot_length_mm: Number(e.target.value) }))} /></label>
                </>
              )}
            </>
          )}

          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
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
