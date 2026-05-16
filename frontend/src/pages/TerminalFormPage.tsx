import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { client } from "../api/client";
import { TerminalPreview } from "../components/TerminalPreview";
import type { TerminalDefinition } from "../types";

// ─── Sabitler ─────────────────────────────────────────────────────────────────
export const TERMINAL_TYPES = [
  "Ön Terminal",
  "Arka Yatay Taraklı",
  "Arka Yatay Terminal",
  "Yandan Taraklı",
  "Kablo Pabuçlu",
];

const ALL_SURFACES = [
  { value: "front",  label: "Ön" },
  { value: "left",   label: "Sol" },
  { value: "right",  label: "Sağ" },
  { value: "top",    label: "Üst" },
  { value: "bottom", label: "Alt" },
];

// Her terminal tipinde geçerli yüzey seçenekleri
const SURFACE_OPTIONS_BY_TYPE: Record<string, string[]> = {
  "Ön Terminal":         ["front"],
  "Arka Yatay Taraklı":  ["top", "bottom"],
  "Arka Yatay Terminal": ["top", "bottom"],
  "Yandan Taraklı":      ["left", "right"],
  "Kablo Pabuçlu":       ["front"],
};

function defaultSurface(terminalType: string): string {
  const opts = SURFACE_OPTIONS_BY_TYPE[terminalType] ?? ["front"];
  return opts[0];
}

// Taraklı tipler — fin alanları göster
function isTarakli(terminalType: string): boolean {
  return terminalType === "Arka Yatay Taraklı" || terminalType === "Yandan Taraklı";
}

// ─── Draft ────────────────────────────────────────────────────────────────────
interface TerminalDraft {
  name: string;
  terminal_type: string;
  surface: string;
  bolt_type: string;
  bolt_count: number | null;
  bolt_center_distance_mm: number | null;
  hole_diameter_mm: number | null;
  slot_width_mm: number | null;
  slot_length_mm: number | null;
  terminal_width_mm: number | null;
  terminal_height_mm: number | null;
  terminal_depth_mm: number | null;
  fin_count: number | null;
  fin_spacing_mm: number | null;
  fin_thickness_mm: number | null;
  fin_length_mm: number | null;
  plate_thickness_mm: number | null;
  bolt_pos_x_mm: number | null;  // sol kenardan ilk delik merkezi
  bolt_pos_y_mm: number | null;  // üst yüzeyden delik satırı merkezi
  bolt_pos_z_mm: number | null;  // ön yüzeyden delik merkezi derinliği
}

const EMPTY_DRAFT: TerminalDraft = {
  name: "",
  terminal_type: "Ön Terminal",
  surface: "front",
  bolt_type: "M12",
  bolt_count: 2,
  bolt_center_distance_mm: 70,
  hole_diameter_mm: 13,
  slot_width_mm: null,
  slot_length_mm: null,
  terminal_width_mm: 100,
  terminal_height_mm: 120,
  terminal_depth_mm: 60,
  fin_count: null,
  fin_spacing_mm: null,
  fin_thickness_mm: null,
  fin_length_mm: null,
  plate_thickness_mm: null,
  bolt_pos_x_mm: null,
  bolt_pos_y_mm: null,
  bolt_pos_z_mm: null,
};

