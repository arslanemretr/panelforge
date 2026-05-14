import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { client } from "../api/client";
import type { PanelDefinition } from "../types";

// ─── Draft ────────────────────────────────────────────────────────────────────
type DraftDef = Omit<PanelDefinition, "id" | "created_at" | "updated_at" | "panel_type">;

const EMPTY: DraftDef = {
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

function draftFromDef(d: PanelDefinition): DraftDef {
  return {
    name: d.name,
    description: d.description ?? "",
    width_mm: d.width_mm,
    height_mm: d.height_mm,
    depth_mm: d.depth_mm ?? 600,
    mounting_plate_width_mm: d.mounting_plate_width_mm ?? null,
    mounting_plate_height_mm: d.mounting_plate_height_mm ?? null,
    left_margin_mm: d.left_margin_mm,
    right_margin_mm: d.right_margin_mm,
    top_margin_mm: d.top_margin_mm,
    bottom_margin_mm: d.bottom_margin_mm,
    panel_type_id: d.panel_type_id ?? null,
    origin_x_mm: d.origin_x_mm ?? 0,
    origin_y_mm: d.origin_y_mm ?? 0,
    origin_z_mm: d.origin_z_mm ?? 0,
  };
}

// ─── Sayısal input ────────────────────────────────────────────────────────────
function NumField({ label, value, onChange, unit = "mm", min }: {
  label: string; value: number; onChange: (v: number) => void; unit?: string; min?: number;
}) {
  return (
    <label className="field">
      <span>{label}{unit && <span style={{ color: "var(--muted)", fontWeight: 400 }}> ({unit})</span>}</span>
      <input className="input" type="number" min={min} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

// ─── Dim yardımcıları ─────────────────────────────────────────────────────────
function DimH({ x1, x2, y, label, color = "#64748b" }: {
  x1: number; x2: number; y: number; label: string; color?: string;
}) {
  const cx = (x1 + x2) / 2;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={color} strokeWidth={0.7} />
      <line x1={x1} y1={y - 3} x2={x1} y2={y + 3} stroke={color} strokeWidth={0.7} />
      <line x1={x2} y1={y - 3} x2={x2} y2={y + 3} stroke={color} strokeWidth={0.7} />
      <rect x={cx - 22} y={y - 11} width={44} height={11} fill="#1a1f2b" />
      <text x={cx} y={y - 2} textAnchor="middle" fontSize={8} fill={color} fontFamily="monospace">{label}</text>
    </g>
  );
}

function DimV({ x, y1, y2, label, color = "#64748b" }: {
  x: number; y1: number; y2: number; label: string; color?: string;
}) {
  const cy = (y1 + y2) / 2;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={color} strokeWidth={0.7} />
      <line x1={x - 3} y1={y1} x2={x + 3} y2={y1} stroke={color} strokeWidth={0.7} />
      <line x1={x - 3} y1={y2} x2={x + 3} y2={y2} stroke={color} strokeWidth={0.7} />
      <rect x={x - 22} y={cy - 6} width={44} height={11} fill="#1a1f2b" />
      <text x={x} y={cy + 4} textAnchor="middle" fontSize={8} fill={color} fontFamily="monospace"
        transform={`rotate(-90,${x},${cy})`}>{label}</text>
    </g>
  );
}

// ─── Ön Görünüş SVG ───────────────────────────────────────────────────────────
function FrontView({ draft }: { draft: DraftDef }) {
  const W = Math.max(draft.width_mm, 1);
  const H = Math.max(draft.height_mm, 1);
  const lm = draft.left_margin_mm;
  const rm = draft.right_margin_mm;
  const tm = draft.top_margin_mm;
  const bm = draft.bottom_margin_mm;
  const mpW = draft.mounting_plate_width_mm ?? (W - lm - rm);
  const mpH = draft.mounting_plate_height_mm ?? (H - tm - bm);
  const ox = draft.origin_x_mm ?? 0;
  const oy = draft.origin_y_mm ?? 0;

  const SVG_W = 290;
  const SVG_H = 260;
  const LABEL_H = 18;
  const DIM_L = 36;
  const DIM_B = 22;
  const PAD_R = 8;
  const PAD_T = 6;

  const availW = SVG_W - DIM_L - PAD_R;
  const availH = SVG_H - LABEL_H - PAD_T - DIM_B;
  const sc = Math.min(availW / W, availH / H, 0.3);

  const pW = W * sc;
  const pH = H * sc;
  const pX = DIM_L + (availW - pW) / 2;
  const pY = LABEL_H + PAD_T + (availH - pH) / 2;

  // Origin SVG koordinatı (Y ekseni SVG'de ters)
  const oSvgX = pX + ox * sc;
  const oSvgY = pY + pH - oy * sc;
  const oInPanel = ox >= 0 && ox <= W && oy >= 0 && oy <= H;

  const mpSvgW = Math.max(0, Math.min(mpW, W - lm - rm)) * sc;
  const mpSvgH = Math.max(0, Math.min(mpH, H - tm - bm)) * sc;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 6, background: "#1a1f2b", display: "block" }}>
      {/* Başlık */}
      <text x={SVG_W / 2} y={13} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="system-ui" letterSpacing="0.8">
        ÖN GÖRÜNÜŞ
      </text>

      {/* Panel dış çerçeve */}
      <rect x={pX} y={pY} width={pW} height={pH} fill="#1e2333" stroke="#4a5568" strokeWidth={1.5} />

      {/* Kenar boşluğu gölgeleme */}
      <rect x={pX} y={pY} width={lm * sc} height={pH} fill="rgba(100,116,139,0.18)" />
      <rect x={pX + pW - rm * sc} y={pY} width={rm * sc} height={pH} fill="rgba(100,116,139,0.18)" />
      <rect x={pX + lm * sc} y={pY} width={pW - (lm + rm) * sc} height={tm * sc} fill="rgba(100,116,139,0.18)" />
      <rect x={pX + lm * sc} y={pY + pH - bm * sc} width={pW - (lm + rm) * sc} height={bm * sc} fill="rgba(100,116,139,0.18)" />

      {/* Montaj plakası */}
      {mpSvgW > 2 && mpSvgH > 2 && (
        <rect x={pX + lm * sc} y={pY + tm * sc} width={mpSvgW} height={mpSvgH}
          fill="rgba(77,171,247,0.07)" stroke="#4dabf7" strokeWidth={0.8} strokeDasharray="4 2" />
      )}

      {/* Orijin işareti */}
      {oInPanel && (
        <g>
          <circle cx={oSvgX} cy={oSvgY} r={3.5} fill="none" stroke="#f59e0b" strokeWidth={1.2} />
          <line x1={oSvgX - 9} y1={oSvgY} x2={oSvgX + 9} y2={oSvgY} stroke="#f59e0b" strokeWidth={0.9} />
          <line x1={oSvgX} y1={oSvgY - 9} x2={oSvgX} y2={oSvgY + 9} stroke="#f59e0b" strokeWidth={0.9} />
          {/* X ok */}
          <line x1={oSvgX} y1={oSvgY} x2={oSvgX + 18} y2={oSvgY} stroke="#e74c3c" strokeWidth={1} />
          <polyline points={`${oSvgX + 14},${oSvgY - 3} ${oSvgX + 18},${oSvgY} ${oSvgX + 14},${oSvgY + 3}`}
            stroke="#e74c3c" strokeWidth={1} fill="none" />
          <text x={oSvgX + 21} y={oSvgY + 4} fontSize={8} fill="#e74c3c" fontFamily="monospace">X</text>
          {/* Y ok */}
          <line x1={oSvgX} y1={oSvgY} x2={oSvgX} y2={oSvgY - 18} stroke="#27ae60" strokeWidth={1} />
          <polyline points={`${oSvgX - 3},${oSvgY - 14} ${oSvgX},${oSvgY - 18} ${oSvgX + 3},${oSvgY - 14}`}
            stroke="#27ae60" strokeWidth={1} fill="none" />
          <text x={oSvgX + 3} y={oSvgY - 21} fontSize={8} fill="#27ae60" fontFamily="monospace">Y</text>
          {/* Etiket */}
          <rect x={oSvgX + 6} y={oSvgY + 3} width={36} height={11} fill="rgba(0,0,0,0.65)" rx={2} />
          <text x={oSvgX + 24} y={oSvgY + 12} textAnchor="middle" fontSize={7.5} fill="#f59e0b" fontFamily="monospace">
            (0,0,0)
          </text>
        </g>
      )}

      {/* Boyut: Genişlik */}
      <DimH x1={pX} x2={pX + pW} y={pY + pH + 14} label={`${W} mm`} />
      {/* Boyut: Yükseklik */}
      <DimV x={pX - 18} y1={pY} y2={pY + pH} label={`${H} mm`} />
    </svg>
  );
}

