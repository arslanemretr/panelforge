import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { client } from "../api/client";
import type { CopperDefinition } from "../types";

// ─── Types ─────────────────────────────────────────────────────────────────
interface MainDraft {
  name: string;
  width_mm: number;
  thickness_mm: number;
  phase_type: string;
  bars_per_phase: number;
  bar_gap_mm: number;
  phase_center_mm: number;
  layer_type: string;
  neutral_bar_count: number;
  busbar_x_mm: number;
  busbar_y_mm: number;
  busbar_z_mm: number;
  busbar_orientation: string;
  busbar_length_mm: number;
}

const EMPTY: MainDraft = {
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

// ─── Helpers ───────────────────────────────────────────────────────────────
function hasNeutral(phaseType: string): boolean {
  return phaseType === "N-L1-L2-L3" || phaseType === "L1-L2-L3-N";
}

function phaseList(phaseType: string): string[] {
  if (phaseType === "N-L1-L2-L3") return ["N", "L1", "L2", "L3"];
  if (phaseType === "L1-L2-L3-N") return ["L1", "L2", "L3", "N"];
  return ["L1", "L2", "L3"];
}

function isNIndependent(phaseType: string): boolean {
  return phaseType === "L1-L2-L3-N";
}

function defToDraft(def: CopperDefinition): MainDraft {
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

function buildPayload(draft: MainDraft): Omit<CopperDefinition, "id" | "created_at" | "updated_at"> {
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

// ─── SVG Önizleme ──────────────────────────────────────────────────────────
const PHASE_COLORS: Record<string, string> = {
  L1: "#d4a017",
  L2: "#27ae60",
  L3: "#c0392b",
  N: "#2980b9",
};

function DimLine({
  x1, x2, y, label, color = "#e74c3c",
}: { x1: number; x2: number; y: number; label: string; color?: string }) {
  const cx = (x1 + x2) / 2;
  const arr = 5;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={0.8} />
      <line x1={x1} y1={y - 3} x2={x1} y2={y + 3} stroke={color} strokeWidth={0.8} />
      <line x1={x2} y1={y - 3} x2={x2} y2={y + 3} stroke={color} strokeWidth={0.8} />
      <polyline points={`${x1 + arr},${y - arr / 2} ${x1},${y} ${x1 + arr},${y + arr / 2}`} stroke={color} strokeWidth={0.8} fill="none" />
      <polyline points={`${x2 - arr},${y - arr / 2} ${x2},${y} ${x2 - arr},${y + arr / 2}`} stroke={color} strokeWidth={0.8} fill="none" />
      <rect x={cx - 16} y={y - 12} width={32} height={11} fill="#1a1f2b" />
      <text x={cx} y={y - 3} textAnchor="middle" fontSize="9" fill={color} fontFamily="monospace">{label}</text>
    </g>
  );
}

function BusbarPreview({ draft }: { draft: MainDraft }) {
  const phases = phaseList(draft.phase_type);
  const isDouble = draft.layer_type === "Çift Kat";
  const nInd = isNIndependent(draft.phase_type);

  const SVG_W = 560;
  const DIM_LINE_Y = 12;
  const LABEL_TOP_H = 34;
  const TOP_RAIL_Y = LABEL_TOP_H + 2;
  const TOP_RAIL_H = 12;
  const UPPER_BAR_H = isDouble ? 62 : 160;
  const MID_RAIL_H = isDouble ? 10 : 0;
  const LOWER_BAR_H = isDouble ? 120 : 0;
  const TERMINAL_H = 14;
  const TERMINAL_BASE_H = 7;
  const BOTTOM_PAD = 12;

  const barTopY = TOP_RAIL_Y + TOP_RAIL_H;
  const midRailY = barTopY + UPPER_BAR_H;
  const lowerBarTopY = isDouble ? midRailY + MID_RAIL_H : 0;
  const terminalTopY = isDouble ? lowerBarTopY + LOWER_BAR_H : barTopY + UPPER_BAR_H;
  const svgHeight = terminalTopY + TERMINAL_H + TERMINAL_BASE_H + BOTTOM_PAD;

  const barW = Math.min(22, Math.max(5, draft.width_mm / 3.5));
  const barGap = Math.max(3, draft.bar_gap_mm / 2.5);

  const getBarCount = (ph: string) =>
    ph === "N" ? (draft.neutral_bar_count || 1) : (draft.bars_per_phase || 1);

  const groupWidth = (ph: string) => {
    const bc = getBarCount(ph);
    return bc * barW + Math.max(0, bc - 1) * barGap;
  };

  const phaseSpacingPx = Math.max(
    Math.max(...phases.map(groupWidth)) + 16,
    draft.phase_center_mm / 1.8,
  );

  const nIndependentGap = 28;
  const lPhases = nInd ? phases.filter((p) => p !== "N") : phases;
  const totalLW = lPhases.reduce(
    (acc, ph, i) =>
      acc + groupWidth(ph) + (i < lPhases.length - 1 ? phaseSpacingPx - groupWidth(ph) : 0),
    0,
  );
  const nGroupW = nInd ? groupWidth("N") : 0;
  const totalW = nInd
    ? totalLW + nIndependentGap + nGroupW + 30
    : phases.reduce(
        (acc, ph, i) =>
          acc + groupWidth(ph) + (i < phases.length - 1 ? phaseSpacingPx - groupWidth(ph) : 0),
        0,
      );

  const scale = Math.min(1, (SVG_W - 40) / Math.max(totalW, 1));
  const startX = (SVG_W - totalW * scale) / 2;

  const groupCenters: Record<string, number> = {};
  if (nInd) {
    let cur = startX;
    lPhases.forEach((ph, i) => {
      const gw = groupWidth(ph) * scale;
      groupCenters[ph] = cur + gw / 2;
      cur += gw;
      if (i < lPhases.length - 1) cur += (phaseSpacingPx - groupWidth(ph)) * scale;
    });
    const nStartX = startX + totalLW * scale + nIndependentGap * scale;
    groupCenters["N"] = nStartX + (nGroupW * scale) / 2;
  } else {
    let cur = startX;
    phases.forEach((ph, i) => {
      const gw = groupWidth(ph) * scale;
      groupCenters[ph] = cur + gw / 2;
      cur += gw;
      if (i < phases.length - 1) cur += (phaseSpacingPx - groupWidth(ph)) * scale;
    });
  }

  const lRailLeft = startX - 14;
  const lRailRight = nInd ? startX + totalLW * scale + 14 : startX + totalW * scale + 14;
  const lRailWidth = lRailRight - lRailLeft;

  const nRailLeft = nInd ? groupCenters["N"] - (nGroupW * scale) / 2 - 8 : 0;
  const nRailRight = nInd ? startX + totalW * scale + 4 : 0;
  const nRailWidth = nInd ? nRailRight - nRailLeft : 0;

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
      {/* Boyut çizgileri */}
      {phases.map((ph, pi) => {
        if (pi === 0) return null;
        const prevPh = phases[pi - 1];
        if (nInd && (ph === "N" || prevPh === "N")) return null;
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

      {/* Üst ray(lar) */}
      <rect x={lRailLeft} y={TOP_RAIL_Y} width={lRailWidth} height={TOP_RAIL_H} fill="#666" rx={2} />
      {nInd && (
        <rect x={nRailLeft} y={TOP_RAIL_Y} width={nRailWidth} height={TOP_RAIL_H} fill="#666" rx={2} />
      )}

      {/* Çift kat orta ray(lar) */}
      {isDouble && (
        <>
          <rect x={lRailLeft} y={midRailY} width={lRailWidth} height={MID_RAIL_H} fill="#666" rx={2} />
          {nInd && (
            <rect x={nRailLeft} y={midRailY} width={nRailWidth} height={MID_RAIL_H} fill="#666" rx={2} />
          )}
        </>
      )}

      {/* Faz grupları */}
      {phases.map((phase) => {
        const bc = getBarCount(phase);
        const color = PHASE_COLORS[phase] ?? "#aaa";
        const cx = groupCenters[phase];
        const gw = groupWidth(phase) * scale;
        const groupStartX = cx - gw / 2;

        return (
          <g key={phase}>
            <text x={cx} y={TOP_RAIL_Y - 3} textAnchor="middle" fontSize="11" fill={color} fontWeight="bold" fontFamily="monospace">
              {phase}
            </text>
            {Array.from({ length: bc }, (_, bi) => {
              const bx = groupStartX + bi * (barW + barGap) * scale;
              const bw = barW * scale;
              return (
                <g key={bi}>
                  <rect x={bx} y={barTopY} width={bw} height={UPPER_BAR_H} fill={color} opacity={0.88} rx={1} />
                  {isDouble && (
                    <rect x={bx} y={lowerBarTopY} width={bw} height={LOWER_BAR_H} fill={color} opacity={0.88} rx={1} />
                  )}
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

// ─── Bölüm başlığı yardımcısı ──────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem", marginBottom: "0.15rem" }}>
      <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>
        {children}
      </span>
    </div>
  );
}

// ─── Sayfa bileşeni ────────────────────────────────────────────────────────
export function MainCopperFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const [draft, setDraft] = useState<MainDraft>(EMPTY);
  const [draftLoaded, setDraftLoaded] = useState(!isEditing);

  // Düzenleme modunda mevcut tanımı yükle
  const definitionQuery = useQuery({
    queryKey: ["copper-definition", id],
    queryFn: () => client.getCopperDefinition(Number(id)),
    enabled: isEditing,
  });

  useEffect(() => {
    if (definitionQuery.data && !draftLoaded) {
      setDraft(defToDraft(definitionQuery.data));
      setDraftLoaded(true);
    }
  }, [definitionQuery.data, draftLoaded]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["copper-definitions", "main"] });

  const createMutation = useMutation({
    mutationFn: () => client.createCopperDefinition(buildPayload(draft)),
    onSuccess: async () => {
      await invalidate();
      navigate("/definitions/copper/main");
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      client.updateCopperDefinition(Number(id), buildPayload(draft)),
    onSuccess: async () => {
      await invalidate();
      navigate("/definitions/copper/main");
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function set<K extends keyof MainDraft>(key: K, value: MainDraft[K]) {
    setDraft((v) => ({ ...v, [key]: value }));
  }

  if (isEditing && definitionQuery.isLoading) {
    return (
      <div className="stack">
        <div style={{ padding: "2rem", color: "var(--muted)", textAlign: "center" }}>
          Yükleniyor...
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      {/* ── Başlık ── */}
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Ana Bakır Tanımlama</span>
          <h1>{isEditing ? "Bakırı Düzenle" : "Yeni Ana Bakır"}</h1>
          {isEditing && definitionQuery.data && (
            <p style={{ margin: 0, color: "var(--muted)" }}>
              {definitionQuery.data.name}
            </p>
          )}
        </div>
        <button
          type="button"
          className="ghost"
          onClick={() => navigate("/definitions/copper/main")}
        >
          ← Listeye Dön
        </button>
      </section>

      {/* ── İki sütun: Form | Önizleme ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* SOL: Form */}
        <section className="card">
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              isEditing ? updateMutation.mutate() : createMutation.mutate();
            }}
          >
            <SectionLabel>Genel Bilgiler</SectionLabel>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Ana Bakır Adı</span>
              <input
                className="input"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                required
                autoFocus={!isEditing}
              />
            </label>

            <label className="field">
              <span>Genişlik (mm)</span>
              <input className="input" type="number" min={1} value={draft.width_mm}
                onChange={(e) => set("width_mm", Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Kalınlık (mm)</span>
              <input className="input" type="number" min={1} value={draft.thickness_mm}
                onChange={(e) => set("thickness_mm", Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Kat Tipi</span>
              <select className="input" value={draft.layer_type}
                onChange={(e) => set("layer_type", e.target.value)}>
                <option value="Tek Kat">Tek Kat</option>
                <option value="Çift Kat">Çift Kat</option>
              </select>
            </label>

            <SectionLabel>Elektriksel Yerleşim</SectionLabel>

            <label className="field">
              <span>Faz Tipi</span>
              <select className="input" value={draft.phase_type}
                onChange={(e) => set("phase_type", e.target.value)}>
                <option value="L1-L2-L3">L1 — L2 — L3</option>
                <option value="N-L1-L2-L3">N — L1 — L2 — L3</option>
                <option value="L1-L2-L3-N">L1 — L2 — L3 — N</option>
              </select>
            </label>

            <label className="field">
              <span>Faz Miktarı (adet/faz)</span>
              <input className="input" type="number" min={1} max={8} value={draft.bars_per_phase}
                onChange={(e) => set("bars_per_phase", Number(e.target.value))} />
            </label>

            <label className="field">
              <span>Faz İçi Aralığı (mm)</span>
              <input className="input" type="number" min={0} value={draft.bar_gap_mm}
                onChange={(e) => set("bar_gap_mm", Number(e.target.value))} />
            </label>

            <label className="field">
              <span>Fazlar Arası Aralık (mm)</span>
              <input className="input" type="number" min={1} value={draft.phase_center_mm}
                onChange={(e) => set("phase_center_mm", Number(e.target.value))} />
            </label>

            {hasNeutral(draft.phase_type) && (
              <label className="field">
                <span>Nötr Bakır Miktarı (adet)</span>
                <input className="input" type="number" min={1} max={8} value={draft.neutral_bar_count}
                  onChange={(e) => set("neutral_bar_count", Number(e.target.value))} />
              </label>
            )}

            <SectionLabel>Konum</SectionLabel>

            <label className="field">
              <span>X (mm)</span>
              <input className="input" type="number" value={draft.busbar_x_mm}
                onChange={(e) => set("busbar_x_mm", Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Y (mm)</span>
              <input className="input" type="number" value={draft.busbar_y_mm}
                onChange={(e) => set("busbar_y_mm", Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Z (mm)</span>
              <input className="input" type="number" value={draft.busbar_z_mm}
                onChange={(e) => set("busbar_z_mm", Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Uzunluk (mm)</span>
              <input className="input" type="number" value={draft.busbar_length_mm}
                onChange={(e) => set("busbar_length_mm", Number(e.target.value))} />
            </label>

            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button type="submit" className="btn-primary" disabled={isSaving}>
                {isSaving ? "Kaydediliyor..." : (isEditing ? "Güncelle" : "Kaydet")}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => navigate("/definitions/copper/main")}
              >
                İptal
              </button>
            </div>
          </form>
        </section>

        {/* SAĞ: Canlı Önizleme */}
        <section className="card">
          <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: "0.75rem" }}>
            Canlı Önizleme
          </div>
          <BusbarPreview draft={draft} />

          {/* Özet bilgiler */}
          <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            {[
              ["Faz Tipi", draft.phase_type],
              ["Kat Tipi", draft.layer_type],
              ["Faz Miktarı", `${draft.bars_per_phase} adet/faz`],
              ["Faz İçi Aralığı", `${draft.bar_gap_mm} mm`],
              ["Fazlar Arası", `${draft.phase_center_mm} mm`],
              ...(hasNeutral(draft.phase_type) ? [["Nötr Miktarı", `${draft.neutral_bar_count} adet`]] : []),
              ["Kesit", `${draft.width_mm} × ${draft.thickness_mm} mm`],
              ["Uzunluk", `${draft.busbar_length_mm} mm`],
            ].map(([label, value]) => (
              <div key={label} style={{ background: "var(--surface)", borderRadius: "4px", padding: "0.4rem 0.6rem" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "2px" }}>{label}</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