function buildPayload(d: TerminalDraft): Omit<TerminalDefinition, "id" | "created_at" | "updated_at"> {
  return {
    name: d.name,
    terminal_type: d.terminal_type,
    surface: d.surface,
    bolt_type: d.bolt_type || null,
    bolt_count: d.bolt_count,
    bolt_center_distance_mm: d.bolt_center_distance_mm,
    hole_diameter_mm: d.hole_diameter_mm,
    slot_width_mm: d.slot_width_mm,
    slot_length_mm: d.slot_length_mm,
    terminal_width_mm: d.terminal_width_mm,
    terminal_height_mm: d.terminal_height_mm,
    terminal_depth_mm: d.terminal_depth_mm,
    fin_count: isTarakli(d.terminal_type) ? d.fin_count : null,
    fin_spacing_mm: isTarakli(d.terminal_type) ? d.fin_spacing_mm : null,
    fin_thickness_mm: isTarakli(d.terminal_type) ? d.fin_thickness_mm : null,
    fin_length_mm: isTarakli(d.terminal_type) ? d.fin_length_mm : null,
    plate_thickness_mm: isTarakli(d.terminal_type) ? d.plate_thickness_mm : null,
    bolt_pos_x_mm: d.bolt_pos_x_mm,
    bolt_pos_y_mm: d.bolt_pos_y_mm,
    bolt_pos_z_mm: d.bolt_pos_z_mm,
  };
}

// ─── Sayısal input (null destekli) ────────────────────────────────────────────
function NumField({
  label, value, onChange, unit, min,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  unit?: string;
  min?: number;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {unit && <span style={{ color: "var(--muted)", fontWeight: 400 }}> ({unit})</span>}
      </span>
      <input
        className="input"
        type="number"
        step="any"
        min={min}
        value={value ?? ""}
        placeholder="—"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      />
    </label>
  );
}

