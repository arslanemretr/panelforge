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

// ─── Main (Ana Bakır) draft ────────────────────────────────────────────────
interface MainDraft {
  name: string;
  width_mm: number;
  thickness_mm: number;
  phase_type: string;       // "L1-L2-L3" | "N-L1-L2-L3" | "L1-L2-L3-N"
  bars_per_phase: number;
  bar_gap_mm: number;
  phase_center_mm: number;
  layer_type: string;       // "Tek Kat" | "Çift Kat"
  neutral_bar_count: number;
  busbar_x_mm: number;
  busbar_y_mm: number;
  busbar_z_mm: number;
  busbar_orientation: string;
  busbar_length_mm: number;
}

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

const EMPTY_MAIN: MainDraft = {
  name: "",
  width_mm: 40,
  thickness_mm: 10,
  phase_type: "L1-L2-L3",
  bars_per_phase: 1,
  bar_gap_mm: 5,
  phase_center_mm: 60,
  layer_type: "Tek Kat",
  neutral_bar_count: 1,
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

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmtDate(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

function hasNeutral(phaseType: string): boolean {
  return phaseType === "N-L1-L2-L3" || phaseType === "L1-L2-L3-N";
}

function phaseList(phaseType: string): string[] {
  if (phaseType === "N-L1-L2-L3") return ["N", "L1", "L2", "L3"];
  if (phaseType === "L1-L2-L3-N") return ["L1", "L2", "L3", "N"];
  return ["L1", "L2", "L3"];
}

function defToMainDraft(def: CopperDefinition): MainDraft {
  return {
    name: def.name,
    width_mm: Number(def.main_width_mm ?? 40),
    thickness_mm: Number(def.main_thickness_mm ?? 10),
    phase_type: def.phase_type ?? "L1-L2-L3",
    bars_per_phase: def.bars_per_phase ?? 1,
    bar_gap_mm: Number(def.bar_gap_mm ?? 5),
    phase_center_mm: Number(def.phase_center_mm ?? def.main_phase_spacing_mm ?? 60),
    layer_type: def.layer_type ?? "Tek Kat",
    neutral_bar_count: def.neutral_bar_count ?? 1,
    busbar_x_mm: Number(def.busbar_x_mm ?? 120),
    busbar_y_mm: Number(def.busbar_y_mm ?? 140),
    busbar_z_mm: Number(def.busbar_z_mm ?? 0),
    busbar_orientation: def.busbar_orientation ?? "horizontal",
    busbar_length_mm: Number(def.busbar_length_mm ?? 800),
  };
}

function buildMainPayload(draft: MainDraft): Omit<CopperDefinition, "id" | "created_at" | "updated_at"> {
  return {
    name: draft.name,
    copper_kind: "main",
    description: null,
    main_width_mm: draft.width_mm,
    main_thickness_mm: draft.thickness_mm,
    main_material: "Cu",
    main_phase_spacing_mm: draft.phase_center_mm,
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
    phase_type: draft.phase_type,
    bars_per_phase: draft.bars_per_phase,
    bar_gap_mm: draft.bar_gap_mm,
    phase_center_mm: draft.phase_center_mm,
    layer_type: draft.layer_type,
    neutral_bar_count: hasNeutral(draft.phase_type) ? draft.neutral_bar_count : null,
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
    phase_type: null,
    bars_per_phase: null,
    bar_gap_mm: null,
    phase_center_mm: null,
    layer_type: null,
    neutral_bar_count: null,
  };
}

// ─── Canlı SVG Önizleme ────────────────────────────────────────────────────
const PHASE_COLORS: Record<string, string> = {
  L1: "#d4a017",
  L2: "#27ae60",
  L3: "#c0392b",
  N: "#2980b9",
};

/**
 * "L1-L2-L3-N" durumunda N bağımsız ray → true
 * "N-L1-L2-L3" veya "L1-L2-L3" → hepsi aynı ray → false
 */
function isNIndependent(phaseType: string): boolean {
  return phaseType === "L1-L2-L3-N";
}

/** Boyutlandırma çizgisi: x1→x2 arası, ölçü metni ortada */
function DimLine({
  x1, x2, y, label, color = "#e74c3c",
}: { x1: number; x2: number; y: number; label: string; color?: string }) {
  const cx = (x1 + x2) / 2;
  const arr = 5;
  return (
    <g>
      {/* Ana yatay çizgi */}
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={0.8} />
      {/* Sol dik bitiş */}
      <line x1={x1} y1={y - 3} x2={x1} y2={y + 3} stroke={color} strokeWidth={0.8} />
      {/* Sağ dik bitiş */}
      <line x1={x2} y1={y - 3} x2={x2} y2={y + 3} stroke={color} strokeWidth={0.8} />
      {/* Sol ok başı */}
      <polyline
        points={`${x1 + arr},${y - arr / 2} ${x1},${y} ${x1 + arr},${y + arr / 2}`}
        stroke={color} strokeWidth={0.8} fill="none"
      />
      {/* Sağ ok başı */}
      <polyline
        points={`${x2 - arr},${y - arr / 2} ${x2},${y} ${x2 - arr},${y + arr / 2}`}
        stroke={color} strokeWidth={0.8} fill="none"
      />
      {/* Ölçü metni — arkaplan dikdörtgeni ile okunabilirlik */}
      <rect x={cx - 16} y={y - 12} width={32} height={11} fill="#1a1f2b" />
      <text x={cx} y={y - 3} textAnchor="middle" fontSize="9" fill={color} fontFamily="monospace">
        {label}
      </text>
    </g>
  );
}

function MainBusbarPreview({ draft }: { draft: MainDraft }) {
  const phases = phaseList(draft.phase_type);
  const isDouble = draft.layer_type === "Çift Kat";
  const nIndependent = isNIndependent(draft.phase_type);

  // SVG sabit boyutları
  const SVG_W = 480;
  const DIM_LINE_Y = 12;        // Boyut çizgisi Y
  const LABEL_TOP_H = 34;       // Faz etiketleri + boyut çizgisi için üst boşluk
  const TOP_RAIL_Y = LABEL_TOP_H + 2;
  const TOP_RAIL_H = 12;
  const UPPER_BAR_H = isDouble ? 62 : 150;
  const MID_RAIL_H = isDouble ? 10 : 0;
  const LOWER_BAR_H = isDouble ? 110 : 0;
  const TERMINAL_H = 14;
  const TERMINAL_BASE_H = 7;
  const BOTTOM_PAD = 12;

  const barTopY = TOP_RAIL_Y + TOP_RAIL_H;
  const midRailY = barTopY + UPPER_BAR_H;
  const lowerBarTopY = isDouble ? midRailY + MID_RAIL_H : 0;
  const terminalTopY = isDouble ? lowerBarTopY + LOWER_BAR_H : barTopY + UPPER_BAR_H;
  const svgHeight = terminalTopY + TERMINAL_H + TERMINAL_BASE_H + BOTTOM_PAD;

  // Bar ölçüleri (SVG px)
  const barW = Math.min(20, Math.max(5, draft.width_mm / 3.5));
  const barGap = Math.max(3, draft.bar_gap_mm / 2.5);

  const getBarCount = (ph: string) => (ph === "N" ? (draft.neutral_bar_count || 1) : (draft.bars_per_phase || 1));

  const groupWidth = (ph: string) => {
    const bc = getBarCount(ph);
    return bc * barW + Math.max(0, bc - 1) * barGap;
  };

  // Fazlar arası boşluk (SVG px)
  const phaseSpacingPx = Math.max(
    Math.max(...phases.map(groupWidth)) + 16,
    draft.phase_center_mm / 1.8,
  );

  // "L1-L2-L3-N" → N bağımsız rayla: L faz grubunu hesapla, N'yi ayrı yerleştir
  const nIndependentGap = 28; // L grubu rayı ile N arasındaki görsel boşluk

  const lPhases = nIndependent ? phases.filter((p) => p !== "N") : phases;
  const totalLW = lPhases.reduce(
    (acc, ph, i) => acc + groupWidth(ph) + (i < lPhases.length - 1 ? phaseSpacingPx - groupWidth(ph) : 0),
    0,
  );
  const nGroupW = nIndependent ? groupWidth("N") : 0;
  const totalW = nIndependent
    ? totalLW + nIndependentGap + nGroupW + 30  // N için extra uzantı
    : phases.reduce(
        (acc, ph, i) => acc + groupWidth(ph) + (i < phases.length - 1 ? phaseSpacingPx - groupWidth(ph) : 0),
        0,
      );

  const scale = Math.min(1, (SVG_W - 40) / Math.max(totalW, 1));
  const startX = (SVG_W - totalW * scale) / 2;

  // Faz grup X merkez koordinatları
  const groupCenters: Record<string, number> = {};
  if (nIndependent) {
    let cur = startX;
    lPhases.forEach((ph, i) => {
      const gw = groupWidth(ph) * scale;
      groupCenters[ph] = cur + gw / 2;
      cur += gw;
      if (i < lPhases.length - 1) cur += (phaseSpacingPx - groupWidth(ph)) * scale;
    });
    // N bağımsız: L grubunun hemen sağına boşlukla
    const nStartX = startX + totalLW * scale + nIndependentGap * scale;
    groupCenters["N"] = nStartX + nGroupW * scale / 2;
  } else {
    let cur = startX;
    phases.forEach((ph, i) => {
      const gw = groupWidth(ph) * scale;
      groupCenters[ph] = cur + gw / 2;
      cur += gw;
      if (i < phases.length - 1) cur += (phaseSpacingPx - groupWidth(ph)) * scale;
    });
  }

  // Ray koordinatları
  const lRailLeft = startX - 14;
  const lRailRight = nIndependent
    ? startX + totalLW * scale + 14
    : startX + totalW * scale + 14;
  const lRailWidth = lRailRight - lRailLeft;

  // N bağımsız ray: N grubunu ve biraz sağ uzantısını kapsar
  const nRailLeft = nIndependent ? groupCenters["N"] - nGroupW * scale / 2 - 8 : 0;
  const nRailRight = nIndependent ? startX + totalW * scale + 4 : 0;
  const nRailWidth = nIndependent ? nRailRight - nRailLeft : 0;

  // Çift kat orta ray — sadece L fazlar için (L1-L2-L3-N'de N hariç)
  const midRailLeft = lRailLeft;
  const midRailWidth = lRailWidth;

  // N çift kat orta rayı (bağımsızsa ayrı)
  const nMidRailLeft = nRailLeft;
  const nMidRailWidth = nRailWidth;

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${svgHeight}`}
      style={{
        width: "100%",
        height: `${Math.round(svgHeight)}px`,
        border: "1px solid var(--line)",
        borderRadius: "6px",
        background: "#1a1f2b",
        display: "block",
      }}
    >
      {/* ── Boyut çizgileri (kırmızı oklar) ── */}
      {phases.map((ph, pi) => {
        if (pi === 0) return null;
        const prevPh = phases[pi - 1];
        // L1-L2-L3-N durumunda N bağımsız → L3→N arası boyut gösterme
        if (nIndependent && (ph === "N" || prevPh === "N")) return null;
        return (
          <DimLine
            key={`dim-${pi}`}
            x1={groupCenters[prevPh]}
            x2={groupCenters[ph]}
            y={DIM_LINE_Y}
            label={`${draft.phase_center_mm} mm`}
          />
        );
      })}

      {/* ── Üst raylar ── */}
      <rect x={lRailLeft} y={TOP_RAIL_Y} width={lRailWidth} height={TOP_RAIL_H} fill="#666" rx={2} />
      {nIndependent && (
        <rect x={nRailLeft} y={TOP_RAIL_Y} width={nRailWidth} height={TOP_RAIL_H} fill="#666" rx={2} />
      )}

      {/* ── Çift kat orta raylar ── */}
      {isDouble && (
        <>
          <rect x={midRailLeft} y={midRailY} width={midRailWidth} height={MID_RAIL_H} fill="#666" rx={2} />
          {nIndependent && (
            <rect x={nMidRailLeft} y={midRailY} width={nMidRailWidth} height={MID_RAIL_H} fill="#666" rx={2} />
          )}
        </>
      )}

      {/* ── Faz grupları ── */}
      {phases.map((phase) => {
        const bc = getBarCount(phase);
        const color = PHASE_COLORS[phase] ?? "#aaa";
        const cx = groupCenters[phase];
        const gw = groupWidth(phase) * scale;
        const groupStartX = cx - gw / 2;

        return (
          <g key={phase}>
            {/* Faz etiketi — rayın hemen üstünde */}
            <text
              x={cx}
              y={TOP_RAIL_Y - 3}
              textAnchor="middle"
              fontSize="11"
              fill={color}
              fontWeight="bold"
              fontFamily="monospace"
            >
              {phase}
            </text>

            {Array.from({ length: bc }, (_, bi) => {
              const bx = groupStartX + bi * (barW + barGap) * scale;
              const bw = barW * scale;

              return (
                <g key={bi}>
                  {/* Üst (veya tek) bar */}
                  <rect x={bx} y={barTopY} width={bw} height={UPPER_BAR_H} fill={color} opacity={0.88} rx={1} />

                  {/* Çift kat alt bar */}
                  {isDouble && (
                    <rect x={bx} y={lowerBarTopY} width={bw} height={LOWER_BAR_H} fill={color} opacity={0.88} rx={1} />
                  )}

                  {/* Terminal bloğu */}
                  <rect x={bx - 2} y={terminalTopY} width={bw + 4} height={TERMINAL_H} fill={color} opacity={0.65} rx={2} />
                  <rect x={bx - 3} y={terminalTopY + TERMINAL_H} width={bw + 6} height={TERMINAL_BASE_H} fill={color} opacity={0.4} rx={1} />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Ana bileşen ───────────────────────────────────────────────────────────
export function CopperDefinitionsPage({ kind }: CopperDefinitionsPageProps) {
  const queryClient = useQueryClient();
  // Branch kind için modal; main kind için inline form (modalOpen sadece branch kullanır)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDef, setEditingDef] = useState<CopperDefinition | null>(null);
  const [search, setSearch] = useState<string>(localStorage.getItem(`copper-def-search-${kind}`) ?? "");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [mainDraft, setMainDraft] = useState<MainDraft>(EMPTY_MAIN);
  const [branchDraft, setBranchDraft] = useState<BranchDraft>(EMPTY_BRANCH);

  const title = kind === "main" ? "Ana Bakır Tanımlama" : "Tali Bakır Tanımlama";
  const createLabel = kind === "main" ? "Yeni Ana Bakır" : "Yeni Tali Bakır";
  const modalTitle = editingDef ? "Tali Bakırı Düzenle" : createLabel;

  const definitionsQuery = useQuery({
    queryKey: ["copper-definitions", kind],
    queryFn: () => client.listCopperDefinitions(kind),
  });

  const definitions = definitionsQuery.data ?? [];
  const filtered = search.trim()
    ? definitions.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()))
    : definitions;

  function startCreate() {
    setEditingDef(null);
    setMainDraft(EMPTY_MAIN);
    setBranchDraft(EMPTY_BRANCH);
    if (kind === "branch") setModalOpen(true);
  }

  function openEdit(def: CopperDefinition) {
    setEditingDef(def);
    if (kind === "main") {
      setMainDraft(defToMainDraft(def));
    } else {
      setBranchDraft({
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
  }

  function closeModal() {
    setModalOpen(false);
    setEditingDef(null);
    setBranchDraft(EMPTY_BRANCH);
  }

  // Ana bakır inline form: düzenleme modundan çıkıp yeni oluşturma moduna geç
  function cancelMainEdit() {
    setEditingDef(null);
    setMainDraft(EMPTY_MAIN);
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["copper-definitions", kind] });

  const createMutation = useMutation({
    mutationFn: () =>
      client.createCopperDefinition(kind === "main" ? buildMainPayload(mainDraft) : buildBranchPayload(branchDraft)),
    onSuccess: async () => {
      await invalidate();
      if (kind === "main") { setMainDraft(EMPTY_MAIN); setEditingDef(null); }
      else closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      client.updateCopperDefinition(
        editingDef!.id,
        kind === "main" ? buildMainPayload(mainDraft) : buildBranchPayload(branchDraft),
      ),
    onSuccess: async () => {
      await invalidate();
      if (kind === "main") { setEditingDef(null); setMainDraft(EMPTY_MAIN); }
      else closeModal();
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (def: CopperDefinition) =>
      client.createCopperDefinition({
        name: `${def.name} (Kopya)`,
        copper_kind: def.copper_kind,
        description: def.description ?? null,
        main_width_mm: def.main_width_mm ?? null,
        main_thickness_mm: def.main_thickness_mm ?? null,
        main_material: def.main_material,
        main_phase_spacing_mm: def.main_phase_spacing_mm ?? null,
        branch_width_mm: def.branch_width_mm ?? null,
        branch_thickness_mm: def.branch_thickness_mm ?? null,
        branch_material: def.branch_material,
        branch_phase_spacing_mm: def.branch_phase_spacing_mm ?? null,
        bend_inner_radius_mm: def.bend_inner_radius_mm ?? null,
        k_factor: def.k_factor ?? null,
        min_hole_edge_distance_mm: def.min_hole_edge_distance_mm ?? null,
        min_bend_hole_distance_mm: def.min_bend_hole_distance_mm ?? null,
        default_hole_diameter_mm: def.default_hole_diameter_mm ?? null,
        use_slot_holes: def.use_slot_holes,
        slot_width_mm: def.slot_width_mm ?? null,
        slot_length_mm: def.slot_length_mm ?? null,
        density_g_cm3: def.density_g_cm3 ?? null,
        coating_type: def.coating_type ?? null,
        busbar_x_mm: def.busbar_x_mm ?? null,
        busbar_y_mm: def.busbar_y_mm ?? null,
        busbar_z_mm: def.busbar_z_mm ?? null,
        busbar_orientation: def.busbar_orientation ?? null,
        busbar_length_mm: def.busbar_length_mm ?? null,
        phase_type: def.phase_type ?? null,
        bars_per_phase: def.bars_per_phase ?? null,
        bar_gap_mm: def.bar_gap_mm ?? null,
        phase_center_mm: def.phase_center_mm ?? null,
        layer_type: def.layer_type ?? null,
        neutral_bar_count: def.neutral_bar_count ?? null,
      }),
    onSuccess: async () => { await invalidate(); },
  });

  const deleteMutation = useMutation({
    mutationFn: client.deleteCopperDefinition,
    onSuccess: async () => { await invalidate(); setDeleteError(null); },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setDeleteError(error.response.data?.detail ?? "Bu bakır tanımı projede kullanıldığı için silinemedi.");
      } else {
        setDeleteError("Silme işlemi başarısız oldu.");
      }
    },
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    localStorage.setItem(`copper-def-search-${kind}`, value);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ─── Tablo (her iki kind için ortak) ──────────────────────────────────────
  const tableSection = (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ad</th>
            {kind === "main" ? (
              <>
                <th>Kesit</th>
                <th>Faz Tipi</th>
                <th>Kat Tipi</th>
                <th>Faz Miktarı</th>
                <th>Fazlar Arası</th>
              </>
            ) : (
              <>
                <th>Kesit</th>
                <th>Malzeme</th>
                <th>Delik / Büküm</th>
                <th>Slot</th>
              </>
            )}
            <th>Oluşturma</th>
            <th>Revizyon</th>
            <th style={{ borderLeft: "2px solid var(--line)" }}>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((def) => (
            <tr
              key={def.id}
              style={
                kind === "main" && editingDef?.id === def.id
                  ? { background: "rgba(99,102,241,0.10)", outline: "1px solid rgba(99,102,241,0.3)" }
                  : undefined
              }
            >
              <td><strong>{def.name}</strong></td>
              {kind === "main" ? (
                <>
                  <td>{def.main_width_mm ?? "-"} × {def.main_thickness_mm ?? "-"} mm</td>
                  <td>{def.phase_type ?? "-"}</td>
                  <td>{def.layer_type ?? "-"}</td>
                  <td>{def.bars_per_phase ?? 1} adet</td>
                  <td>{def.phase_center_mm ? `${def.phase_center_mm} mm` : (def.main_phase_spacing_mm ? `${def.main_phase_spacing_mm} mm` : "-")}</td>
                </>
              ) : (
                <>
                  <td>{def.branch_width_mm ?? "-"} × {def.branch_thickness_mm ?? "-"} mm</td>
                  <td>{def.branch_material}</td>
                  <td>Ø{def.default_hole_diameter_mm ?? "-"} / R{def.bend_inner_radius_mm ?? "-"}</td>
                  <td>{def.use_slot_holes ? `${def.slot_width_mm ?? "-"} × ${def.slot_length_mm ?? "-"}` : "—"}</td>
                </>
              )}
              <td>{fmtDate(def.created_at)}</td>
              <td>{fmtDate(def.updated_at)}</td>
              <td className="actions-cell" style={{ borderLeft: "2px solid var(--line)" }}>
                <button type="button" className="ghost" onClick={() => openEdit(def)}>
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
                      onConfirm: () => { deleteMutation.mutate(def.id); setConfirmPending(null); },
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
              <td colSpan={kind === "main" ? 9 : 8}>
                <div className="empty-state">
                  {search ? "Arama kriterine uygun bakır tanımı bulunamadı." : "Tanımlı bakır yok."}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ─── Ana bakır inline formu ────────────────────────────────────────────────
  const mainInlineForm = (
    <form
      className="form-grid"
      onSubmit={(e) => { e.preventDefault(); editingDef ? updateMutation.mutate() : createMutation.mutate(); }}
    >
      {/* Genel Bilgiler */}
      <div style={{ gridColumn: "1 / -1", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
          Genel Bilgiler
        </span>
      </div>

      <label className="field" style={{ gridColumn: "1 / -1" }}>
        <span>Ana Bakır Adı</span>
        <input className="input" value={mainDraft.name} onChange={(e) => setMainDraft((v) => ({ ...v, name: e.target.value }))} required />
      </label>
      <label className="field">
        <span>Genişlik (mm)</span>
        <input className="input" type="number" min={1} value={mainDraft.width_mm} onChange={(e) => setMainDraft((v) => ({ ...v, width_mm: Number(e.target.value) }))} />
      </label>
      <label className="field">
        <span>Kalınlık (mm)</span>
        <input className="input" type="number" min={1} value={mainDraft.thickness_mm} onChange={(e) => setMainDraft((v) => ({ ...v, thickness_mm: Number(e.target.value) }))} />
      </label>
      <label className="field">
        <span>Kat Tipi</span>
        <select className="input" value={mainDraft.layer_type} onChange={(e) => setMainDraft((v) => ({ ...v, layer_type: e.target.value }))}>
          <option value="Tek Kat">Tek Kat</option>
          <option value="Çift Kat">Çift Kat</option>
        </select>
      </label>

      {/* Elektriksel Yerleşim */}
      <div style={{ gridColumn: "1 / -1", marginTop: "0.6rem", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
          Elektriksel Yerleşim
        </span>
      </div>

      <label className="field">
        <span>Faz Tipi</span>
        <select className="input" value={mainDraft.phase_type} onChange={(e) => setMainDraft((v) => ({ ...v, phase_type: e.target.value }))}>
          <option value="L1-L2-L3">L1 — L2 — L3</option>
          <option value="N-L1-L2-L3">N — L1 — L2 — L3</option>
          <option value="L1-L2-L3-N">L1 — L2 — L3 — N</option>
        </select>
      </label>
      <label className="field">
        <span>Faz Miktarı (adet/faz)</span>
        <input className="input" type="number" min={1} max={8} value={mainDraft.bars_per_phase} onChange={(e) => setMainDraft((v) => ({ ...v, bars_per_phase: Number(e.target.value) }))} />
      </label>
      <label className="field">
        <span>Faz İçi Aralığı (mm)</span>
        <input className="input" type="number" min={0} value={mainDraft.bar_gap_mm} onChange={(e) => setMainDraft((v) => ({ ...v, bar_gap_mm: Number(e.target.value) }))} />
      </label>
      <label className="field">
        <span>Fazlar Arası Aralık (mm)</span>
        <input className="input" type="number" min={1} value={mainDraft.phase_center_mm} onChange={(e) => setMainDraft((v) => ({ ...v, phase_center_mm: Number(e.target.value) }))} />
      </label>
      {hasNeutral(mainDraft.phase_type) && (
        <label className="field">
          <span>Nötr Bakır Miktarı (adet)</span>
          <input className="input" type="number" min={1} max={8} value={mainDraft.neutral_bar_count} onChange={(e) => setMainDraft((v) => ({ ...v, neutral_bar_count: Number(e.target.value) }))} />
        </label>
      )}
      <label className="field">
        <span>X (mm)</span>
        <input className="input" type="number" value={mainDraft.busbar_x_mm} onChange={(e) => setMainDraft((v) => ({ ...v, busbar_x_mm: Number(e.target.value) }))} />
      </label>
      <label className="field">
        <span>Y (mm)</span>
        <input className="input" type="number" value={mainDraft.busbar_y_mm} onChange={(e) => setMainDraft((v) => ({ ...v, busbar_y_mm: Number(e.target.value) }))} />
      </label>
      <label className="field">
        <span>Z (mm)</span>
        <input className="input" type="number" value={mainDraft.busbar_z_mm} onChange={(e) => setMainDraft((v) => ({ ...v, busbar_z_mm: Number(e.target.value) }))} />
      </label>
      <label className="field">
        <span>Uzunluk (mm)</span>
        <input className="input" type="number" value={mainDraft.busbar_length_mm} onChange={(e) => setMainDraft((v) => ({ ...v, busbar_length_mm: Number(e.target.value) }))} />
      </label>

      {/* Canlı Önizleme */}
      <div style={{ gridColumn: "1 / -1", marginTop: "0.9rem" }}>
        <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: "0.5rem" }}>
          Canlı Önizleme
        </div>
        <MainBusbarPreview draft={mainDraft} />
      </div>

      <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? "Kaydediliyor..." : (editingDef ? "Güncelle" : "Kaydet")}
        </button>
        {editingDef && (
          <button type="button" className="ghost" onClick={cancelMainEdit}>
            İptal
          </button>
        )}
      </div>
    </form>
  );

  // ─── Branch modal form içeriği ────────────────────────────────────────────
  const branchFormContent = (
    <form
      className="form-grid"
      onSubmit={(e) => { e.preventDefault(); editingDef ? updateMutation.mutate() : createMutation.mutate(); }}
    >
      <label className="field" style={{ gridColumn: "1 / -1" }}>
        <span>Tali Bakır Adı</span>
        <input className="input" value={branchDraft.name} onChange={(e) => setBranchDraft((v) => ({ ...v, name: e.target.value }))} required />
      </label>
      <label className="field"><span>Genişlik (mm)</span><input className="input" type="number" value={branchDraft.width_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, width_mm: Number(e.target.value) }))} /></label>
      <label className="field"><span>Kalınlık (mm)</span><input className="input" type="number" value={branchDraft.thickness_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, thickness_mm: Number(e.target.value) }))} /></label>
      <label className="field">
        <span>Malzeme</span>
        <select className="input" value={branchDraft.material} onChange={(e) => setBranchDraft((v) => ({ ...v, material: e.target.value }))}>
          <option value="Cu">Cu</option>
          <option value="Al">Al</option>
        </select>
      </label>
      <label className="field"><span>Büküm İç R (mm)</span><input className="input" type="number" value={branchDraft.bend_inner_radius_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, bend_inner_radius_mm: Number(e.target.value) }))} /></label>
      <label className="field"><span>Delik Çapı (mm)</span><input className="input" type="number" value={branchDraft.default_hole_diameter_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, default_hole_diameter_mm: Number(e.target.value) }))} /></label>
      <label className="field"><span>Min. Delik Kenar (mm)</span><input className="input" type="number" value={branchDraft.min_hole_edge_distance_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, min_hole_edge_distance_mm: Number(e.target.value) }))} /></label>
      <label className="field"><span>Min. Delik-Büküm (mm)</span><input className="input" type="number" value={branchDraft.min_bend_hole_distance_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, min_bend_hole_distance_mm: Number(e.target.value) }))} /></label>
      <label className="field" style={{ gridColumn: "1 / -1" }}>
        <span>Slot Delik</span>
        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <input type="checkbox" checked={branchDraft.use_slot_holes} onChange={(e) => setBranchDraft((v) => ({ ...v, use_slot_holes: e.target.checked }))} />
          <span>Oval delik kullanılsın</span>
        </label>
      </label>
      {branchDraft.use_slot_holes && (
        <>
          <label className="field"><span>Slot Genişliği (mm)</span><input className="input" type="number" value={branchDraft.slot_width_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, slot_width_mm: Number(e.target.value) }))} /></label>
          <label className="field"><span>Slot Uzunluğu (mm)</span><input className="input" type="number" value={branchDraft.slot_length_mm} onChange={(e) => setBranchDraft((v) => ({ ...v, slot_length_mm: Number(e.target.value) }))} /></label>
        </>
      )}
      <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? "Kaydediliyor..." : (editingDef ? "Güncelle" : "Kaydet")}
        </button>
      </div>
    </form>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="stack">
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanımlamalar</span>
          <h1>{title}</h1>
          <p>
            {kind === "main"
              ? "Ana bakır kütüphanesini yönetin. Faz yapısı, kat tipi, konum ve uzunluk varsayımları burada tutulur."
              : "Tüm tali bağlantılarda kullanılacak bakır standardını yönetin. Delik ve büküm parametreleri burada tanımlanır."}
          </p>
        </div>
        <button type="button" onClick={startCreate}>
          {createLabel}
        </button>
      </section>

      {deleteError && <div className="alert alert-warning">{deleteError}</div>}

      {kind === "main" ? (
        /* ── Ana bakır: 2 sütunlu inline layout ── */
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)", gap: "1.5rem", alignItems: "start" }}>

          {/* SOL: Tablo */}
          <section className="card">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.9rem", flexWrap: "wrap" }}>
              <input
                type="search"
                className="input"
                placeholder="Ana bakır ara..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ flex: 1, minWidth: 0 }}
              />
              {search.trim() && (
                <span style={{ fontSize: "0.85rem", color: "var(--muted)", whiteSpace: "nowrap" }}>
                  {filtered.length} / {definitions.length}
                </span>
              )}
            </div>
            {tableSection}
          </section>

          {/* SAĞ: Inline form */}
          <section className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
                {editingDef ? "Düzenleniyor" : "Yeni Ana Bakır"}
              </h3>
              {editingDef && (
                <span style={{ fontSize: "0.82rem", color: "var(--muted)", fontStyle: "italic" }}>
                  {editingDef.name}
                </span>
              )}
            </div>
            {mainInlineForm}
          </section>
        </div>
      ) : (
        /* ── Tali bakır: tablo + modal ── */
        <>
          <section className="card">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.9rem", flexWrap: "wrap" }}>
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
            {tableSection}
          </section>

          <Modal title={modalTitle} open={modalOpen} onClose={closeModal}>
            {branchFormContent}
          </Modal>
        </>
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
