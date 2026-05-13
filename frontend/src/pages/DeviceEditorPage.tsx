/**
 * DeviceEditorPage — Tam ekran cihaz tanımlama / düzenleme sayfası
 *
 * Üst: Şalter Bilgileri (marka, model, tip, kasa, referans nokta, kutup, akım, boyutlar)
 * Orta: Terminal tablosu — sadeleştirilmiş (terminal tipi dropdown'dan seçilir)
 * Alt: Canlı 4-görünüm teknik çizim
 */
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../api/client";
import { DeviceTechDrawing } from "../components/DeviceTechDrawing";
import type { Device, DeviceTerminal, TerminalDefinition } from "../types";

// ── Yardımcı: boş terminal satırı ────────────────────────────────────────────
function emptyTerminal(name: string, phase: string, x: number): DeviceTerminal {
  return {
    terminal_definition_id: null,
    terminal_name: name,
    phase,
    x_mm: x,
    y_mm: 20,
    z_mm: 0,
    terminal_face: null,
    terminal_role: null,
    terminal_group: null,
    // legacy alanlar boş
    hole_diameter_mm: null,
    terminal_type: null,
    terminal_width_mm: null,
    terminal_height_mm: null,
    terminal_depth_mm: null,
    bolt_type: null,
    bolt_count: null,
    bolt_center_distance_mm: null,
  };
}

// ── Cihaz form state ──────────────────────────────────────────────────────────
interface DeviceForm {
  brand: string;
  model: string;
  device_type: string;
  enclosure_type: string;
  reference_origin: string;
  poles: number;
  current_a: number;
  width_mm: number;
  height_mm: number;
  depth_mm: number;
}

const EMPTY_FORM: DeviceForm = {
  brand: "",
  model: "",
  device_type: "",
  enclosure_type: "",
  reference_origin: "Ön-Sol-Alt",
  poles: 3,
  current_a: 0,
  width_mm: 100,
  height_mm: 200,
  depth_mm: 100,
};

const ENCLOSURE_TYPES = ["Sabit", "Çekme", "Eklenti", "Modüler"];
const REFERENCE_ORIGINS = ["Ön-Sol-Alt", "Ön-Merkez-Alt", "Arka-Merkez-Alt", "Merkez Nokta"];
const PHASES = ["L1", "L2", "L3", "N", "PE"];
const FACES = [
  { value: "", label: "—" },
  { value: "front", label: "Ön" },
  { value: "back", label: "Arka" },
  { value: "left", label: "Sol" },
  { value: "right", label: "Sağ" },
  { value: "top", label: "Üst" },
  { value: "bottom", label: "Alt" },
];

