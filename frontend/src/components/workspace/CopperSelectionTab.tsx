import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import type { CopperDefinition, CopperSettings } from "../../types";
import { Modal } from "../Modal";
import { DeviceFrontView } from "./DeviceFrontView";
import { DeviceSideView } from "./DeviceSideView";
import { PanelTopView } from "./PanelTopView";

interface CopperSelectionTabProps {
  projectId: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY_SETTINGS: Omit<CopperSettings, "id" | "project_id"> = {
  main_width_mm: null,
  main_thickness_mm: null,
  main_material: "Cu",
  main_phase_spacing_mm: null,
  branch_width_mm: null,
  branch_thickness_mm: null,
  branch_material: "Cu",
  branch_phase_spacing_mm: null,
  bend_inner_radius_mm: null,
  k_factor: 0.33,
  min_hole_edge_distance_mm: null,
  min_bend_hole_distance_mm: null,
  default_hole_diameter_mm: null,
  use_slot_holes: false,
  slot_width_mm: null,
  slot_length_mm: null,
  busbar_x_mm: null,
  busbar_y_mm: null,
  busbar_z_mm: null,
  busbar_orientation: "horizontal",
  busbar_length_mm: null,
  busbar_phase_count: 3,
  bars_per_phase: 1,
  bar_gap_mm: 0,
  busbar_plane: "XY",
  phase_stack_axis: "Y",
};

function buildUpsertPayload(s: CopperSettings): Omit<CopperSettings, "id" | "project_id"> {
  return {
    main_width_mm:            s.main_width_mm ?? null,
    main_thickness_mm:        s.main_thickness_mm ?? null,
    main_material:            s.main_material ?? "Cu",
    main_phase_spacing_mm:    s.main_phase_spacing_mm ?? null,
    branch_width_mm:          s.branch_width_mm ?? null,
    branch_thickness_mm:      s.branch_thickness_mm ?? null,
    branch_material:          s.branch_material ?? "Cu",
    branch_phase_spacing_mm:  s.branch_phase_spacing_mm ?? null,
    bend_inner_radius_mm:     s.bend_inner_radius_mm ?? null,
    k_factor:                 s.k_factor ?? 0.33,
    min_hole_edge_distance_mm:s.min_hole_edge_distance_mm ?? null,
    min_bend_hole_distance_mm:s.min_bend_hole_distance_mm ?? null,
    default_hole_diameter_mm: s.default_hole_diameter_mm ?? null,
    use_slot_holes:           s.use_slot_holes ?? false,
    slot_width_mm:            s.slot_width_mm ?? null,
    slot_length_mm:           s.slot_length_mm ?? null,
    busbar_x_mm:              s.busbar_x_mm ?? null,
    busbar_y_mm:              s.busbar_y_mm ?? null,
    busbar_z_mm:              s.busbar_z_mm ?? null,
    busbar_orientation:       s.busbar_orientation ?? "horizontal",
    busbar_length_mm:         s.busbar_length_mm ?? null,
    busbar_phase_count:       s.busbar_phase_count ?? 3,
    bars_per_phase:           s.bars_per_phase ?? 1,
    bar_gap_mm:               s.bar_gap_mm ?? 0,
    busbar_plane:             s.busbar_plane ?? "XY",
    phase_stack_axis:         s.phase_stack_axis ?? "Y",
  };
}

function dimLabel(w?: number | null, t?: number | null) {
  if (!w && !t) return "—";
  return `${w ?? "?"}  ×  ${t ?? "?"} mm`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CopperSelectionTab({ projectId }: CopperSelectionTabProps) {
  const queryClient = useQueryClient();

  // Which card is being edited: "main" | "branch" | null
  const [editingType, setEditingType] = useState<"main" | "branch" | null>(null);

  // Modal draft (filled when editing)
  const [draft, setDraft] = useState<Partial<CopperSettings>>({});

  // ── Queries ──────────────────────────────────────────────────────────────────
  const settingsQuery = useQuery({
    queryKey: ["copper-settings", projectId],
    queryFn: () => client.getCopperSettings(projectId),
  });

  const definitionsQuery = useQuery({
    queryKey: ["copper-definitions"],
    queryFn: client.listCopperDefinitions,
  });

  const panelQuery = useQuery({
    queryKey: ["panel", projectId],
    queryFn: () => client.getPanel(projectId),
  });

  const projectPanelsQuery = useQuery({
    queryKey: ["project-panels", projectId],
    queryFn: () => client.listProjectPanels(projectId),
  });

  const projectDevicesQuery = useQuery({
    queryKey: ["project-devices", projectId],
    queryFn: () => client.listProjectDevices(projectId),
  });

  // ── Mutation ─────────────────────────────────────────────────────────────────
  const upsertMutation = useMutation({
    mutationFn: (payload: Omit<CopperSettings, "id" | "project_id">) =>
      client.upsertCopperSettings(projectId, payload as CopperSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["copper-settings", projectId] });
      setEditingType(null);
    },
  });