// ─── Yan Görünüş SVG ──────────────────────────────────────────────────────────
function SideView({ draft }: { draft: DraftDef }) {
  const D = Math.max(draft.depth_mm ?? 600, 1);
  const H = Math.max(draft.height_mm, 1);
  const oz = draft.origin_z_mm ?? 0;
  const oy = draft.origin_y_mm ?? 0;

  const SVG_W = 290;
  const SVG_H = 260;
  const LABEL_H = 18;
  const DIM_L = 36;
  const DIM_B = 22;
  const PAD_R = 8;
  const PAD_T = 6;

  const availW = SVG_W - DIM_L - PAD_R;
  const availH = SVG_H - LABEL_H - PAD_T - DIM_B;
  const sc = Math.min(availW / D, availH / H, 0.4);

  const pW = D * sc;
  const pH = H * sc;
  const pX = DIM_L + (availW - pW) / 2;
  const pY = LABEL_H + PAD_T + (availH - pH) / 2;

  // Ön yüz, arka yüz
  const frontX = pX;
  const backX = pX + pW;

  // Orijin (Z=0 = ön yüz, Y=0 = alt)
  const oSvgX = pX + oz * sc;
  const oSvgY = pY + pH - oy * sc;
  const oInPanel = oz >= 0 && oz <= D && oy >= 0 && oy <= H;

  return (
    <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ width: "100%", border: "1px solid var(--line)", borderRadius: 6, background: "#1a1f2b", display: "block" }}>
      {/* Başlık */}
      <text x={SVG_W / 2} y={13} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="system-ui" letterSpacing="0.8">
        YAN GÖRÜNÜŞ (SOL)
      </text>

      {/* Panel gövdesi */}
      <rect x={pX} y={pY} width={pW} height={pH} fill="#1e2333" stroke="#4a5568" strokeWidth={1.5} />

      {/* Ön ve arka yüz etiketleri */}
      <text x={frontX + 3} y={pY + 10} fontSize={7} fill="#4dabf7" fontFamily="system-ui" opacity={0.7}>Ön</text>
      <text x={backX - 3} y={pY + 10} fontSize={7} fill="#94a3b8" fontFamily="system-ui" textAnchor="end" opacity={0.7}>Arka</text>

      {/* Ön yüz vurgu çizgisi */}
      <line x1={frontX} y1={pY} x2={frontX} y2={pY + pH} stroke="#4dabf7" strokeWidth={1.5} />

      {/* Orijin işareti */}
      {oInPanel && (
        <g>
          <circle cx={oSvgX} cy={oSvgY} r={3.5} fill="none" stroke="#f59e0b" strokeWidth={1.2} />
          <line x1={oSvgX - 9} y1={oSvgY} x2={oSvgX + 9} y2={oSvgY} stroke="#f59e0b" strokeWidth={0.9} />
          <line x1={oSvgX} y1={oSvgY - 9} x2={oSvgX} y2={oSvgY + 9} stroke="#f59e0b" strokeWidth={0.9} />
          {/* Z ok (sola = ön yüze doğru) */}
          <line x1={oSvgX} y1={oSvgY} x2={oSvgX - 18} y2={oSvgY} stroke="#8b5cf6" strokeWidth={1} />
          <polyline points={`${oSvgX - 14},${oSvgY - 3} ${oSvgX - 18},${oSvgY} ${oSvgX - 14},${oSvgY + 3}`}
            stroke="#8b5cf6" strokeWidth={1} fill="none" />
          <text x={oSvgX - 22} y={oSvgY + 4} fontSize={8} fill="#8b5cf6" fontFamily="monospace" textAnchor="end">Z</text>
          {/* Y ok */}
          <line x1={oSvgX} y1={oSvgY} x2={oSvgX} y2={oSvgY - 18} stroke="#27ae60" strokeWidth={1} />
          <polyline points={`${oSvgX - 3},${oSvgY - 14} ${oSvgX},${oSvgY - 18} ${oSvgX + 3},${oSvgY - 14}`}
            stroke="#27ae60" strokeWidth={1} fill="none" />
          <text x={oSvgX + 3} y={oSvgY - 21} fontSize={8} fill="#27ae60" fontFamily="monospace">Y</text>
        </g>
      )}

      {/* Boyut: Derinlik */}
      <DimH x1={pX} x2={pX + pW} y={pY + pH + 14} label={`${D} mm`} />
      {/* Boyut: Yükseklik */}
      <DimV x={pX - 18} y1={pY} y2={pY + pH} label={`${H} mm`} />
    </svg>
  );
}

