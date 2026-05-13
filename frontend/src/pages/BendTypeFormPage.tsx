/**
 * BendTypeFormPage — Büküm tipi oluşturma / düzenleme sayfası
 *
 * 2-panel layout:
 *   Sol  → Bölüm A (genel bilgiler) + B (parametreler) + C (segmentler)
 *   Sağ  → BendPreview canlı SVG önizlemesi
 *
 * Parametreler değiştikçe preview anında güncellenir (controlled state).
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../api/client";
import { BendPreview } from "../components/BendPreview";
import type { BendParameter, BendSegment, BendType } from "../types";

// ── Sabitler ──────────────────────────────────────────────────────────────────

const TEMPLATE_TYPES = ["Z", "ZL", "Tip-1", "Tip-2", "Özel"];
const START_DIRS = [
  { value: "up",    label: "↑ Yukarı (dikey terminal)" },
  { value: "right", label: "→ Sağa (yatay ayak)" },
];

// ── Draft tipimiz ──────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  template_type: string;
  thickness_mm: number;
  parallel_count: number;
  start_direction: "up" | "right";
}

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  template_type: "Özel",
  thickness_mm: 5,
  parallel_count: 1,
  start_direction: "up",
};

function emptyParam(order_no: number): BendParameter {
  return {
    order_no,
    name: `P${order_no}`,
    label: "Parametre",
    default_value: 100,
    formula: null,
    is_calculated: false,
  };
}

function emptySegment(order_no: number): BendSegment {
  return {
    order_no,
    label: `Segment ${order_no}`,
    length_expr: "100",
    angle_from_prev: 0,
  };
}

function defToForm(def: BendType): FormState {
  return {
    name: def.name,
    description: def.description ?? "",
    template_type: def.template_type,
    thickness_mm: Number(def.thickness_mm),
    parallel_count: def.parallel_count,
    start_direction: (def.start_direction as "up" | "right") ?? "up",
  };
}

// ── Küçük tablo hücre bileşenleri ─────────────────────────────────────────────

const cellStyle: React.CSSProperties = {
  padding: "0.28rem 0.35rem",
  fontSize: "0.8rem",
  border: "1px solid var(--line)",
  borderRadius: 5,
  background: "var(--bg-input)",
  color: "var(--text)",
  width: "100%",
  minWidth: 60,
};

function TH({ children, w }: { children: React.ReactNode; w?: string | number }) {
  return (
    <th style={{ padding: "0.3rem 0.4rem", fontSize: "0.72rem", fontWeight: 700,
      color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em",
      whiteSpace: "nowrap", width: w }}>
      {children}
    </th>
  );
}
function TD({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "0.25rem 0.3rem", verticalAlign: "middle" }}>{children}</td>;
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────

export function BendTypeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Düzenleme modunda mevcut tipi yükle
  const detailQuery = useQuery({
    queryKey: ["bend-type", id],
    queryFn: () => client.getBendType(Number(id)),
    enabled: isEdit,
  });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [params, setParams] = useState<BendParameter[]>([]);
  const [segments, setSegments] = useState<BendSegment[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Parametre anlık değerleri (preview için)
  // Kullanıcı değerleri değiştirince burada tutulur; is_calculated olanlar formül ile hesaplanır
  const [liveValues, setLiveValues] = useState<Record<string, number>>({});

  // Düzenleme modunda formu doldur
  useEffect(() => {
    const def = detailQuery.data;
    if (!def) return;
    setForm(defToForm(def));
    const sortedParams = [...def.parameters].sort((a, b) => a.order_no - b.order_no);
    const sortedSegs   = [...def.segments].sort((a, b) => a.order_no - b.order_no);
    setParams(sortedParams);
    setSegments(sortedSegs);
    // Live values başlat
    const vals: Record<string, number> = {};
    for (const p of sortedParams) {
      if (!p.is_calculated) vals[p.name] = Number(p.default_value);
    }
    setLiveValues(vals);
  }, [detailQuery.data]);

  // Form state helper
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // ── Parametre CRUD ───────────────────────────────────────────────────────────

  function addParam() {
    const next: BendParameter = emptyParam(params.length + 1);
    setParams((ps) => [...ps, next]);
    setLiveValues((v) => ({ ...v, [next.name]: Number(next.default_value) }));
  }

  function removeParam(idx: number) {
    setParams((ps) => {
      const removed = ps[idx];
      const updated = ps.filter((_, i) => i !== idx).map((p, i) => ({ ...p, order_no: i + 1 }));
      setLiveValues((v) => { const nv = { ...v }; delete nv[removed.name]; return nv; });
      return updated;
    });
  }

  function updateParam(idx: number, key: keyof BendParameter, value: unknown) {
    setParams((ps) => {
      const updated = ps.map((p, i) => (i === idx ? { ...p, [key]: value } : p));
      // Eğer name değiştiyse live values'u da güncelle
      if (key === "name") {
        setLiveValues((v) => {
          const oldName = ps[idx].name;
          const nv = { ...v };
          const oldVal = nv[oldName] ?? Number(ps[idx].default_value);
          delete nv[oldName];
          nv[value as string] = oldVal;
          return nv;
        });
      }
      return updated;
    });
  }

  function updateLiveValue(paramName: string, value: number) {
    setLiveValues((v) => ({ ...v, [paramName]: value }));
  }

  // ── Segment CRUD ─────────────────────────────────────────────────────────────

  function addSegment() {
    setSegments((ss) => [...ss, emptySegment(ss.length + 1)]);
  }

  function removeSegment(idx: number) {
    setSegments((ss) => ss.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order_no: i + 1 })));
  }

  function updateSegment(idx: number, key: keyof BendSegment, value: unknown) {
    setSegments((ss) => ss.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  }

  function moveSegment(idx: number, dir: "up" | "down") {
    setSegments((ss) => {
      const arr = [...ss];
      const target = dir === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= arr.length) return arr;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr.map((s, i) => ({ ...s, order_no: i + 1 }));
    });
  }

  // ── Mutations ─────────────────────────────────────────────────────────────────

  function buildPayload(): Omit<BendType, "id" | "created_at" | "updated_at" | "bend_count"> {
    return {
      name: form.name,
      description: form.description || null,
      template_type: form.template_type,
      thickness_mm: form.thickness_mm,
      parallel_count: form.parallel_count,
      start_direction: form.start_direction,
      parameters: params.map(({ id: _id, ...p }) => ({
        ...p,
        default_value: liveValues[p.name] ?? Number(p.default_value),
      })),
      segments: segments.map(({ id: _id, ...s }) => s),
    };
  }

  const createMut = useMutation({
    mutationFn: () => client.createBendType(buildPayload()),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["bend-types"] });
      navigate("/definitions/bend-types");
    },
    onError: () => setSaveError("Kaydetme başarısız. Lütfen tekrar deneyin."),
  });

  const updateMut = useMutation({
    mutationFn: () => client.updateBendType(Number(id), buildPayload()),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["bend-types"] });
      await qc.invalidateQueries({ queryKey: ["bend-type", id] });
      navigate("/definitions/bend-types");
    },
    onError: () => setSaveError("Güncelleme başarısız. Lütfen tekrar deneyin."),
  });

  const isPending = createMut.isPending || updateMut.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    if (isEdit) updateMut.mutate();
    else createMut.mutate();
  }

  if (isEdit && detailQuery.isLoading) {
    return <div className="loading-state">Büküm tipi yükleniyor…</div>;
  }

  const pageTitle = isEdit
    ? `Düzenle — ${form.name || "…"}`
    : "Yeni Büküm Tipi";

  // Preview için live values + default_value fallback
  const previewValues: Record<string, number> = {};
  for (const p of params) {
    if (!p.is_calculated) {
      previewValues[p.name] = liveValues[p.name] ?? Number(p.default_value);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      {/* ── Başlık ─────────────────────────────────────────────────────────── */}
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanımlamalar › Büküm Tipleri</span>
          <h1 style={{ margin: "0.25rem 0 0", fontSize: "1.4rem" }}>{pageTitle}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button type="button" className="ghost" onClick={() => navigate("/definitions/bend-types")}>
            ← Geri
          </button>
          <button type="submit" disabled={isPending}>
            {isPending ? "Kaydediliyor…" : isEdit ? "Değişiklikleri Kaydet" : "Büküm Tipini Ekle"}
          </button>
        </div>
      </section>

      {saveError && <div className="alert alert-warning">{saveError}</div>}

      {/* ── 2-panel gövde ──────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", alignItems: "start" }}>

        {/* ── SOL PANEL ──────────────────────────────────────────────────────── */}
        <div className="stack">

          {/* Bölüm A — Genel Bilgiler */}
          <section className="card">
            <h3 style={sectionTitle}>Bölüm A — Genel Bilgiler</h3>
            <div className="form-grid">
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Büküm Tipi Adı</span>
                <input
                  className="input"
                  required
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Z Büküm 5mm, Özel Tip-A…"
                />
              </label>

              <label className="field">
                <span>Şablon</span>
                <select className="input" value={form.template_type}
                  onChange={(e) => setField("template_type", e.target.value)}>
                  {TEMPLATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              <label className="field">
                <span>Başlangıç Yönü</span>
                <select className="input" value={form.start_direction}
                  onChange={(e) => setField("start_direction", e.target.value as "up" | "right")}>
                  {START_DIRS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </label>

              <label className="field">
                <span>Bakır Kalınlığı (mm)</span>
                <input className="input" type="number" min={1} step={0.5}
                  value={form.thickness_mm}
                  onChange={(e) => setField("thickness_mm", Number(e.target.value))} />
              </label>

              <label className="field">
                <span>Paralel Bakır Adedi</span>
                <select className="input" value={form.parallel_count}
                  onChange={(e) => setField("parallel_count", Number(e.target.value))}>
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}'li</option>)}
                </select>
              </label>

              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Açıklama (opsiyonel)</span>
                <input className="input" value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Kısa açıklama…" />
              </label>
            </div>
          </section>

          {/* Bölüm B — Parametreler */}
          <section className="card">
            <div className="section-header">
              <h3 style={sectionTitle}>Bölüm B — Parametreler</h3>
              <button type="button" className="ghost" onClick={addParam}>
                + Parametre Ekle
              </button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "0 0 0.7rem" }}>
              A1, A2, B, C, D gibi ölçü parametrelerini tanımlayın.
              "Hesaplanan" seçilirse kullanıcı giremez, formül otomatik hesaplar.
            </p>

            {params.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.83rem", fontStyle: "italic" }}>
                Henüz parametre yok — "Parametre Ekle" butonuna tıklayın.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: "0.8rem", width: "100%" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line)" }}>
                      <TH w={36}>Sıra</TH>
                      <TH w={52}>Ad</TH>
                      <TH>Etiket</TH>
                      <TH w={80}>Değer (mm)</TH>
                      <TH w={100}>Formül</TH>
                      <TH w={60}>Hesaplanan</TH>
                      <TH w={28}></TH>
                    </tr>
                  </thead>
                  <tbody>
                    {params.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
                        <TD><span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{p.order_no}</span></TD>
                        <TD>
                          <input style={{ ...cellStyle, minWidth: 44, fontWeight: 700 }}
                            value={p.name}
                            onChange={(e) => updateParam(idx, "name", e.target.value)}
                            placeholder="A1" />
                        </TD>
                        <TD>
                          <input style={cellStyle} value={p.label}
                            onChange={(e) => updateParam(idx, "label", e.target.value)}
                            placeholder="Alt Ayak" />
                        </TD>
                        <TD>
                          {p.is_calculated ? (
                            <span style={{
                              display: "block", padding: "0.28rem 0.35rem",
                              color: "#b03030", fontSize: "0.78rem", fontStyle: "italic",
                            }}>
                              {/* formül sonucunu göster */}
                              {p.formula
                                ? (() => {
                                    try {
                                      let s = p.formula;
                                      const sorted = Object.keys(previewValues).sort((a, b) => b.length - a.length);
                                      for (const k of sorted) s = s.replaceAll(k, String(previewValues[k]));
                                      if (/[^0-9+\-*/().\s]/.test(s)) return "?";
                                      // eslint-disable-next-line no-new-func
                                      return Number(Function(`"use strict"; return (${s})`)()).toFixed(1);
                                    } catch { return "?"; }
                                  })()
                                : "—"} mm
                            </span>
                          ) : (
                            <input
                              style={cellStyle}
                              type="number"
                              step="any"
                              value={liveValues[p.name] ?? Number(p.default_value)}
                              onChange={(e) => updateLiveValue(p.name, Number(e.target.value))}
                            />
                          )}
                        </TD>
                        <TD>
                          <input style={cellStyle} value={p.formula ?? ""}
                            placeholder={p.is_calculated ? "A1+A2" : "—"}
                            onChange={(e) => updateParam(idx, "formula", e.target.value || null)}
                            disabled={!p.is_calculated} />
                        </TD>
                        <TD>
                          <label style={{ display: "flex", justifyContent: "center" }}>
                            <input type="checkbox" checked={p.is_calculated}
                              onChange={(e) => updateParam(idx, "is_calculated", e.target.checked)} />
                          </label>
                        </TD>
                        <TD>
                          <button type="button" className="ghost danger"
                            style={{ padding: "0.15rem 0.4rem", fontSize: "0.75rem" }}
                            onClick={() => removeParam(idx)}>✕</button>
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Bölüm C — Segmentler */}
          <section className="card">
            <div className="section-header">
              <h3 style={sectionTitle}>Bölüm C — Büküm Segmentleri</h3>
              <button type="button" className="ghost" onClick={addSegment}>
                + Segment Ekle
              </button>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "0 0 0.7rem" }}>
              Her segment bir bakır kolunu temsil eder.
              <strong> Uzunluk İfadesi</strong>: parametre adı veya formül (örn. <code>A1</code>, <code>A1+25</code>).
              <strong> Dönüş Açısı</strong>: önceki segmente göre; 0=düz, +90=sola, −90=sağa.
            </p>

            {segments.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.83rem", fontStyle: "italic" }}>
                Henüz segment yok — "Segment Ekle" butonuna tıklayın.
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", fontSize: "0.8rem", width: "100%" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--line)" }}>
                      <TH w={36}>Sıra</TH>
                      <TH>Etiket</TH>
                      <TH w={100}>Uzunluk İfadesi</TH>
                      <TH w={90}>Dönüş Açısı (°)</TH>
                      <TH w={56}>Sırala</TH>
                      <TH w={28}></TH>
                    </tr>
                  </thead>
                  <tbody>
                    {segments.map((s, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
                        <TD>
                          <span style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 22, height: 22, borderRadius: "50%",
                            background: "var(--accent-soft)", fontSize: "0.72rem", fontWeight: 700,
                          }}>
                            {s.order_no}
                          </span>
                        </TD>
                        <TD>
                          <input style={cellStyle} value={s.label}
                            onChange={(e) => updateSegment(idx, "label", e.target.value)}
                            placeholder="A1 Kolu" />
                        </TD>
                        <TD>
                          <input style={{ ...cellStyle, fontFamily: "monospace", fontWeight: 600 }}
                            value={s.length_expr}
                            onChange={(e) => updateSegment(idx, "length_expr", e.target.value)}
                            placeholder="A1" />
                        </TD>
                        <TD>
                          <select style={cellStyle}
                            value={Number(s.angle_from_prev)}
                            onChange={(e) => updateSegment(idx, "angle_from_prev", Number(e.target.value))}>
                            <option value={0}>0° — Düz devam</option>
                            <option value={90}>+90° — Sola dön</option>
                            <option value={-90}>−90° — Sağa dön</option>
                            <option value={45}>+45°</option>
                            <option value={-45}>−45°</option>
                            <option value={135}>+135°</option>
                            <option value={-135}>−135°</option>
                            <option value={180}>180° — Geri dön</option>
                          </select>
                        </TD>
                        <TD>
                          <div style={{ display: "flex", gap: 2 }}>
                            <button type="button" className="ghost"
                              style={{ padding: "0.12rem 0.35rem", fontSize: "0.75rem" }}
                              disabled={idx === 0}
                              onClick={() => moveSegment(idx, "up")}>↑</button>
                            <button type="button" className="ghost"
                              style={{ padding: "0.12rem 0.35rem", fontSize: "0.75rem" }}
                              disabled={idx === segments.length - 1}
                              onClick={() => moveSegment(idx, "down")}>↓</button>
                          </div>
                        </TD>
                        <TD>
                          <button type="button" className="ghost danger"
                            style={{ padding: "0.15rem 0.4rem", fontSize: "0.75rem" }}
                            onClick={() => removeSegment(idx)}>✕</button>
                        </TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Alt kaydet */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
            <button type="button" className="ghost" onClick={() => navigate("/definitions/bend-types")}>
              ← Geri
            </button>
            <button type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor…" : isEdit ? "Değişiklikleri Kaydet" : "Büküm Tipini Ekle"}
            </button>
          </div>
        </div>

        {/* ── SAĞ PANEL — Canlı Preview ──────────────────────────────────────── */}
        <div style={{ position: "sticky", top: "1rem" }}>
          <div className="card" style={{ padding: "0.75rem" }}>
            <h3 style={{ ...sectionTitle, marginBottom: "0.75rem" }}>
              Bölüm D — Canlı Önizleme
            </h3>

            <BendPreview
              segments={segments}
              parameters={params}
              paramValues={previewValues}
              thickness_mm={form.thickness_mm}
              parallel_count={form.parallel_count}
              start_direction={form.start_direction}
              height={460}
            />

            {/* Parametre özet kartları */}
            {params.length > 0 && (
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.4rem",
                marginTop: "0.75rem",
              }}>
                {params.map((p) => {
                  const val = p.is_calculated
                    ? (() => {
                        try {
                          let s = p.formula ?? "0";
                          const sorted = Object.keys(previewValues).sort((a, b) => b.length - a.length);
                          for (const k of sorted) s = s.replaceAll(k, String(previewValues[k]));
                          if (/[^0-9+\-*/().\s]/.test(s)) return "?";
                          // eslint-disable-next-line no-new-func
                          return Number(Function(`"use strict"; return (${s})`)()).toFixed(0);
                        } catch { return "?"; }
                      })()
                    : (previewValues[p.name] ?? Number(p.default_value)).toFixed(0);

                  return (
                    <div key={p.name} style={{
                      padding: "3px 8px",
                      borderRadius: 6,
                      fontSize: "0.75rem",
                      fontFamily: "monospace",
                      background: p.is_calculated
                        ? "rgba(176,48,48,0.1)"
                        : "rgba(96,165,250,0.12)",
                      border: `1px solid ${p.is_calculated ? "rgba(176,48,48,0.3)" : "rgba(96,165,250,0.3)"}`,
                      color: p.is_calculated ? "#b03030" : "var(--text)",
                    }}>
                      <strong>{p.name}</strong> = {val} mm
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>{/* /grid */}
    </form>
  );
}

// ── Stil sabitleri ────────────────────────────────────────────────────────────
const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: "0.9rem",
  color: "var(--accent)",
  fontWeight: 700,
};