  // ── Data ─────────────────────────────────────────────────────────────────────
  const settings: CopperSettings = settingsQuery.data ?? (EMPTY_SETTINGS as CopperSettings);
  const definitions = definitionsQuery.data ?? [];
  const panel = panelQuery.data ?? null;
  const projectPanels = projectPanelsQuery.data ?? [];
  const devices = projectDevicesQuery.data ?? [];

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function openEdit(type: "main" | "branch") {
    setEditingType(type);
    setDraft({ ...settings });
  }

  function handleDefinitionSelect(defId: number, type: "main" | "branch") {
    const def = definitions.find((d) => d.id === defId);
    if (!def) return;
    if (type === "main") {
      setDraft((prev) => ({
        ...prev,
        main_width_mm:         Number(def.main_width_mm ?? prev.main_width_mm ?? null) || null,
        main_thickness_mm:     Number(def.main_thickness_mm ?? prev.main_thickness_mm ?? null) || null,
        main_material:         def.main_material ?? prev.main_material ?? "Cu",
        main_phase_spacing_mm: Number(def.main_phase_spacing_mm ?? prev.main_phase_spacing_mm ?? null) || null,
      }));
    } else {
      setDraft((prev) => ({
        ...prev,
        branch_width_mm:         Number(def.branch_width_mm ?? def.main_width_mm ?? prev.branch_width_mm ?? null) || null,
        branch_thickness_mm:     Number(def.branch_thickness_mm ?? def.main_thickness_mm ?? prev.branch_thickness_mm ?? null) || null,
        branch_material:         def.branch_material ?? def.main_material ?? prev.branch_material ?? "Cu",
      }));
    }
  }

  function saveStandard() {
    upsertMutation.mutate(buildUpsertPayload({ ...settings, ...draft }));
  }

  function savePlacement(placement: Partial<CopperSettings>) {
    upsertMutation.mutate(buildUpsertPayload({ ...settings, ...placement }));
  }

  // ── Placement form local state ────────────────────────────────────────────────
  const [placX, setPlacX] = useState<number>(() => Number(settings.busbar_x_mm ?? 0));
  const [placY, setPlacY] = useState<number>(() => Number(settings.busbar_y_mm ?? 0));
  const [placZ, setPlacZ] = useState<number>(() => Number(settings.busbar_z_mm ?? 0));
  const [placOrient, setPlacOrient] = useState<string>(() => settings.busbar_orientation ?? "horizontal");
  const [placLen, setPlacLen] = useState<number>(() => Number(settings.busbar_length_mm ?? 0));
  const [placPhase, setPlacPhase] = useState<number>(() => Number(settings.busbar_phase_count ?? 3));
  const [placBarsPerPhase, setPlacBarsPerPhase] = useState<number>(() => Number(settings.bars_per_phase ?? 1));
  const [placBarGap, setPlacBarGap] = useState<number>(() => Number(settings.bar_gap_mm ?? 0));
  const [placPlane, setPlacPlane] = useState<string>(() => settings.busbar_plane ?? "XY");
  const [placStackAxis, setPlacStackAxis] = useState<string>(() => settings.phase_stack_axis ?? "Y");

  // Sync from server when settings load
  const serverLoaded = !settingsQuery.isLoading && settingsQuery.data !== undefined;

  // Live preview settings (merge server settings with local placement form)
  const previewSettings: CopperSettings = {
    ...settings,
    busbar_x_mm: placX,
    busbar_y_mm: placY,
    busbar_z_mm: placZ,
    busbar_orientation: placOrient,
    busbar_length_mm: placLen,
    busbar_phase_count: placPhase,
    bars_per_phase: placBarsPerPhase,
    bar_gap_mm: placBarGap,
    busbar_plane: placPlane,
    phase_stack_axis: placStackAxis,
  };