// Terminal tipi kısa özet (tooltip için)
function termDefSummary(def: TerminalDefinition): string {
  const parts: string[] = [];
  if (def.bolt_type) parts.push(def.bolt_type);
  if (def.hole_diameter_mm) parts.push(`Ø${def.hole_diameter_mm}`);
  if (def.terminal_width_mm) parts.push(`${def.terminal_width_mm}×${def.terminal_height_mm ?? "?"}mm`);
  return parts.join(", ") || def.terminal_type;
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export function DeviceEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const cloneId = searchParams.get("clone");
  const isEdit = Boolean(id) && !cloneId;
  const loadId = id || cloneId || undefined;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const deviceQ = useQuery({
    queryKey: ["device", loadId],
    queryFn: () =>
      client.listDevices().then((list) => list.find((d) => d.id === Number(loadId)) ?? null),
    enabled: Boolean(loadId),
  });

  const terminalDefsQ = useQuery({
    queryKey: ["terminal-definitions"],
    queryFn: client.listTerminalDefinitions,
  });
  const terminalDefs = terminalDefsQ.data ?? [];

  const [form, setForm] = useState<DeviceForm>(EMPTY_FORM);
  const [terminals, setTerminals] = useState<DeviceTerminal[]>([
    emptyTerminal("L1", "L1", 30),
    emptyTerminal("L2", "L2", 90),
    emptyTerminal("L3", "L3", 150),
  ]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Düzenleme/kopyalama modunda mevcut veriyi yükle
  useEffect(() => {
    const device = deviceQ.data;
    if (!device) return;
    setForm({
      brand: device.brand + (cloneId ? " (Kopya)" : ""),
      model: device.model,
      device_type: device.device_type,
      enclosure_type: device.enclosure_type ?? "",
      reference_origin: device.reference_origin ?? "Ön-Sol-Alt",
      poles: device.poles,
      current_a: Number(device.current_a ?? 0),
      width_mm: Number(device.width_mm),
      height_mm: Number(device.height_mm),
      depth_mm: Number(device.depth_mm ?? 0),
    });
    setTerminals(
      device.terminals.map((t) => ({
        ...t,
        x_mm: Number(t.x_mm),
        y_mm: Number(t.y_mm),
        z_mm: Number(t.z_mm ?? 0),
        terminal_width_mm: t.terminal_width_mm != null ? Number(t.terminal_width_mm) : null,
        terminal_height_mm: t.terminal_height_mm != null ? Number(t.terminal_height_mm) : null,
        terminal_depth_mm: t.terminal_depth_mm != null ? Number(t.terminal_depth_mm) : null,
        bolt_center_distance_mm:
          t.bolt_center_distance_mm != null ? Number(t.bolt_center_distance_mm) : null,
        hole_diameter_mm: t.hole_diameter_mm != null ? Number(t.hole_diameter_mm) : null,
        bolt_count: t.bolt_count != null ? Number(t.bolt_count) : null,
      })),
    );
  }, [deviceQ.data, cloneId]);

  // Mutations
  const createMut = useMutation({
    mutationFn: (payload: Omit<Device, "id">) => client.createDevice(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["devices"] });
      navigate("/definitions/devices");
    },
    onError: () => setSaveError("Kaydetme başarısız. Lütfen tekrar deneyin."),
  });

  const updateMut = useMutation({
    mutationFn: (payload: Omit<Device, "id">) => client.updateDevice(Number(id), payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["devices"] });
      await qc.invalidateQueries({ queryKey: ["device", id] });
      navigate("/definitions/devices");
    },
    onError: () => setSaveError("Güncelleme başarısız. Lütfen tekrar deneyin."),
  });

  const isPending = createMut.isPending || updateMut.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);

    // terminal_definition_id seçiliyse o tanımdan fiziksel alanları otomatik doldur
    const enrichedTerminals = terminals.map((t) => {
      if (t.terminal_definition_id) {
        const def = terminalDefs.find((d) => d.id === t.terminal_definition_id);
        if (def) {
          return {
            ...t,
            terminal_type: def.terminal_type,
            terminal_face: t.terminal_face || def.surface,
            hole_diameter_mm: t.hole_diameter_mm ?? def.hole_diameter_mm ?? null,
            terminal_width_mm: def.terminal_width_mm ?? null,
            terminal_height_mm: def.terminal_height_mm ?? null,
            terminal_depth_mm: def.terminal_depth_mm ?? null,
            bolt_type: def.bolt_type ?? null,
            bolt_count: def.bolt_count ?? null,
            bolt_center_distance_mm: def.bolt_center_distance_mm ?? null,
          };
        }
      }
      return t;
    });

    const payload: Omit<Device, "id"> = {
      brand: form.brand,
      model: form.model,
      device_type: form.device_type,
      enclosure_type: form.enclosure_type || null,
      reference_origin: form.reference_origin || null,
      poles: form.poles,
      current_a: form.current_a || null,
      width_mm: form.width_mm,
      height_mm: form.height_mm,
      depth_mm: form.depth_mm || null,
      terminals: enrichedTerminals,
    };
    if (isEdit) {
      updateMut.mutate(payload);
    } else {
      createMut.mutate(payload);
    }
  }

  function updateField<K extends keyof DeviceForm>(key: K, value: DeviceForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateTerminal(idx: number, key: keyof DeviceTerminal, value: unknown) {
    setTerminals((ts) => ts.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));
  }

  function addTerminal() {
    setTerminals((ts) => [
      ...ts,
      emptyTerminal(`T${ts.length + 1}`, "L1", 30 + ts.length * 30),
    ]);
  }

  function removeTerminal(idx: number) {
    setTerminals((ts) => ts.filter((_, i) => i !== idx));
  }

  // Terminalleri çizim için zenginleştir (terminal_def'ten fiziksel boyutları çek)
  const terminalsForDrawing = terminals.map((t) => {
    if (t.terminal_definition_id) {
      const def = terminalDefs.find((d) => d.id === t.terminal_definition_id);
      if (def) {
        return {
          ...t,
          terminal_type: def.terminal_type,
          terminal_face: t.terminal_face || def.surface,
          hole_diameter_mm: t.hole_diameter_mm ?? def.hole_diameter_mm ?? null,
          terminal_width_mm: def.terminal_width_mm ?? null,
          terminal_height_mm: def.terminal_height_mm ?? null,
          terminal_depth_mm: def.terminal_depth_mm ?? null,
          bolt_type: def.bolt_type ?? null,
          bolt_count: def.bolt_count ?? null,
          bolt_center_distance_mm: def.bolt_center_distance_mm ?? null,
        };
      }
    }
    return t;
  });

  if (Boolean(loadId) && deviceQ.isLoading) {
    return <div className="loading-state">Cihaz yükleniyor…</div>;
  }

  const pageTitle = cloneId
    ? `Kopyala — ${form.brand}`
    : isEdit
    ? `Düzenle — ${form.brand} ${form.model}`
    : "Yeni Cihaz Tanımla";

  return (
    <form className="stack" onSubmit={handleSubmit}>
      {/* ── Başlık ──────────────────────────────────────────────────────────── */}
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Cihaz Tanımlama</span>
          <h1 style={{ margin: "0.25rem 0 0", fontSize: "1.4rem" }}>{pageTitle}</h1>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            className="ghost"
            onClick={() => navigate("/definitions/devices")}
          >
            ← Geri
          </button>
          <button type="submit" disabled={isPending}>
            {isPending ? "Kaydediliyor…" : isEdit ? "Değişiklikleri Kaydet" : "Cihaz Ekle"}
          </button>
        </div>
      </section>

      {saveError && <div className="alert alert-warning">{saveError}</div>}

      {/* ── Şalter Bilgileri ─────────────────────────────────────────────────── */}
      <section className="card">
        <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: "var(--accent)" }}>
          Şalter Bilgileri
        </h3>
        <div className="form-grid">
          <label>
            <span>Marka</span>
            <input
              required
              value={form.brand}
              onChange={(e) => updateField("brand", e.target.value)}
              placeholder="ABB, Schneider…"
            />
          </label>
          <label>
            <span>Model</span>
            <input
              required
              value={form.model}
              onChange={(e) => updateField("model", e.target.value)}
              placeholder="Emax, Compact…"
            />
          </label>
          <label>
            <span>Cihaz Tipi</span>
            <input
              required
              value={form.device_type}
              onChange={(e) => updateField("device_type", e.target.value)}
              placeholder="Ana Şalter, Kompak Şalter…"
            />
          </label>
          <label>
            <span>Kasa Tipi</span>
            <select
              value={form.enclosure_type}
              onChange={(e) => updateField("enclosure_type", e.target.value)}
            >
              <option value="">— Seçin —</option>
              {ENCLOSURE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Referans Nokta</span>
            <select
              value={form.reference_origin}
              onChange={(e) => updateField("reference_origin", e.target.value)}
            >
              {REFERENCE_ORIGINS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Kutup</span>
            <input
              type="number"
              min={1}
              max={5}
              value={form.poles}
              onChange={(e) => updateField("poles", Number(e.target.value))}
            />
          </label>
          <label>
            <span>Anma Akımı (A)</span>
            <input
              type="number"
              min={0}
              value={form.current_a}
              onChange={(e) => updateField("current_a", Number(e.target.value))}
            />
          </label>
          <label>
            <span>Genişlik X (mm)</span>
            <input
              type="number"
              min={1}
              required
              value={form.width_mm}
              onChange={(e) => updateField("width_mm", Number(e.target.value))}
            />
          </label>
          <label>
            <span>Yükseklik Y (mm)</span>
            <input
              type="number"
              min={1}
              required
              value={form.height_mm}
              onChange={(e) => updateField("height_mm", Number(e.target.value))}
            />
          </label>
          <label>
            <span>Derinlik Z (mm)</span>
            <input
              type="number"
              min={0}
              value={form.depth_mm}
              onChange={(e) => updateField("depth_mm", Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      {/* ── Terminal Tablosu ─────────────────────────────────────────────────── */}
      <section className="card">
        <div className="section-header">
          <h3 style={{ margin: 0, fontSize: "0.95rem", color: "var(--accent)" }}>
            Terminal Bilgileri
            <span style={{ marginLeft: "0.6rem", fontSize: "0.75rem", fontWeight: 400, color: "var(--muted)" }}>
              {terminals.length} terminal
            </span>
          </h3>
          <button type="button" className="ghost" onClick={addTerminal}>
            + Terminal Ekle
          </button>
        </div>

        <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
          <table style={{ minWidth: 860, borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr>
                <th colSpan={3} style={thGroupStyle("rgba(255,138,61,0.18)")}>Referans</th>
                <th colSpan={3} style={thGroupStyle("rgba(96,165,250,0.18)")}>Koordinat (mm)</th>
                <th colSpan={3} style={thGroupStyle("rgba(161,188,220,0.1)")}>Bağlantı</th>
                <th style={{ padding: "0.4rem 0.5rem" }}></th>
              </tr>
              <tr style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                <Th>Referans</Th>
                <Th>Faz</Th>
                <Th>Terminal Tipi</Th>
                <Th>X</Th>
                <Th>Y</Th>
                <Th>Z</Th>
                <Th>Yüzey</Th>
                <Th>Rol</Th>
                <Th>Grup</Th>
                <th style={{ padding: "0.4rem 0.5rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {terminals.map((t, idx) => {
                const selectedDef = t.terminal_definition_id
                  ? terminalDefs.find((d) => d.id === t.terminal_definition_id)
                  : null;
                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: "1px solid var(--line)",
                      background: idx % 2 === 0 ? "transparent" : "rgba(161,188,220,0.03)",
                    }}
                  >
                    {/* Referans adı */}
                    <Td>
                      <input
                        style={cellInput}
                        value={t.terminal_name}
                        onChange={(e) => updateTerminal(idx, "terminal_name", e.target.value)}
                        placeholder="L1.1"
                      />
                    </Td>
                    {/* Faz */}
                    <Td>
                      <select
                        style={cellInput}
                        value={t.phase}
                        onChange={(e) => updateTerminal(idx, "phase", e.target.value)}
                      >
                        {PHASES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </Td>
                    {/* Terminal Tipi dropdown */}
                    <Td>
                      <select
                        style={{ ...cellInput, minWidth: 160 }}
                        value={t.terminal_definition_id ?? ""}
                        onChange={(e) =>
                          updateTerminal(
                            idx,
                            "terminal_definition_id",
                            e.target.value === "" ? null : Number(e.target.value),
                          )
                        }
                        title={selectedDef ? termDefSummary(selectedDef) : ""}
                      >
                        <option value="">— Seçin —</option>
                        {terminalDefs.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </Td>
                    {/* Koordinatlar */}
                    <Td>
                      <NumInput value={t.x_mm} onChange={(v) => updateTerminal(idx, "x_mm", v)} />
                    </Td>
                    <Td>
                      <NumInput value={t.y_mm} onChange={(v) => updateTerminal(idx, "y_mm", v)} />
                    </Td>
                    <Td>
                      <NumInput value={t.z_mm ?? 0} onChange={(v) => updateTerminal(idx, "z_mm", v)} />
                    </Td>
                    {/* Yüzey */}
                    <Td>
                      <select
                        style={cellInput}
                        value={t.terminal_face ?? ""}
                        onChange={(e) => updateTerminal(idx, "terminal_face", e.target.value || null)}
                      >
                        {FACES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </Td>
                    {/* Rol */}
                    <Td>
                      <select
                        style={cellInput}
                        value={t.terminal_role ?? ""}
                        onChange={(e) => updateTerminal(idx, "terminal_role", e.target.value || null)}
                      >
                        <option value="">—</option>
                        <option value="input">Giriş</option>
                        <option value="output">Çıkış</option>
                      </select>
                    </Td>
                    {/* Grup */}
                    <Td>
                      <select
                        style={cellInput}
                        value={t.terminal_group ?? ""}
                        onChange={(e) => updateTerminal(idx, "terminal_group", e.target.value || null)}
                      >
                        <option value="">—</option>
                        <option value="line">Hat</option>
                        <option value="load">Yük</option>
                        <option value="bus">Bara</option>
                        <option value="branch">Tali</option>
                      </select>
                    </Td>
                    {/* Sil */}
                    <Td>
                      <button
                        type="button"
                        className="ghost danger"
                        style={{ padding: "0.2rem 0.5rem", fontSize: "0.8rem" }}
                        onClick={() => removeTerminal(idx)}
                        title="Terminali sil"
                      >
                        ✕
                      </button>
                    </Td>
                  </tr>
                );
              })}
              {terminals.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    style={{ textAlign: "center", padding: "1.5rem", color: "var(--muted)" }}
                  >
                    Terminal yok — "Terminal Ekle" butonuna tıklayın
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Teknik Çizim ─────────────────────────────────────────────────────── */}
      <section className="card">
        <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", color: "var(--accent)" }}>
          Teknik Çizim — Canlı Önizleme
        </h3>
        <DeviceTechDrawing
          widthMm={form.width_mm}
          heightMm={form.height_mm}
          depthMm={form.depth_mm}
          terminals={terminalsForDrawing}
          terminalDefs={terminalDefs}
          height={960}
        />
      </section>

      {/* ── Alt Kaydet Butonu ────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="ghost"
          onClick={() => navigate("/definitions/devices")}
        >
          ← Geri
        </button>
        <button type="submit" disabled={isPending}>
          {isPending ? "Kaydediliyor…" : isEdit ? "Değişiklikleri Kaydet" : "Cihaz Ekle"}
        </button>
      </div>
    </form>
  );
}

// ── Küçük yardımcı bileşenler ─────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        padding: "0.4rem 0.5rem",
        whiteSpace: "nowrap",
        textAlign: "left",
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={{ padding: "0.3rem 0.4rem", verticalAlign: "middle" }}>{children}</td>;
}

function NumInput({
  value,
  onChange,
  placeholder = "0",
  step = "any",
}: {
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  step?: string | number;
}) {
  return (
    <input
      type="number"
      step={step}
      style={cellInput}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

// ── Style sabitleri ───────────────────────────────────────────────────────────

const cellInput: React.CSSProperties = {
  width: "100%",
  minWidth: 64,
  padding: "0.3rem 0.4rem",
  fontSize: "0.82rem",
  border: "1px solid var(--line)",
  borderRadius: 6,
  background: "var(--bg-input)",
  color: "var(--text)",
};

function thGroupStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    textAlign: "center",
    padding: "0.3rem 0.5rem",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    color: "var(--muted)",
    borderBottom: "1px solid var(--line)",
  };
}
