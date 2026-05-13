import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { client } from "../api/client";
import { TerminalPreview } from "../components/TerminalPreview";
import type { TerminalDefinition } from "../types";

// ─── Sabitler ─────────────────────────────────────────────────────────────────
const TERMINAL_TYPES = [
  "Ön Bakır Basmalı",
  "Arka Yatay Taraklı",
  "Yandan Taraklı",
  "Üstten Taraklı",
  "Kablo Pabuçlu",
];

const SURFACES = [
  { value: "front",  label: "Ön" },
  { value: "back",   label: "Arka" },
  { value: "left",   label: "Sol" },
  { value: "right",  label: "Sağ" },
  { value: "top",    label: "Üst" },
  { value: "bottom", label: "Alt" },
];

// ─── Draft ────────────────────────────────────────────────────────────────────
interface TerminalDraft {
  name: string;
  terminal_type: string;
  surface: string;
  bolt_type: string;
  bolt_count: number | null;
  bolt_center_distance_mm: number | null;
  hole_diameter_mm: number | null;
  terminal_width_mm: number | null;
  terminal_height_mm: number | null;
  terminal_depth_mm: number | null;
}

const EMPTY_DRAFT: TerminalDraft = {
  name: "",
  terminal_type: "Ön Bakır Basmalı",
  surface: "front",
  bolt_type: "M12",
  bolt_count: 2,
  bolt_center_distance_mm: 25,
  hole_diameter_mm: 13,
  terminal_width_mm: 50,
  terminal_height_mm: 80,
  terminal_depth_mm: 40,
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
    terminal_width_mm: d.terminal_width_mm,
    terminal_height_mm: d.terminal_height_mm,
    terminal_depth_mm: d.terminal_depth_mm,
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
      <span>{label}{unit ? <span style={{ color: "var(--muted)", fontWeight: 400 }}> ({unit})</span> : ""}</span>
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

  // Düzenleme modunda mevcut tanımı çek
  const detailQuery = useQuery({
    queryKey: ["terminal-definitions", id],
    queryFn: () => client.listTerminalDefinitions(),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit && detailQuery.data) {
      const def = detailQuery.data.find((d) => d.id === Number(id));
      if (def) {
        setDraft({
          name: def.name,
          terminal_type: def.terminal_type,
          surface: def.surface,
          bolt_type: def.bolt_type ?? "M12",
          bolt_count: def.bolt_count ?? null,
          bolt_center_distance_mm: def.bolt_center_distance_mm ?? null,
          hole_diameter_mm: def.hole_diameter_mm ?? null,
          terminal_width_mm: def.terminal_width_mm ?? null,
          terminal_height_mm: def.terminal_height_mm ?? null,
          terminal_depth_mm: def.terminal_depth_mm ?? null,
        });
      }
    }
  }, [isEdit, detailQuery.data, id]);

  function set<K extends keyof TerminalDraft>(key: K, value: TerminalDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["terminal-definitions"] });
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

  return (
    <div className="stack">
      {/* ── Başlık ── */}
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Terminal Tipleri</span>
          <h1>{isEdit ? "Terminal Tipini Düzenle" : "Yeni Terminal Tipi"}</h1>
          <p>
            Terminal geometrisini ve bağlantı özelliklerini tanımlayın.
            Sağdaki önizleme parametrelerinizi anlık yansıtır.
          </p>
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
                  onChange={(e) => set("terminal_type", e.target.value)}>
                  {TERMINAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              <label className="field">
                <span>Bağlantı Yüzeyi</span>
                <select className="input" value={draft.surface}
                  onChange={(e) => set("surface", e.target.value)}>
                  {SURFACES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
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

              <NumField label="Delik Çapı" unit="mm"
                value={draft.hole_diameter_mm}
                onChange={(v) => set("hole_diameter_mm", v)} />
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
        <div style={{ position: "sticky", top: "1rem" }}>
          <section className="card">
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Terminal Önizleme
            </h3>

            {/* Tip rozeti */}
            <div style={{ marginBottom: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
                {SURFACES.find(s => s.value === draft.surface)?.label ?? draft.surface} Yüzey
              </span>
            </div>

            {/* SVG Önizleme */}
            <div style={{
              background: "var(--surface-alt, rgba(0,0,0,0.03))",
              borderRadius: 8,
              border: "1px solid var(--line)",
              padding: "0.5rem",
              display: "flex",
              justifyContent: "center",
            }}>
              <TerminalPreview
                terminal_type={draft.terminal_type}
                terminal_width_mm={draft.terminal_width_mm}
                terminal_height_mm={draft.terminal_height_mm}
                terminal_depth_mm={draft.terminal_depth_mm}
                bolt_count={draft.bolt_count}
                bolt_center_distance_mm={draft.bolt_center_distance_mm}
                hole_diameter_mm={draft.hole_diameter_mm}
                width={280}
                height={320}
              />
            </div>

            {/* Özet bilgiler */}
            <div style={{ marginTop: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
              {[
                ["Vida", draft.bolt_type ? `${draft.bolt_type} ×${draft.bolt_count ?? "?"}` : "—"],
                ["Merkez", draft.bolt_center_distance_mm ? `${draft.bolt_center_distance_mm} mm` : "—"],
                ["Delik Ø", draft.hole_diameter_mm ? `${draft.hole_diameter_mm} mm` : "—"],
                ["Boyut", draft.terminal_width_mm && draft.terminal_height_mm
                  ? `${draft.terminal_width_mm}×${draft.terminal_height_mm}×${draft.terminal_depth_mm ?? "?"} mm`
                  : "—"],
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
        </div>
      </div>
    </div>
  );
}