// ─── Sayfa ────────────────────────────────────────────────────────────────────
export function TerminalFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [draft, setDraft] = useState<TerminalDraft>(EMPTY_DRAFT);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [holeMode, setHoleMode] = useState<"round" | "slot">("round");

  // Düzenleme modunda tek kayıt çek (GET /{id})
  const detailQuery = useQuery({
    queryKey: ["terminal-definition", id],
    queryFn: () => client.getTerminalDefinition(Number(id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit && detailQuery.data) {
      const def = detailQuery.data;
      setDraft({
        name: def.name,
        terminal_type: def.terminal_type,
        surface: def.surface,
        bolt_type: def.bolt_type ?? "M12",
        bolt_count: def.bolt_count ?? null,
        bolt_center_distance_mm: def.bolt_center_distance_mm ?? null,
        hole_diameter_mm: def.hole_diameter_mm ?? null,
        slot_width_mm: def.slot_width_mm ?? null,
        slot_length_mm: def.slot_length_mm ?? null,
        terminal_width_mm: def.terminal_width_mm ?? null,
        terminal_height_mm: def.terminal_height_mm ?? null,
        terminal_depth_mm: def.terminal_depth_mm ?? null,
        fin_count: def.fin_count ?? null,
        fin_spacing_mm: def.fin_spacing_mm ?? null,
        fin_thickness_mm: def.fin_thickness_mm ?? null,
        fin_length_mm: def.fin_length_mm ?? null,
        plate_thickness_mm: def.plate_thickness_mm ?? null,
        bolt_pos_x_mm: def.bolt_pos_x_mm ?? null,
        bolt_pos_y_mm: def.bolt_pos_y_mm ?? null,
        bolt_pos_z_mm: def.bolt_pos_z_mm ?? null,
      });
      if (def.slot_width_mm || def.slot_length_mm) {
        setHoleMode("slot");
      }
    }
  }, [isEdit, detailQuery.data]);

  function set<K extends keyof TerminalDraft>(key: K, value: TerminalDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  // Terminal tipi değişince yüzeyi sıfırla
  function changeType(newType: string) {
    const validSurfaces = SURFACE_OPTIONS_BY_TYPE[newType] ?? ["front"];
    const currentValid = validSurfaces.includes(draft.surface);
    setDraft((d) => ({
      ...d,
      terminal_type: newType,
      surface: currentValid ? d.surface : validSurfaces[0],
    }));
  }

  // Delik modu değiştiğinde karşı alanları temizle
  function changeHoleMode(mode: "round" | "slot") {
    setHoleMode(mode);
    if (mode === "round") {
      setDraft((d) => ({ ...d, slot_width_mm: null, slot_length_mm: null }));
    } else {
      setDraft((d) => ({ ...d, hole_diameter_mm: null }));
    }
  }

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["terminal-definitions"] });
    await qc.invalidateQueries({ queryKey: ["terminal-definition", id] });
  };

  const createMutation = useMutation({
    mutationFn: () => client.createTerminalDefinition(buildPayload(draft)),
    onSuccess: async () => { await invalidate(); navigate("/definitions/terminal-types"); },
    onError: () => setSaveError("Kaydetme işlemi başarısız oldu."),
  });

  const updateMutation = useMutation({
    mutationFn: () => client.updateTerminalDefinition(Number(id), buildPayload(draft)),
    onSuccess: async () => { await invalidate(); navigate("/definitions/terminal-types"); },
    onError: () => setSaveError("Güncelleme işlemi başarısız oldu."),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    isEdit ? updateMutation.mutate() : createMutation.mutate();
  }

  if (isEdit && detailQuery.isLoading) {
    return (
      <div className="stack">
        <div style={{ padding: "2rem", color: "var(--muted)", textAlign: "center" }}>Yükleniyor...</div>
      </div>
    );
  }

  const validSurfaces = ALL_SURFACES.filter(
    (s) => (SURFACE_OPTIONS_BY_TYPE[draft.terminal_type] ?? ["front"]).includes(s.value)
  );
  const surfaceLabel = ALL_SURFACES.find(s => s.value === draft.surface)?.label ?? draft.surface;
  const showFinFields = isTarakli(draft.terminal_type);

  return (
    <div className="stack">
      {/* ── Başlık ── */}
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Terminal Tipleri</span>
          <h1>{isEdit ? "Terminal Tipini Düzenle" : "Yeni Terminal Tipi"}</h1>
          <p>Terminal geometrisini ve bağlantı özelliklerini tanımlayın. Sağdaki önizleme anlık yansıtır.</p>
        </div>
        <button type="button" className="ghost" onClick={() => navigate("/definitions/terminal-types")}>
          ← Listeye Dön
        </button>
      </section>

      {saveError && <div className="alert alert-warning">{saveError}</div>}

      {/* ── 2 Panel Layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

        {/* ── Sol: Form ── */}
        <form onSubmit={handleSubmit}>

          {/* A — Temel Bilgiler */}
          <section className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              A — Temel Bilgiler
            </h3>
            <div className="form-grid">
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Terminal Adı</span>
                <input
                  className="input"
                  required
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="ör. ABB Emax2 Ön Terminal M12"
                />
              </label>

              <label className="field">
                <span>Terminal Tipi</span>
                <select className="input" value={draft.terminal_type}
                  onChange={(e) => changeType(e.target.value)}>
                  {TERMINAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              <label className="field">
                <span>Basma Yüzeyi</span>
                <select className="input" value={draft.surface}
                  onChange={(e) => set("surface", e.target.value)}>
                  {validSurfaces.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
            </div>
          </section>

          {/* B — Vida & Delik */}
          <section className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              B — Vida & Delik
            </h3>
            <div className="form-grid">
              <label className="field">
                <span>Vida Tipi</span>
                <input className="input" value={draft.bolt_type}
                  onChange={(e) => set("bolt_type", e.target.value)}
                  placeholder="M10, M12..." />
              </label>

              <NumField label="Vida Adedi" value={draft.bolt_count}
                onChange={(v) => set("bolt_count", v != null ? Math.round(v) : null)}
                min={1} />

              <NumField label="Vida Merkez Mesafesi" unit="mm"
                value={draft.bolt_center_distance_mm}
                onChange={(v) => set("bolt_center_distance_mm", v)} />

              {/* Delik tipi seçimi */}
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Delik Tipi</span>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
                  {(["round", "slot"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => changeHoleMode(m)}
                      style={{
                        padding: "0.3rem 0.9rem",
                        borderRadius: 6,
                        border: "1px solid var(--line)",
                        background: holeMode === m ? "var(--accent)" : "var(--surface)",
                        color: holeMode === m ? "#fff" : "var(--fg)",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        fontWeight: holeMode === m ? 600 : 400,
                      }}
                    >
                      {m === "round" ? "Yuvarlak Delik" : "Slot Delik"}
                    </button>
                  ))}
                </div>
              </label>

              {holeMode === "round" ? (
                <NumField label="Delik Çapı" unit="mm"
                  value={draft.hole_diameter_mm}
                  onChange={(v) => set("hole_diameter_mm", v)} />
              ) : (
                <>
                  <NumField label="Slot Genişliği" unit="mm"
                    value={draft.slot_width_mm}
                    onChange={(v) => set("slot_width_mm", v)} />
                  <NumField label="Slot Uzunluğu" unit="mm"
                    value={draft.slot_length_mm}
                    onChange={(v) => set("slot_length_mm", v)} />
                </>
              )}
            </div>
          </section>

          {/* C — Fiziksel Boyutlar */}
          <section className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              C — Fiziksel Boyutlar
            </h3>
            <div className="form-grid">
              <NumField label="Genişlik X" unit="mm"
                value={draft.terminal_width_mm}
                onChange={(v) => set("terminal_width_mm", v)} />
              <NumField label="Yükseklik Y" unit="mm"
                value={draft.terminal_height_mm}
                onChange={(v) => set("terminal_height_mm", v)} />
              <NumField label="Derinlik Z" unit="mm"
                value={draft.terminal_depth_mm}
                onChange={(v) => set("terminal_depth_mm", v)} />
            </div>
          </section>

          {/* D — Delik Konumu */}
          <section className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              D — Delik Konumu
            </h3>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "var(--muted)" }}>
              Boş bırakılırsa delikler otomatik ortalanır. Belirtilirse tam konum kullanılır.
            </p>
            <div className="form-grid">
              {/* X: sol kenar — tüm tipler */}
              <NumField
                label="Sol Kenardan (X)"
                unit="mm"
                value={draft.bolt_pos_x_mm}
                onChange={(v) => set("bolt_pos_x_mm", v)}
              />

              {/* Y: üstten — Ön Terminal, Kablo Pabuçlu, Yandan Taraklı */}
              {(draft.terminal_type === "Ön Terminal" ||
                draft.terminal_type === "Kablo Pabuçlu" ||
                draft.terminal_type === "Yandan Taraklı") && (
                <NumField
                  label="Üstten (Y)"
                  unit="mm"
                  value={draft.bolt_pos_y_mm}
                  onChange={(v) => set("bolt_pos_y_mm", v)}
                />
              )}

              {/* Z: önden derinlik — Arka Yatay ve Yandan Taraklı */}
              {(draft.terminal_type === "Arka Yatay Taraklı" ||
                draft.terminal_type === "Arka Yatay Terminal" ||
                draft.terminal_type === "Yandan Taraklı") && (
                <NumField
                  label="Önden (Z)"
                  unit="mm"
                  value={draft.bolt_pos_z_mm}
                  onChange={(v) => set("bolt_pos_z_mm", v)}
                />
              )}
            </div>
          </section>

          {/* E — Fin / Tarak (Taraklı tipler için) */}
          {showFinFields && (
            <section className="card" style={{ marginBottom: "1rem" }}>
              <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                E — Tarak (Fin) Geometrisi
              </h3>
              <div className="form-grid">
                <NumField label="Fin Adedi" value={draft.fin_count}
                  onChange={(v) => set("fin_count", v != null ? Math.round(v) : null)}
                  min={1} />
                <NumField label="Fin Aralığı" unit="mm"
                  value={draft.fin_spacing_mm}
                  onChange={(v) => set("fin_spacing_mm", v)} />
                <NumField label="Fin Kalınlığı" unit="mm"
                  value={draft.fin_thickness_mm}
                  onChange={(v) => set("fin_thickness_mm", v)} />
                <NumField label="Fin Uzunluğu" unit="mm"
                  value={draft.fin_length_mm}
                  onChange={(v) => set("fin_length_mm", v)} />
                <NumField label="Plaka Kalınlığı" unit="mm"
                  value={draft.plate_thickness_mm}
                  onChange={(v) => set("plate_thickness_mm", v)} />
              </div>
            </section>
          )}

          {/* Kaydet */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Kaydet"}
            </button>
            <button type="button" className="ghost"
              onClick={() => navigate("/definitions/terminal-types")}>
              İptal
            </button>
          </div>
        </form>

        {/* ── Sağ: Önizleme ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Bilgi kartı — rozetler + özet */}
          <section className="card">
            <div style={{ marginBottom: "0.6rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{
                padding: "3px 10px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600,
                background: "var(--accent-soft)", color: "var(--accent)",
              }}>
                {draft.terminal_type}
              </span>
              <span style={{
                padding: "3px 10px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600,
                background: "rgba(148,163,184,0.12)", color: "var(--muted)",
              }}>
                {surfaceLabel} Yüzey
              </span>
              <span style={{
                padding: "3px 10px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600,
                background: holeMode === "slot" ? "rgba(251,191,36,0.15)" : "rgba(148,163,184,0.08)",
                color: holeMode === "slot" ? "#b45309" : "var(--muted)",
              }}>
                {holeMode === "slot" ? "Slot Delik" : "Yuvarlak Delik"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
              {[
                ["Vida", draft.bolt_type ? `${draft.bolt_type} ×${draft.bolt_count ?? "?"}` : "—"],
                ["Merkez", draft.bolt_center_distance_mm ? `${draft.bolt_center_distance_mm} mm` : "—"],
                ["Delik", holeMode === "round"
                  ? (draft.hole_diameter_mm ? `Ø${draft.hole_diameter_mm} mm` : "—")
                  : (draft.slot_width_mm && draft.slot_length_mm ? `${draft.slot_width_mm}×${draft.slot_length_mm} mm` : "—")],
                ["Boyut", draft.terminal_width_mm && draft.terminal_height_mm
                  ? `${draft.terminal_width_mm}×${draft.terminal_height_mm}×${draft.terminal_depth_mm ?? "?"} mm`
                  : "—"],
                ...(showFinFields
                  ? [["Fin", draft.fin_count ? `${draft.fin_count} adet${draft.fin_spacing_mm ? ` / ${draft.fin_spacing_mm} mm ara` : ""}${draft.fin_thickness_mm ? ` / ${draft.fin_thickness_mm} mm kalın` : ""}` : "—"]]
                  : []),
              ].map(([label, value]) => (
                <div key={label} style={{
                  background: "var(--surface-alt, rgba(0,0,0,0.03))",
                  borderRadius: 6, padding: "0.35rem 0.6rem",
                  border: "1px solid var(--line)",
                }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 600, fontFamily: "monospace", marginTop: "0.1rem" }}>{value}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 4 görünüş */}
          <TerminalPreview
            terminal_type={draft.terminal_type}
            surface={draft.surface}
            terminal_width_mm={draft.terminal_width_mm}
            terminal_height_mm={draft.terminal_height_mm}
            terminal_depth_mm={draft.terminal_depth_mm}
            bolt_count={draft.bolt_count}
            bolt_center_distance_mm={draft.bolt_center_distance_mm}
            hole_diameter_mm={draft.hole_diameter_mm}
            slot_width_mm={draft.slot_width_mm}
            slot_length_mm={draft.slot_length_mm}
            fin_count={draft.fin_count}
            fin_spacing_mm={draft.fin_spacing_mm}
            fin_thickness_mm={draft.fin_thickness_mm}
            fin_length_mm={draft.fin_length_mm}
            plate_thickness_mm={draft.plate_thickness_mm}
            bolt_pos_x_mm={draft.bolt_pos_x_mm}
            bolt_pos_y_mm={draft.bolt_pos_y_mm}
            bolt_pos_z_mm={draft.bolt_pos_z_mm}
          />
        </div>
      </div>
    </div>
  );
}