// ─── Sayfa ────────────────────────────────────────────────────────────────────
export function PanelFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [draft, setDraft] = useState<DraftDef>(EMPTY);
  const [saveError, setSaveError] = useState<string | null>(null);

  const definitionsQuery = useQuery({
    queryKey: ["panel-definitions"],
    queryFn: client.listPanelDefinitions,
    enabled: isEdit,
  });

  const panelTypesQuery = useQuery({
    queryKey: ["panel-types"],
    queryFn: client.listPanelTypes,
  });

  useEffect(() => {
    if (isEdit && definitionsQuery.data) {
      const def = definitionsQuery.data.find((d) => d.id === Number(id));
      if (def) setDraft(draftFromDef(def));
    }
  }, [isEdit, definitionsQuery.data, id]);

  function set<K extends keyof DraftDef>(key: K, value: DraftDef[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ["panel-definitions"] });

  const createMutation = useMutation({
    mutationFn: () => client.createPanelDefinition(draft),
    onSuccess: async () => { await invalidate(); navigate("/definitions/panels"); },
    onError: () => setSaveError("Kaydetme başarısız oldu."),
  });

  const updateMutation = useMutation({
    mutationFn: () => client.updatePanelDefinition(Number(id), draft),
    onSuccess: async () => { await invalidate(); navigate("/definitions/panels"); },
    onError: () => setSaveError("Güncelleme başarısız oldu."),
  });

  const panelTypes = panelTypesQuery.data ?? [];
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
          <span className="eyebrow">Kabin Tanımlama</span>
          <h1>{isEdit ? "Kabini Düzenle" : "Yeni Kabin"}</h1>
          <p>Kabin geometrisini ve orijin noktasını tanımlayın. Sağdaki önizleme değişiklikleri anlık yansıtır.</p>
        </div>
        <button type="button" className="ghost" onClick={() => navigate("/definitions/panels")}>
          ← Listeye Dön
        </button>
      </section>

      {saveError && <div className="alert alert-warning">{saveError}</div>}

      {/* ── 2 sütun ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: "1.5rem", alignItems: "start" }}>

        {/* SOL: Form */}
        <form onSubmit={handleSubmit}>

          {/* A — Genel */}
          <section className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              A — Genel Bilgiler
            </h3>
            <div className="form-grid">
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Kabin Adı</span>
                <input className="input" required value={draft.name}
                  onChange={(e) => set("name", e.target.value)} placeholder="ör. Ana Dağıtım Panosu" />
              </label>
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Açıklama</span>
                <input className="input" value={draft.description ?? ""}
                  onChange={(e) => set("description", e.target.value)} />
              </label>
              <label className="field">
                <span>Pano Tipi</span>
                <select className="input" value={draft.panel_type_id ?? ""}
                  onChange={(e) => set("panel_type_id", e.target.value ? Number(e.target.value) : null)}>
                  <option value="">— Seçiniz —</option>
                  {panelTypes.map((pt) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                </select>
              </label>
            </div>
          </section>

          {/* B — Dış Ölçüler */}
          <section className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              B — Dış Ölçüler
            </h3>
            <div className="form-grid">
              <NumField label="Genişlik" value={draft.width_mm} onChange={(v) => set("width_mm", v)} min={1} />
              <NumField label="Yükseklik" value={draft.height_mm} onChange={(v) => set("height_mm", v)} min={1} />
              <NumField label="Derinlik" value={draft.depth_mm ?? 0} onChange={(v) => set("depth_mm", v)} min={1} />
            </div>
          </section>

          {/* C — Montaj Plakası & Boşluklar */}
          <section className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: "0 0 0.9rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              C — Montaj Plakası & Kenar Boşlukları
            </h3>
            <div className="form-grid">
              <NumField label="Plaka Genişliği" value={draft.mounting_plate_width_mm ?? 0}
                onChange={(v) => set("mounting_plate_width_mm", v)} />
              <NumField label="Plaka Yüksekliği" value={draft.mounting_plate_height_mm ?? 0}
                onChange={(v) => set("mounting_plate_height_mm", v)} />
              <NumField label="Sol Boşluk" value={draft.left_margin_mm} onChange={(v) => set("left_margin_mm", v)} min={0} />
              <NumField label="Sağ Boşluk" value={draft.right_margin_mm} onChange={(v) => set("right_margin_mm", v)} min={0} />
              <NumField label="Üst Boşluk" value={draft.top_margin_mm} onChange={(v) => set("top_margin_mm", v)} min={0} />
              <NumField label="Alt Boşluk" value={draft.bottom_margin_mm} onChange={(v) => set("bottom_margin_mm", v)} min={0} />
            </div>
          </section>

          {/* D — Koordinat Orijini */}
          <section className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              D — Koordinat Orijini
            </h3>
            <p style={{ margin: "0 0 0.8rem", fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.5 }}>
              (0, 0, 0) noktasının kabin içindeki konumu. Varsayılan: alt-sol-ön köşe.
              Sağdaki çizimlerde sarı işaret orijini gösterir.
            </p>
            <div className="form-grid">
              <NumField label="X — Soldan" value={draft.origin_x_mm ?? 0} onChange={(v) => set("origin_x_mm", v)} unit="mm" />
              <NumField label="Y — Alttan" value={draft.origin_y_mm ?? 0} onChange={(v) => set("origin_y_mm", v)} unit="mm" />
              <NumField label="Z — Önden" value={draft.origin_z_mm ?? 0} onChange={(v) => set("origin_z_mm", v)} unit="mm" />
            </div>
          </section>

          {/* Kaydet */}
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Kaydet"}
            </button>
            <button type="button" className="ghost" onClick={() => navigate("/definitions/panels")}>
              İptal
            </button>
          </div>
        </form>

        {/* SAĞ: Önizleme */}
        <div style={{ position: "sticky", top: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Ön Görünüş */}
          <section className="card">
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: "0.6rem" }}>
              Ön Görünüş
            </div>
            <FrontView draft={draft} />
            {/* Açıklama */}
            <div style={{ marginTop: "0.5rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem" }}>
              {[
                ["G × Y", `${draft.width_mm} × ${draft.height_mm} mm`],
                ["Montaj Pl.", `${draft.mounting_plate_width_mm ?? "—"} × ${draft.mounting_plate_height_mm ?? "—"} mm`],
              ].map(([l, v]) => (
                <div key={l} style={{ background: "var(--surface-alt,rgba(0,0,0,0.03))", borderRadius: 5, padding: "0.3rem 0.55rem", border: "1px solid var(--line)" }}>
                  <div style={{ fontSize: "0.67rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{l}</div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, fontFamily: "monospace" }}>{v}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Yan Görünüş */}
          <section className="card">
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: "0.6rem" }}>
              Yan Görünüş (Sol)
            </div>
            <SideView draft={draft} />
            {/* Orijin bilgisi */}
            <div style={{ marginTop: "0.5rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.35rem" }}>
              {[
                ["X", `${draft.origin_x_mm ?? 0} mm`],
                ["Y", `${draft.origin_y_mm ?? 0} mm`],
                ["Z", `${draft.origin_z_mm ?? 0} mm`],
              ].map(([l, v]) => (
                <div key={l} style={{ background: "var(--surface-alt,rgba(0,0,0,0.03))", borderRadius: 5, padding: "0.3rem 0.55rem", border: "1px solid var(--line)", textAlign: "center" }}>
                  <div style={{ fontSize: "0.67rem", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>{l}</div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, fontFamily: "monospace" }}>{v}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Derinlik bilgisi */}
          <section className="card">
            <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)", marginBottom: "0.35rem" }}>
              Kabin Derinliği
            </div>
            <span style={{ fontFamily: "monospace", fontSize: "1.1rem", fontWeight: 700 }}>
              {draft.depth_mm ?? 0} mm
            </span>
          </section>
        </div>
      </div>
    </div>
  );
}