  // ── Card helper ───────────────────────────────────────────────────────────────

  function CopperCard({
    type,
    title,
    icon,
    accentColor,
  }: {
    type: "main" | "branch";
    title: string;
    icon: string;
    accentColor: string;
  }) {
    const isMain = type === "main";
    const defined = isMain
      ? !!(settings.main_width_mm || settings.main_thickness_mm)
      : !!(settings.branch_width_mm || settings.branch_thickness_mm);

    return (
      <div
        style={{
          border: `1.5px solid ${defined ? accentColor + "55" : "var(--line)"}`,
          borderRadius: "18px",
          padding: "1.25rem 1.4rem",
          background: defined ? `${accentColor}08` : "var(--panel)",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          minWidth: 0,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.3rem" }}>{icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>{title}</div>
            <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.15rem" }}>
              {isMain ? "Proje genelinde tek ana dağıtım sistemi" : "Cihaz bağlantıları için standart"}
            </div>
          </div>
          <button
            type="button"
            className="ghost"
            style={{ padding: "0.3rem 0.75rem", fontSize: "0.82rem", borderRadius: "8px", flexShrink: 0 }}
            onClick={() => openEdit(type)}
          >
            {defined ? "Düzenle" : "Tanımla"}
          </button>
        </div>

        {/* Values */}
        {defined ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div style={{ background: "var(--panel-strong)", borderRadius: "10px", padding: "0.55rem 0.8rem" }}>
              <div style={{ fontSize: "0.73rem", color: "var(--muted)", marginBottom: "0.2rem" }}>Kesit (En × Kalınlık)</div>
              <div style={{ fontWeight: 700, fontFamily: "monospace", color: accentColor }}>
                {isMain
                  ? dimLabel(Number(settings.main_width_mm), Number(settings.main_thickness_mm))
                  : dimLabel(Number(settings.branch_width_mm), Number(settings.branch_thickness_mm))}
              </div>
            </div>
            {isMain && (
              <div style={{ background: "var(--panel-strong)", borderRadius: "10px", padding: "0.55rem 0.8rem" }}>
                <div style={{ fontSize: "0.73rem", color: "var(--muted)", marginBottom: "0.2rem" }}>Fazlar Arası Mesafe</div>
                <div style={{ fontWeight: 700, fontFamily: "monospace", color: accentColor }}>
                  {settings.main_phase_spacing_mm ? `${Number(settings.main_phase_spacing_mm)} mm` : "—"}
                </div>
              </div>
            )}
            <div style={{ background: "var(--panel-strong)", borderRadius: "10px", padding: "0.55rem 0.8rem" }}>
              <div style={{ fontSize: "0.73rem", color: "var(--muted)", marginBottom: "0.2rem" }}>Malzeme</div>
              <div style={{ fontWeight: 700, color: accentColor }}>
                {isMain ? (settings.main_material ?? "Cu") : (settings.branch_material ?? "Cu")}
              </div>
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: 0 }}>
            Henüz tanımlanmadı. "Tanımla" ile bakır standartını girin.
          </p>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="stack">

      {/* ══════════════════════════════════════
          BÖLÜM 1 — Kullanılacak Bakır Standartları
          ══════════════════════════════════════ */}
      <section className="table-card">
        <div className="section-header" style={{ marginBottom: "1rem" }}>
          <h3>Kullanılacak Bakır Standartları</h3>
          <span className="helper-text" style={{ fontSize: "0.82rem" }}>
            Ana bakır (proje geneli) · Tali bakır (bağlantı standardı)
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <CopperCard type="main"   title="Ana Bakır"   icon="⚡" accentColor="#e06800" />
          <CopperCard type="branch" title="Tali Bakır"  icon="🔗" accentColor="#1565c0" />
        </div>
      </section>

      {/* ══════════════════════════════════════
          BÖLÜM 2 — Ana Bakır Yerleşimi
          ══════════════════════════════════════ */}
      <section className="table-card">
        <div className="section-header" style={{ marginBottom: "1rem" }}>
          <h3>Ana Bakır Yerleşimi</h3>
          <span className="helper-text" style={{ fontSize: "0.82rem" }}>
            Koordinatlar: X = soldan, Y = alttan, Z = derinlik (mm)
          </span>
        </div>

        {!settings.main_width_mm ? (
          <div className="alert alert-warning" style={{ marginBottom: 0 }}>
            ⚠ Önce "Ana Bakır" standartını tanımlayın.
          </div>
        ) : (
          <>
            {/* Placement form */}
            <div className="form-grid" style={{ marginBottom: "1.25rem" }}>
              <label className="field">
                <span>X — Başlangıç (mm)</span>
                <input className="input" type="number" min={0} step={1}
                  value={placX} onChange={(e) => setPlacX(Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Y — Başlangıç (mm)</span>
                <input className="input" type="number" min={0} step={1}
                  value={placY} onChange={(e) => setPlacY(Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Z — Derinlik (mm)</span>
                <input className="input" type="number" min={0} step={1}
                  value={placZ} onChange={(e) => setPlacZ(Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Uzunluk (mm)</span>
                <input className="input" type="number" min={1} step={1}
                  value={placLen} onChange={(e) => setPlacLen(Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Yön</span>
                <select className="input" value={placOrient} onChange={(e) => setPlacOrient(e.target.value)}>
                  <option value="horizontal">Yatay</option>
                  <option value="vertical">Dikey</option>
                </select>
              </label>
              <label className="field">
                <span>Faz Sayısı</span>
                <select className="input" value={placPhase} onChange={(e) => setPlacPhase(Number(e.target.value))}>
                  <option value={1}>1 (L1)</option>
                  <option value={2}>2 (L1, L2)</option>
                  <option value={3}>3 (L1, L2, L3)</option>
                  <option value={4}>4 (L1, L2, L3, N)</option>
                  <option value={5}>5 (L1, L2, L3, N, PE)</option>
                </select>
              </label>
              <label className="field">
                <span>Faz Başına Bar Adedi</span>
                <input
                  className="input" type="number" min={1} max={6} step={1}
                  value={placBarsPerPhase}
                  onChange={(e) => setPlacBarsPerPhase(Math.max(1, Number(e.target.value)))}
                />
                <small style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
                  Toplam bar = {placPhase} faz × {placBarsPerPhase} = {placPhase * placBarsPerPhase} adet
                </small>
              </label>
              <label className="field">
                <span>Bar Arası Boşluk (mm)</span>
                <input
                  className="input" type="number" min={0} step={0.5}
                  value={placBarGap}
                  onChange={(e) => setPlacBarGap(Number(e.target.value))}
                />
                <small style={{ color: "var(--muted)", fontSize: "0.76rem" }}>
                  Aynı fazdaki barlar arasındaki hava boşluğu — 0 = bitişik
                </small>
              </label>
              <label className="field">
                <span>Bakır Düzlemi</span>
                <select className="input" value={placPlane} onChange={(e) => setPlacPlane(e.target.value)}>
                  <option value="XY">XY — Ön/Arka yüzey (derinlik sabit)</option>
                  <option value="XZ">XZ — Yatay düzlem (yükseklik sabit)</option>
                </select>
              </label>
              <label className="field">
                <span>Faz İstif Yönü</span>
                <select className="input" value={placStackAxis} onChange={(e) => setPlacStackAxis(e.target.value)}>
                  <option value="Y">Y — Fazlar dikey istifli (yukarı)</option>
                  <option value="Z">Z — Fazlar derinlik yönünde istifli</option>
                </select>
              </label>

              <div className="form-actions" style={{ gridColumn: "1 / -1", marginTop: 0 }}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!placLen || upsertMutation.isPending}
                  onClick={() =>
                    savePlacement({
                      busbar_x_mm: placX,
                      busbar_y_mm: placY,
                      busbar_z_mm: placZ,
                      busbar_orientation: placOrient,
                      busbar_length_mm: placLen,
                      busbar_phase_count: placPhase,
                      bars_per_phase: placBarsPerPhase,
                      bar_gap_mm: placBarGap,
                      busbar_plane: placPlane,
                      phase_stack_axis: placStackAxis,
                    })
                  }
                >
                  {upsertMutation.isPending ? "Kaydediliyor..." : "Yerleşimi Kaydet"}
                </button>
                <span style={{ fontSize: "0.82rem", color: "var(--muted)", alignSelf: "center" }}>
                  Değerleri değiştirince görünüm anlık güncellenir.
                </span>
              </div>
            </div>

            {/* Live front view with busbar overlay */}
            <DeviceFrontView
              panel={panel}
              projectPanels={projectPanels}
              devices={devices}
              copperSettings={previewSettings}
              title="Ana Bakır Yerleşimi — Ön Görünüş"
            />

            {/* Side + Top views with live overlay */}
            <div className="view-pair-grid">
              <DeviceSideView
                panel={panel}
                projectPanels={projectPanels}
                devices={devices}
                copperSettings={previewSettings}
              />
              <PanelTopView
                panel={panel}
                projectPanels={projectPanels}
                devices={devices}
                copperSettings={previewSettings}
              />
            </div>
          </>
        )}
      </section>

      {/* ══════════════════════════════════════
          MODAL — Bakır Standartı Düzenleme
          ══════════════════════════════════════ */}
      <Modal
        title={editingType === "main" ? "Ana Bakır Standardı" : "Tali Bakır Standardı"}
        open={!!editingType}
        onClose={() => setEditingType(null)}
      >
        {editingType && (
          <div className="modal-body">
            {/* Kütüphane hızlı seçici */}
            {definitions.length > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <label className="field">
                  <span>Bakır Tanımlama Kütüphanesinden Hızlı Doldur (isteğe bağlı)</span>
                  <select
                    className="input"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleDefinitionSelect(Number(e.target.value), editingType);
                    }}
                  >
                    <option value="">— Seçin veya manuel girin —</option>
                    {definitions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.main_width_mm ?? "?"}×{d.main_thickness_mm ?? "?"}mm
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="form-grid">
              {editingType === "main" ? (
                <>
                  <label className="field">
                    <span>En / Genişlik (mm)</span>
                    <input className="input" type="number" min={1} step={0.5}
                      value={Number(draft.main_width_mm ?? "")}
                      onChange={(e) => setDraft((p) => ({ ...p, main_width_mm: Number(e.target.value) || null }))}
                    />
                  </label>
                  <label className="field">
                    <span>Kalınlık (mm)</span>
                    <input className="input" type="number" min={1} step={0.5}
                      value={Number(draft.main_thickness_mm ?? "")}
                      onChange={(e) => setDraft((p) => ({ ...p, main_thickness_mm: Number(e.target.value) || null }))}
                    />
                  </label>
                  <label className="field">
                    <span>Fazlar Arası Mesafe (mm)</span>
                    <input className="input" type="number" min={1} step={1}
                      value={Number(draft.main_phase_spacing_mm ?? "")}
                      onChange={(e) => setDraft((p) => ({ ...p, main_phase_spacing_mm: Number(e.target.value) || null }))}
                    />
                  </label>
                  <label className="field">
                    <span>Malzeme</span>
                    <select className="input" value={draft.main_material ?? "Cu"}
                      onChange={(e) => setDraft((p) => ({ ...p, main_material: e.target.value }))}>
                      <option value="Cu">Bakır (Cu)</option>
                      <option value="Al">Alüminyum (Al)</option>
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="field">
                    <span>En / Genişlik (mm)</span>
                    <input className="input" type="number" min={1} step={0.5}
                      value={Number(draft.branch_width_mm ?? "")}
                      onChange={(e) => setDraft((p) => ({ ...p, branch_width_mm: Number(e.target.value) || null }))}
                    />
                  </label>
                  <label className="field">
                    <span>Kalınlık (mm)</span>
                    <input className="input" type="number" min={1} step={0.5}
                      value={Number(draft.branch_thickness_mm ?? "")}
                      onChange={(e) => setDraft((p) => ({ ...p, branch_thickness_mm: Number(e.target.value) || null }))}
                    />
                  </label>
                  <label className="field">
                    <span>Malzeme</span>
                    <select className="input" value={draft.branch_material ?? "Cu"}
                      onChange={(e) => setDraft((p) => ({ ...p, branch_material: e.target.value }))}>
                      <option value="Cu">Bakır (Cu)</option>
                      <option value="Al">Alüminyum (Al)</option>
                    </select>
                  </label>
                  <div style={{ gridColumn: "1 / -1", padding: "0.5rem 0.75rem", background: "var(--accent-soft)", borderRadius: "8px", fontSize: "0.83rem", color: "var(--muted)" }}>
                    ℹ Tali bakırlar cihaza göre sistem tarafından otomatik üretilir. Bu standarttaki ölçüler tüm tali bağlantılara uygulanır.
                  </div>
                </>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={upsertMutation.isPending}
                onClick={saveStandard}
              >
                {upsertMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button type="button" className="ghost" onClick={() => setEditingType(null)}>
                İptal
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
