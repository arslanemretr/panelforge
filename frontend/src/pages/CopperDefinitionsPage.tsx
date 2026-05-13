import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { client } from "../api/client";
import { BendPreview } from "../components/BendPreview";
import { ConfirmModal } from "../components/ConfirmModal";
import { Modal } from "../components/Modal";
import type { BendType, BranchConductor, CopperDefinition } from "../types";

// ─── Yardımcı ─────────────────────────────────────────────────────────────────
function fmtDate(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

const PHASES = ["L1", "L2", "L3", "N", "PE", "3P", "L1+L2+L3"];
const KIND_COLORS: Record<string, string> = {
  dahili: "rgba(52,211,153,0.15)",
  harici: "rgba(251,191,36,0.15)",
};

// ─── Malzeme (Branch CopperDefinition) Draft ──────────────────────────────────
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

// ─── İletken Konfigürasyon Draft ──────────────────────────────────────────────
interface ConductorDraft {
  name: string;
  description: string;
  conductor_kind: "dahili" | "harici";
  material_source: "ref" | "manual";
  copper_definition_id: number | null;
  thickness_mm: number | null;
  width_mm: number | null;
  bend_type_id: number | null;
  device_id: number | null;
  terminal_label: string;
  phase: string;
  parallel_count: number;
  start_point: string;
  end_point: string;
}

const EMPTY_CONDUCTOR: ConductorDraft = {
  name: "",
  description: "",
  conductor_kind: "dahili",
  material_source: "ref",
  copper_definition_id: null,
  thickness_mm: null,
  width_mm: null,
  bend_type_id: null,
  device_id: null,
  terminal_label: "",
  phase: "L1",
  parallel_count: 1,
  start_point: "",
  end_point: "",
};

function buildConductorPayload(draft: ConductorDraft) {
  return {
    name: draft.name,
    description: draft.description || null,
    conductor_kind: draft.conductor_kind,
    copper_definition_id: draft.material_source === "ref" ? draft.copper_definition_id : null,
    thickness_mm: draft.material_source === "manual" ? draft.thickness_mm : null,
    width_mm: draft.material_source === "manual" ? draft.width_mm : null,
    bend_type_id: draft.bend_type_id,
    device_id: draft.device_id,
    terminal_label: draft.terminal_label || null,
    phase: draft.phase || null,
    parallel_count: draft.parallel_count,
    start_point: draft.start_point || null,
    end_point: draft.end_point || null,
  };
}

// ─── Sayfa ─────────────────────────────────────────────────────────────────────
export function CopperDefinitionsPage() {
  const qc = useQueryClient();

  // ── Malzeme state ──────────────────────────────────────────────────────────
  const [matModalOpen, setMatModalOpen]     = useState(false);
  const [editingMat, setEditingMat]         = useState<CopperDefinition | null>(null);
  const [matDraft, setMatDraft]             = useState<BranchDraft>(EMPTY_BRANCH);
  const [matSearch, setMatSearch]           = useState("");
  const [matDeleteError, setMatDeleteError] = useState<string | null>(null);

  // ── İletken state ─────────────────────────────────────────────────────────
  const [condModalOpen, setCondModalOpen]       = useState(false);
  const [editingCond, setEditingCond]           = useState<BranchConductor | null>(null);
  const [condDraft, setCondDraft]               = useState<ConductorDraft>(EMPTY_CONDUCTOR);
  const [condSearch, setCondSearch]             = useState("");
  const [kindFilter, setKindFilter]             = useState<"all" | "dahili" | "harici">("all");
  const [condDeleteError, setCondDeleteError]   = useState<string | null>(null);
  const [selectedBendType, setSelectedBendType] = useState<BendType | null>(null);

  // ── Onay modal ─────────────────────────────────────────────────────────────
  const [confirmPending, setConfirmPending] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const matQuery   = useQuery({ queryKey: ["copper-definitions", "branch"], queryFn: () => client.listCopperDefinitions("branch") });
  const condQuery  = useQuery({ queryKey: ["branch-conductors"], queryFn: client.listBranchConductors });
  const btQuery    = useQuery({ queryKey: ["bend-types"], queryFn: client.listBendTypes });
  const devQuery   = useQuery({ queryKey: ["devices"], queryFn: client.listDevices });

  const matDefs   = matQuery.data ?? [];
  const conductors = condQuery.data ?? [];
  const bendTypes  = btQuery.data ?? [];
  const devices    = devQuery.data ?? [];

  // Büküm tipi seçilince tam detay çek (önizleme için)
  useEffect(() => {
    if (condDraft.bend_type_id) {
      client.getBendType(condDraft.bend_type_id).then(setSelectedBendType);
    } else {
      setSelectedBendType(null);
    }
  }, [condDraft.bend_type_id]);

  // ── Filtreleme ─────────────────────────────────────────────────────────────
  const filteredMat = matSearch.trim()
    ? matDefs.filter((d) => d.name.toLowerCase().includes(matSearch.toLowerCase()))
    : matDefs;

  const filteredCond = conductors.filter((c) => {
    const kindOk = kindFilter === "all" || c.conductor_kind === kindFilter;
    const searchOk = !condSearch.trim() ||
      c.name.toLowerCase().includes(condSearch.toLowerCase()) ||
      (c.device?.brand + " " + c.device?.model).toLowerCase().includes(condSearch.toLowerCase());
    return kindOk && searchOk;
  });

  // ── Invalidate helpers ────────────────────────────────────────────────────
  const invalidateMat  = () => qc.invalidateQueries({ queryKey: ["copper-definitions", "branch"] });
  const invalidateCond = () => qc.invalidateQueries({ queryKey: ["branch-conductors"] });

  // ── Malzeme mutations ─────────────────────────────────────────────────────
  const matCreateMutation = useMutation({
    mutationFn: () => client.createCopperDefinition(buildBranchPayload(matDraft)),
    onSuccess: async () => { await invalidateMat(); setMatModalOpen(false); setMatDraft(EMPTY_BRANCH); },
  });
  const matUpdateMutation = useMutation({
    mutationFn: () => client.updateCopperDefinition(editingMat!.id, buildBranchPayload(matDraft)),
    onSuccess: async () => { await invalidateMat(); setMatModalOpen(false); setEditingMat(null); },
  });
  const matCloneMutation = useMutation({
    mutationFn: (def: CopperDefinition) => client.createCopperDefinition(
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
    onSuccess: async () => { await invalidateMat(); },
  });
  const matDeleteMutation = useMutation({
    mutationFn: client.deleteCopperDefinition,
    onSuccess: async () => { await invalidateMat(); setMatDeleteError(null); },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err) && err.response?.status === 409)
        setMatDeleteError(err.response.data?.detail ?? "Bu malzeme kullanıldığı için silinemedi.");
      else setMatDeleteError("Silme işlemi başarısız oldu.");
    },
  });

  function openMatCreate() { setEditingMat(null); setMatDraft(EMPTY_BRANCH); setMatModalOpen(true); }
  function openMatEdit(def: CopperDefinition) {
    setEditingMat(def);
    setMatDraft({
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
    setMatModalOpen(true);
  }

  // ── İletken mutations ─────────────────────────────────────────────────────
  const condCreateMutation = useMutation({
    mutationFn: () => client.createBranchConductor(buildConductorPayload(condDraft) as any),
    onSuccess: async () => { await invalidateCond(); setCondModalOpen(false); setCondDraft(EMPTY_CONDUCTOR); setSelectedBendType(null); },
  });
  const condUpdateMutation = useMutation({
    mutationFn: () => client.updateBranchConductor(editingCond!.id, buildConductorPayload(condDraft) as any),
    onSuccess: async () => { await invalidateCond(); setCondModalOpen(false); setEditingCond(null); setCondDraft(EMPTY_CONDUCTOR); setSelectedBendType(null); },
  });
  const condCloneMutation = useMutation({
    mutationFn: (c: BranchConductor) => client.createBranchConductor({
      ...buildConductorPayload({
        name: `${c.name} (Kopya)`,
        description: c.description ?? "",
        conductor_kind: c.conductor_kind as "dahili" | "harici",
        material_source: c.copper_definition_id ? "ref" : "manual",
        copper_definition_id: c.copper_definition_id ?? null,
        thickness_mm: c.thickness_mm ?? null,
        width_mm: c.width_mm ?? null,
        bend_type_id: c.bend_type_id ?? null,
        device_id: c.device_id ?? null,
        terminal_label: c.terminal_label ?? "",
        phase: c.phase ?? "L1",
        parallel_count: c.parallel_count,
        start_point: c.start_point ?? "",
        end_point: c.end_point ?? "",
      }),
    } as any),
    onSuccess: async () => { await invalidateCond(); },
  });
  const condDeleteMutation = useMutation({
    mutationFn: client.deleteBranchConductor,
    onSuccess: async () => { await invalidateCond(); setCondDeleteError(null); },
    onError: () => setCondDeleteError("Silme işlemi başarısız oldu."),
  });

  function openCondCreate() {
    setEditingCond(null);
    setCondDraft(EMPTY_CONDUCTOR);
    setSelectedBendType(null);
    setCondModalOpen(true);
  }
  function openCondEdit(c: BranchConductor) {
    setEditingCond(c);
    setCondDraft({
      name: c.name,
      description: c.description ?? "",
      conductor_kind: c.conductor_kind as "dahili" | "harici",
      material_source: c.copper_definition_id ? "ref" : "manual",
      copper_definition_id: c.copper_definition_id ?? null,
      thickness_mm: c.thickness_mm ?? null,
      width_mm: c.width_mm ?? null,
      bend_type_id: c.bend_type_id ?? null,
      device_id: c.device_id ?? null,
      terminal_label: c.terminal_label ?? "",
      phase: c.phase ?? "L1",
      parallel_count: c.parallel_count,
      start_point: c.start_point ?? "",
      end_point: c.end_point ?? "",
    });
    setCondModalOpen(true);
  }
  function closeCondModal() {
    setCondModalOpen(false);
    setEditingCond(null);
    setCondDraft(EMPTY_CONDUCTOR);
    setSelectedBendType(null);
  }

  const isMatSaving  = matCreateMutation.isPending || matUpdateMutation.isPending;
  const isCondSaving = condCreateMutation.isPending || condUpdateMutation.isPending;

  // Seçili cihazın terminalleri
  const selectedDevice = devices.find((d) => d.id === condDraft.device_id);
  const deviceTerminals = selectedDevice?.terminals ?? [];

  return (
    <div className="stack">
      {/* ── Başlık ──────────────────────────────────────────────────────────── */}
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanımlamalar</span>
          <h1>Tali Bakır Tanımlama</h1>
          <p>
            Cihaz bağlantılarında kullanılacak tali iletkenleri yönetin.
            Dahili ve harici iletkenleri; cihaz, terminal ve büküm tipi ilişkisiyle tanımlayın.
          </p>
        </div>
        <button type="button" onClick={openCondCreate}>
          Yeni İletken Konfigürasyonu
        </button>
      </section>

      {/* ── İletken Konfigürasyonları ───────────────────────────────────────── */}
      <section className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.9rem", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>İletken Konfigürasyonları</h2>
          <div style={{ display: "flex", gap: "0.4rem", marginLeft: "auto" }}>
            {(["all", "dahili", "harici"] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={kindFilter === k ? "btn-primary" : "ghost"}
                style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                onClick={() => setKindFilter(k)}
              >
                {k === "all" ? "Tümü" : k === "dahili" ? "Dahili" : "Harici"}
              </button>
            ))}
          </div>
          <input
            type="search"
            className="input"
            placeholder="İletken ara..."
            value={condSearch}
            onChange={(e) => setCondSearch(e.target.value)}
            style={{ maxWidth: "220px" }}
          />
        </div>

        {condDeleteError && <div className="alert alert-warning" style={{ marginBottom: "0.75rem" }}>{condDeleteError}</div>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ad</th>
                <th>Tip</th>
                <th>Cihaz</th>
                <th>Terminal</th>
                <th>Büküm Tipi</th>
                <th>Kesit</th>
                <th>Faz</th>
                <th>Paralel</th>
                <th style={{ borderLeft: "2px solid var(--line)" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredCond.map((c) => {
                const kSection = c.copper_definition
                  ? `${c.copper_definition.branch_width_mm ?? c.width_mm ?? "-"} × ${c.copper_definition.branch_thickness_mm ?? c.thickness_mm ?? "-"} mm`
                  : c.width_mm && c.thickness_mm
                  ? `${c.width_mm} × ${c.thickness_mm} mm`
                  : "—";
                return (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong></td>
                    <td>
                      <span style={{
                        padding: "2px 8px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600,
                        background: KIND_COLORS[c.conductor_kind] ?? "rgba(161,188,220,0.1)",
                      }}>
                        {c.conductor_kind === "dahili" ? "Dahili" : "Harici"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>
                      {c.device ? `${c.device.brand} ${c.device.model}` : "—"}
                    </td>
                    <td style={{ fontSize: "0.82rem" }}>{c.terminal_label || "—"}</td>
                    <td style={{ fontSize: "0.82rem" }}>{c.bend_type?.name ?? "—"}</td>
                    <td style={{ fontSize: "0.82rem" }}>{kSection}</td>
                    <td style={{ fontSize: "0.82rem" }}>{c.phase || "—"}</td>
                    <td style={{ fontSize: "0.82rem" }}>{c.parallel_count}</td>
                    <td className="actions-cell" style={{ borderLeft: "2px solid var(--line)" }}>
                      <button type="button" className="ghost" onClick={() => openCondEdit(c)}>Düzenle</button>
                      <button type="button" className="ghost" disabled={condCloneMutation.isPending} onClick={() => condCloneMutation.mutate(c)}>Kopyala</button>
                      <button type="button" className="ghost danger" disabled={condDeleteMutation.isPending}
                        onClick={() => setConfirmPending({
                          message: `"${c.name}" iletken konfigürasyonunu silmek istediğinizden emin misiniz?`,
                          onConfirm: () => { condDeleteMutation.mutate(c.id); setConfirmPending(null); },
                        })}>
                        Sil
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filteredCond.length && (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state">
                      {condSearch || kindFilter !== "all"
                        ? "Arama kriterine uygun iletken bulunamadı."
                        : "Tanımlı iletken konfigürasyonu yok."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Malzeme Standartları ────────────────────────────────────────────── */}
      <section className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.9rem", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Malzeme Standartları</h2>
          <button type="button" className="ghost" style={{ marginLeft: "auto", fontSize: "0.82rem" }} onClick={openMatCreate}>
            + Yeni Malzeme
          </button>
          <input
            type="search"
            className="input"
            placeholder="Malzeme ara..."
            value={matSearch}
            onChange={(e) => setMatSearch(e.target.value)}
            style={{ maxWidth: "200px" }}
          />
        </div>

        {matDeleteError && <div className="alert alert-warning" style={{ marginBottom: "0.75rem" }}>{matDeleteError}</div>}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ad</th>
                <th>Kesit</th>
                <th>Malzeme</th>
                <th>Delik / Büküm R</th>
                <th>Slot</th>
                <th>Oluşturma</th>
                <th>Revizyon</th>
                <th style={{ borderLeft: "2px solid var(--line)" }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredMat.map((def) => (
                <tr key={def.id}>
                  <td><strong>{def.name}</strong></td>
                  <td>{def.branch_width_mm ?? "-"} × {def.branch_thickness_mm ?? "-"} mm</td>
                  <td>{def.branch_material}</td>
                  <td>Ø{def.default_hole_diameter_mm ?? "-"} / R{def.bend_inner_radius_mm ?? "-"}</td>
                  <td>{def.use_slot_holes ? `${def.slot_width_mm ?? "-"} × ${def.slot_length_mm ?? "-"}` : "—"}</td>
                  <td>{fmtDate(def.created_at)}</td>
                  <td>{fmtDate(def.updated_at)}</td>
                  <td className="actions-cell" style={{ borderLeft: "2px solid var(--line)" }}>
                    <button type="button" className="ghost" onClick={() => openMatEdit(def)}>Düzenle</button>
                    <button type="button" className="ghost" disabled={matCloneMutation.isPending} onClick={() => matCloneMutation.mutate(def)}>Kopyala</button>
                    <button type="button" className="ghost danger" disabled={matDeleteMutation.isPending}
                      onClick={() => setConfirmPending({
                        message: `"${def.name}" malzeme standardını silmek istediğinizden emin misiniz?`,
                        onConfirm: () => { matDeleteMutation.mutate(def.id); setConfirmPending(null); },
                      })}>
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredMat.length && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      {matSearch ? "Arama kriterine uygun malzeme bulunamadı." : "Tanımlı malzeme standardı yok."}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          İLETKEN KONFİGÜRASYON MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        title={editingCond ? "İletken Konfigürasyonunu Düzenle" : "Yeni İletken Konfigürasyonu"}
        open={condModalOpen}
        onClose={closeCondModal}
      >
        <div style={{ display: "grid", gridTemplateColumns: selectedBendType ? "1fr 1fr" : "1fr", gap: "1.5rem" }}>
          {/* Sol: Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              editingCond ? condUpdateMutation.mutate() : condCreateMutation.mutate();
            }}
          >
            {/* Temel Bilgiler */}
            <fieldset style={{ border: "none", padding: 0, margin: "0 0 1rem" }}>
              <legend style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Temel Bilgiler
              </legend>
              <div className="form-grid">
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Ad</span>
                  <input className="input" value={condDraft.name} required
                    onChange={(e) => setCondDraft((v) => ({ ...v, name: e.target.value }))} />
                </label>
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Açıklama</span>
                  <input className="input" value={condDraft.description}
                    onChange={(e) => setCondDraft((v) => ({ ...v, description: e.target.value }))} />
                </label>
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>İletken Tipi</span>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    {(["dahili", "harici"] as const).map((k) => (
                      <label key={k} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                        <input type="radio" name="conductor_kind" value={k}
                          checked={condDraft.conductor_kind === k}
                          onChange={() => setCondDraft((v) => ({ ...v, conductor_kind: k }))} />
                        <span style={{ fontWeight: condDraft.conductor_kind === k ? 700 : 400 }}>
                          {k === "dahili" ? "Dahili" : "Harici"}
                        </span>
                      </label>
                    ))}
                  </div>
                </label>
              </div>
            </fieldset>

            {/* Cihaz & Terminal */}
            <fieldset style={{ border: "none", padding: 0, margin: "0 0 1rem" }}>
              <legend style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Cihaz & Terminal
              </legend>
              <div className="form-grid">
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Cihaz</span>
                  <select className="input" value={condDraft.device_id ?? ""}
                    onChange={(e) => setCondDraft((v) => ({ ...v, device_id: e.target.value ? Number(e.target.value) : null, terminal_label: "" }))}>
                    <option value="">— Cihaz seçin (opsiyonel) —</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>{d.brand} {d.model} ({d.device_type})</option>
                    ))}
                  </select>
                </label>
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Terminal</span>
                  {deviceTerminals.length > 0 ? (
                    <select className="input" value={condDraft.terminal_label}
                      onChange={(e) => setCondDraft((v) => ({ ...v, terminal_label: e.target.value }))}>
                      <option value="">— Terminal seçin —</option>
                      {deviceTerminals.map((t, i) => (
                        <option key={i} value={t.terminal_name}>
                          {t.terminal_name} ({t.phase})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input className="input" placeholder="Terminal adı (serbest metin)"
                      value={condDraft.terminal_label}
                      onChange={(e) => setCondDraft((v) => ({ ...v, terminal_label: e.target.value }))} />
                  )}
                </label>
              </div>
            </fieldset>

            {/* Büküm Tipi */}
            <fieldset style={{ border: "none", padding: 0, margin: "0 0 1rem" }}>
              <legend style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Büküm Tipi
              </legend>
              <div className="form-grid">
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Büküm Tipi</span>
                  <select className="input" value={condDraft.bend_type_id ?? ""}
                    onChange={(e) => setCondDraft((v) => ({ ...v, bend_type_id: e.target.value ? Number(e.target.value) : null }))}>
                    <option value="">— Büküm tipi seçin (opsiyonel) —</option>
                    {bendTypes.map((bt) => (
                      <option key={bt.id} value={bt.id}>
                        {bt.name} ({bt.template_type}) — {bt.thickness_mm}mm × {bt.parallel_count}'li
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </fieldset>

            {/* Malzeme */}
            <fieldset style={{ border: "none", padding: 0, margin: "0 0 1rem" }}>
              <legend style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Malzeme
              </legend>
              <div className="form-grid">
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Malzeme Kaynağı</span>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    {(["ref", "manual"] as const).map((s) => (
                      <label key={s} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}>
                        <input type="radio" name="material_source" value={s}
                          checked={condDraft.material_source === s}
                          onChange={() => setCondDraft((v) => ({ ...v, material_source: s }))} />
                        <span>{s === "ref" ? "Standarttan Seç" : "Manuel Gir"}</span>
                      </label>
                    ))}
                  </div>
                </label>
                {condDraft.material_source === "ref" ? (
                  <label className="field" style={{ gridColumn: "1 / -1" }}>
                    <span>Malzeme Standardı</span>
                    <select className="input" value={condDraft.copper_definition_id ?? ""}
                      onChange={(e) => setCondDraft((v) => ({ ...v, copper_definition_id: e.target.value ? Number(e.target.value) : null }))}>
                      <option value="">— Malzeme seçin —</option>
                      {matDefs.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.branch_width_mm}×{m.branch_thickness_mm} mm, {m.branch_material})
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <>
                    <label className="field">
                      <span>Genişlik (mm)</span>
                      <input className="input" type="number" value={condDraft.width_mm ?? ""}
                        onChange={(e) => setCondDraft((v) => ({ ...v, width_mm: e.target.value ? Number(e.target.value) : null }))} />
                    </label>
                    <label className="field">
                      <span>Kalınlık (mm)</span>
                      <input className="input" type="number" value={condDraft.thickness_mm ?? ""}
                        onChange={(e) => setCondDraft((v) => ({ ...v, thickness_mm: e.target.value ? Number(e.target.value) : null }))} />
                    </label>
                  </>
                )}
              </div>
            </fieldset>

            {/* Elektrik & Bağlantı */}
            <fieldset style={{ border: "none", padding: 0, margin: "0 0 1rem" }}>
              <legend style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Elektrik & Bağlantı
              </legend>
              <div className="form-grid">
                <label className="field">
                  <span>Faz</span>
                  <select className="input" value={condDraft.phase}
                    onChange={(e) => setCondDraft((v) => ({ ...v, phase: e.target.value }))}>
                    <option value="">—</option>
                    {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Paralel Adet</span>
                  <input className="input" type="number" min={1} max={8} value={condDraft.parallel_count}
                    onChange={(e) => setCondDraft((v) => ({ ...v, parallel_count: Number(e.target.value) }))} />
                </label>
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Başlangıç Noktası</span>
                  <input className="input" value={condDraft.start_point} placeholder="ör. Cihaz terminali"
                    onChange={(e) => setCondDraft((v) => ({ ...v, start_point: e.target.value }))} />
                </label>
                <label className="field" style={{ gridColumn: "1 / -1" }}>
                  <span>Bitiş Noktası</span>
                  <input className="input" value={condDraft.end_point} placeholder="ör. Ana bara"
                    onChange={(e) => setCondDraft((v) => ({ ...v, end_point: e.target.value }))} />
                </label>
              </div>
            </fieldset>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={isCondSaving}>
                {isCondSaving ? "Kaydediliyor..." : editingCond ? "Güncelle" : "Kaydet"}
              </button>
            </div>
          </form>

          {/* Sağ: BendPreview */}
          {selectedBendType && (
            <div style={{ position: "sticky", top: "1rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Büküm Önizleme
              </div>
              <div style={{ background: "var(--surface-alt)", borderRadius: 8, padding: "0.75rem", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.4rem" }}>
                  {selectedBendType.name}
                  <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: "0.4rem" }}>
                    ({selectedBendType.template_type})
                  </span>
                </div>
                <BendPreview
                  segments={selectedBendType.segments ?? []}
                  parameters={selectedBendType.parameters ?? []}
                  paramValues={Object.fromEntries(
                    (selectedBendType.parameters ?? []).map((p) => [p.name, Number(p.default_value)])
                  )}
                  thickness_mm={Number(selectedBendType.thickness_mm)}
                  parallel_count={selectedBendType.parallel_count}
                  start_direction={selectedBendType.start_direction as "up" | "right"}
                  height={200}
                />
                <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {(selectedBendType.parameters ?? []).map((p) => (
                    <span key={p.name} style={{
                      padding: "2px 8px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 600,
                      background: p.is_calculated ? "rgba(239,68,68,0.1)" : "var(--accent-soft)",
                      color: p.is_calculated ? "#dc2626" : "inherit",
                    }}>
                      {p.name} = {Number(p.default_value).toFixed(0)} mm
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════
          MALZEME MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        title={editingMat ? "Malzeme Standardını Düzenle" : "Yeni Malzeme Standardı"}
        open={matModalOpen}
        onClose={() => { setMatModalOpen(false); setEditingMat(null); setMatDraft(EMPTY_BRANCH); }}
      >
        <form className="form-grid"
          onSubmit={(e) => { e.preventDefault(); editingMat ? matUpdateMutation.mutate() : matCreateMutation.mutate(); }}>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Ad</span>
            <input className="input" value={matDraft.name} required
              onChange={(e) => setMatDraft((v) => ({ ...v, name: e.target.value }))} />
          </label>
          <label className="field">
            <span>Genişlik (mm)</span>
            <input className="input" type="number" value={matDraft.width_mm}
              onChange={(e) => setMatDraft((v) => ({ ...v, width_mm: Number(e.target.value) }))} />
          </label>
          <label className="field">
            <span>Kalınlık (mm)</span>
            <input className="input" type="number" value={matDraft.thickness_mm}
              onChange={(e) => setMatDraft((v) => ({ ...v, thickness_mm: Number(e.target.value) }))} />
          </label>
          <label className="field">
            <span>Malzeme</span>
            <select className="input" value={matDraft.material}
              onChange={(e) => setMatDraft((v) => ({ ...v, material: e.target.value }))}>
              <option value="Cu">Cu</option>
              <option value="Al">Al</option>
            </select>
          </label>
          <label className="field">
            <span>Büküm İç R (mm)</span>
            <input className="input" type="number" value={matDraft.bend_inner_radius_mm}
              onChange={(e) => setMatDraft((v) => ({ ...v, bend_inner_radius_mm: Number(e.target.value) }))} />
          </label>
          <label className="field">
            <span>Delik Çapı (mm)</span>
            <input className="input" type="number" value={matDraft.default_hole_diameter_mm}
              onChange={(e) => setMatDraft((v) => ({ ...v, default_hole_diameter_mm: Number(e.target.value) }))} />
          </label>
          <label className="field">
            <span>Min. Delik Kenar (mm)</span>
            <input className="input" type="number" value={matDraft.min_hole_edge_distance_mm}
              onChange={(e) => setMatDraft((v) => ({ ...v, min_hole_edge_distance_mm: Number(e.target.value) }))} />
          </label>
          <label className="field">
            <span>Min. Delik-Büküm (mm)</span>
            <input className="input" type="number" value={matDraft.min_bend_hole_distance_mm}
              onChange={(e) => setMatDraft((v) => ({ ...v, min_bend_hole_distance_mm: Number(e.target.value) }))} />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Slot Delik</span>
            <label style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <input type="checkbox" checked={matDraft.use_slot_holes}
                onChange={(e) => setMatDraft((v) => ({ ...v, use_slot_holes: e.target.checked }))} />
              <span>Oval delik kullanılsın</span>
            </label>
          </label>
          {matDraft.use_slot_holes && (
            <>
              <label className="field">
                <span>Slot Genişliği (mm)</span>
                <input className="input" type="number" value={matDraft.slot_width_mm}
                  onChange={(e) => setMatDraft((v) => ({ ...v, slot_width_mm: Number(e.target.value) }))} />
              </label>
              <label className="field">
                <span>Slot Uzunluğu (mm)</span>
                <input className="input" type="number" value={matDraft.slot_length_mm}
                  onChange={(e) => setMatDraft((v) => ({ ...v, slot_length_mm: Number(e.target.value) }))} />
              </label>
            </>
          )}
          <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
            <button type="submit" className="btn-primary" disabled={isMatSaving}>
              {isMatSaving ? "Kaydediliyor..." : editingMat ? "Güncelle" : "Kaydet"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Onay Modal ─────────────────────────────────────────────────────── */}
      <ConfirmModal
        open={confirmPending !== null}
        message={confirmPending?.message ?? ""}
        onConfirm={() => confirmPending?.onConfirm()}
        onCancel={() => setConfirmPending(null)}
      />
    </div>
  );
}
