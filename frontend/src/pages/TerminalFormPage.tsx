import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { client } from "../api/client";
import { TerminalPreview } from "../components/TerminalPreview";
import type { TerminalDefinition } from "../types";

// ─── Terminal tipleri ─────────────────────────────────────────────────────────
export const TERMINAL_TYPES = [
  "Ön Terminal",
  "Arka Yatay Taraklı",
  "Arka Yatay Terminal",
  "Yandan Taraklı",
  "Kablo Pabuçlu",
];

// ─── Vida tipleri → otomatik delik çapı ──────────────────────────────────────
const BOLT_SIZES: { value: string; label: string; holeDmm: number }[] = [
  { value: "M6",  label: "M6",  holeDmm: 7  },
  { value: "M8",  label: "M8",  holeDmm: 9  },
  { value: "M10", label: "M10", holeDmm: 11 },
  { value: "M12", label: "M12", holeDmm: 13 },
  { value: "M14", label: "M14", holeDmm: 15 },
  { value: "M16", label: "M16", holeDmm: 18 },
  { value: "M20", label: "M20", holeDmm: 22 },
  { value: "M24", label: "M24", holeDmm: 26 },
];

// ─── Basma yüzeyi seçenekleri ─────────────────────────────────────────────────
// Her terminal tipinde hangi yüzey seçenekleri sunulacak
// Çizimle ilişkisi yok — tali bakır basma yüzeyi bilgisi
const SURFACE_OPTIONS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  "Ön Terminal":         [{ value: "front",      label: "Sadece Ön" }],
  "Arka Yatay Taraklı":  [
    { value: "top_bottom", label: "Üst ve Alt" },
    { value: "top",        label: "Sadece Üst"  },
    { value: "bottom",     label: "Sadece Alt"  },
  ],
  "Arka Yatay Terminal": [
    { value: "top_bottom", label: "Üst ve Alt" },
    { value: "top",        label: "Sadece Üst"  },
    { value: "bottom",     label: "Sadece Alt"  },
  ],
  "Yandan Taraklı":      [
    { value: "left",  label: "Sol Yüzey" },
    { value: "right", label: "Sağ Yüzey" },
  ],
  "Kablo Pabuçlu":       [{ value: "front", label: "Sadece Ön" }],
};

function defaultSurface(terminalType: string): string {
  const opts = SURFACE_OPTIONS_BY_TYPE[terminalType] ?? [{ value: "front", label: "Ön" }];
  return opts[0].value;
}

// ─── Delik konumu: hangi eksenler aktif ───────────────────────────────────────
const POSITION_AXES: Record<string, { x: boolean; y: boolean; z: boolean; zLabel: string }> = {
  "Ön Terminal":         { x: true,  y: true,  z: false, zLabel: "Önden (Z)"         },
  "Arka Yatay Taraklı":  { x: true,  y: false, z: true,  zLabel: "Fin Başından (Z)"  },
  "Arka Yatay Terminal": { x: true,  y: false, z: true,  zLabel: "Önden (Z)"         },
  "Yandan Taraklı":      { x: true,  y: false, z: true,  zLabel: "Önden (Z)"         },
  "Kablo Pabuçlu":       { x: true,  y: true,  z: false, zLabel: "Önden (Z)"         },
};

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
  fin_offset_mm: number | null;
  plate_thickness_mm: number | null;
  bolt_pos_x_mm: number | null;
  bolt_pos_y_mm: number | null;
  bolt_pos_z_mm: number | null;
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
  // Fin varsayılanları (E bölümü)
  fin_count: 2,
  fin_spacing_mm: 20,
  fin_thickness_mm: 10,
  fin_length_mm: 20,
  fin_offset_mm: 30,
  plate_thickness_mm: 10,
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
    fin_count:         isTarakli(d.terminal_type) ? d.fin_count        : null,
    fin_spacing_mm:    isTarakli(d.terminal_type) ? d.fin_spacing_mm   : null,
    fin_thickness_mm:  isTarakli(d.terminal_type) ? d.fin_thickness_mm : null,
    fin_length_mm:     isTarakli(d.terminal_type) ? d.fin_length_mm    : null,
    fin_offset_mm:     isTarakli(d.terminal_type) ? d.fin_offset_mm    : null,
    plate_thickness_mm:isTarakli(d.terminal_type) ? d.plate_thickness_mm : null,
    bolt_pos_x_mm: d.bolt_pos_x_mm,
    bolt_pos_y_mm: d.bolt_pos_y_mm,
    bolt_pos_z_mm: d.bolt_pos_z_mm,
  };
}

// ─── Sayısal input (null destekli, negatife izin verme) ───────────────────────
function NumField({
  label, value, onChange, unit, min = 0, disabled, hint, error,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  unit?: string;
  min?: number;
  disabled?: boolean;
  hint?: string;   // formül ipucu — başlık altında gri küçük yazı
  error?: string;  // kısıt ihlali — başlık altında kırmızı küçük yazı
}) {
  return (
    <label className="field" style={disabled ? { opacity: 0.4, pointerEvents: "none" } : undefined}>
      <span style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
        <span>
          {label}
          {unit && <span style={{ color: "var(--muted)", fontWeight: 400 }}> ({unit})</span>}
        </span>
        {hint && !error && (
          <span style={{ fontSize: "0.68rem", fontWeight: 400, color: "var(--muted)",
            fontFamily: "monospace", opacity: 0.85, lineHeight: 1.3 }}>
            {hint}
          </span>
        )}
        {error && (
          <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "#ef4444",
            fontFamily: "monospace", lineHeight: 1.3 }}>
            ⚠ {error}
          </span>
        )}
      </span>
      <input
        className="input"
        type="number"
        step="any"
        min={min}
        value={value ?? ""}
        placeholder="—"
        disabled={disabled}
        style={error ? { borderColor: "#ef4444", boxShadow: "0 0 0 2px rgba(239,68,68,0.15)" } : undefined}
        onChange={(e) => {
          if (e.target.value === "") { onChange(null); return; }
          const v = Number(e.target.value);
          onChange(v < min ? min : v);
        }}
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
        fin_count:          def.fin_count          ?? 2,
        fin_spacing_mm:     def.fin_spacing_mm     ?? 20,
        fin_thickness_mm:   def.fin_thickness_mm   ?? 10,
        fin_length_mm:      def.fin_length_mm      ?? 20,
        fin_offset_mm:      def.fin_offset_mm      ?? 30,
        plate_thickness_mm: def.plate_thickness_mm ?? 10,
        bolt_pos_x_mm: def.bolt_pos_x_mm ?? null,
        bolt_pos_y_mm: def.bolt_pos_y_mm ?? null,
        bolt_pos_z_mm: def.bolt_pos_z_mm ?? null,
      });
      if (def.slot_width_mm || def.slot_length_mm) setHoleMode("slot");
    }
  }, [isEdit, detailQuery.data]);

  function set<K extends keyof TerminalDraft>(key: K, value: TerminalDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  // Terminal tipi değişince yüzey sıfırla
  function changeType(newType: string) {
    const validSurfaces = SURFACE_OPTIONS_BY_TYPE[newType] ?? [{ value: "front", label: "Ön" }];
    const currentValid  = validSurfaces.some(s => s.value === draft.surface);
    setDraft((d) => ({
      ...d,
      terminal_type: newType,
      surface: currentValid ? d.surface : validSurfaces[0].value,
    }));
  }

  // Vida tipi değişince delik çapını otomatik doldur
  function changeBoltType(boltValue: string) {
    const size = BOLT_SIZES.find(b => b.value === boltValue);
    setDraft((d) => ({
      ...d,
      bolt_type: boltValue,
      hole_diameter_mm: (size && holeMode === "round") ? size.holeDmm : d.hole_diameter_mm,
    }));
  }

  function changeHoleMode(mode: "round" | "slot") {
    setHoleMode(mode);
    if (mode === "round") {
      // Seçili vida tipine göre çapı otomatik doldur
      const size = BOLT_SIZES.find(b => b.value === draft.bolt_type);
      setDraft((d) => ({ ...d, slot_width_mm: null, slot_length_mm: null,
        hole_diameter_mm: size ? size.holeDmm : d.hole_diameter_mm }));
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

  const validSurfaces  = SURFACE_OPTIONS_BY_TYPE[draft.terminal_type] ?? [{ value: "front", label: "Ön" }];
  const surfaceLabel   = validSurfaces.find(s => s.value === draft.surface)?.label ?? draft.surface;
  const showFinFields  = isTarakli(draft.terminal_type);
  const posAxes        = POSITION_AXES[draft.terminal_type] ?? { x: true, y: true, z: true, zLabel: "Önden (Z)" };
  const isAYT          = draft.terminal_type === "Arka Yatay Taraklı";
  const isOT           = draft.terminal_type === "Ön Terminal";

  // ── Ortak değişkenler ─────────────────────────────────────────────────────
  const W   = draft.terminal_width_mm;
  const H   = draft.terminal_height_mm;
  const D   = draft.terminal_depth_mm;
  const n   = draft.fin_count ?? 1;
  const ft  = draft.fin_thickness_mm;
  const fs  = draft.fin_spacing_mm;
  const fo  = draft.fin_offset_mm;
  const fl  = draft.fin_length_mm;
  const pt  = draft.plate_thickness_mm;
  const hd  = draft.hole_diameter_mm;
  const bsp = draft.bolt_center_distance_mm;
  const bn  = draft.bolt_count ?? 1;
  const px  = draft.bolt_pos_x_mm;
  const py  = draft.bolt_pos_y_mm;
  const pz  = draft.bolt_pos_z_mm;

  // A — Derinlik: plaka + fin = D
  const depthSum    = (pt ?? 0) + (fl ?? 0);
  const depthHint   = `plaka_kalınlık + fin_uzunluk = D   →   ${pt ?? "?"} + ${fl ?? "?"} = ${depthSum} mm`;
  const depthError  = isAYT && D != null && pt != null && fl != null && Math.abs(depthSum - D) > 0.001
    ? `${pt} + ${fl} = ${depthSum} ≠ ${D} mm` : undefined;

  // B — Yükseklik: finBlok ≤ H
  const finBlock     = fs != null ? (n - 1) * fs + (ft ?? 0) : (ft ?? 0) * n;
  const finBlockErr  = isAYT && H != null && ft != null && finBlock > H + 0.001
    ? `finBlok ${finBlock.toFixed(1)} > H ${H} mm` : undefined;
  const offsetErr    = isAYT && H != null && fo != null && ft != null && fs != null
    && fo + finBlock > H + 0.001
    ? `boşluk(${fo}) + finBlok(${finBlock.toFixed(1)}) = ${(fo + finBlock).toFixed(1)} > H(${H})` : undefined;
  const spacingErr   = isAYT && ft != null && fs != null && fs < ft - 0.001
    ? `fin_aralık(${fs}) < fin_kalınlık(${ft})` : undefined;

  // C — Genişlik: sadece tek vida X konumu (bsp Z yönünde, X'i etkilemez)
  const boltRightErr = isAYT && W != null && px != null && hd != null
    && px + hd / 2 > W + 0.001
    ? `posX(${px}) + Ø/2(${hd/2}) = ${(px + hd/2).toFixed(1)} > W(${W})` : undefined;
  const boltLeftErr  = isAYT && px != null && hd != null && px < hd / 2 - 0.001
    ? `posX(${px}) < Ø/2(${hd/2})` : undefined;

  // D — Z: vida delikleri fin uzunluğu içinde (Z yönünde sıralı)
  // bsp = Z yönünde vida merkez-merkez aralığı
  const bspErr        = isAYT && bn > 1 && bsp != null && hd != null && bsp < hd - 0.001
    ? `vida_aralık(${bsp}) < Ø(${hd}) — delikler Z'de örtüşüyor` : undefined;
  const boltZFrontErr = isAYT && pz != null && hd != null && pz < hd / 2 - 0.001
    ? `posZ(${pz}) < Ø/2(${hd/2}) — ilk delik fin ön kenarına taşıyor` : undefined;
  // Son vida sağ kenarı: posZ + (boltN-1)*bsp + Ø/2 ≤ fin_length
  const lastBoltZEdge = pz != null && bsp != null ? pz + (bn - 1) * bsp + (hd ?? 0) / 2 : null;
  const boltZBackErr  = isAYT && fl != null && hd != null && lastBoltZEdge != null
    && lastBoltZEdge > fl + 0.001
    ? `posZ(${pz})+(${bn}-1)×bsp(${bsp})+Ø/2(${(hd/2).toFixed(1)}) = ${lastBoltZEdge.toFixed(1)} > fin_uzunluk(${fl})` : undefined;
  // Oto-Z (posZ=null): toplam span ≤ fin_length
  const boltZAutoErr  = isAYT && pz == null && fl != null && hd != null && bsp != null
    && (bn - 1) * bsp + hd > fl + 0.001
    ? `(${bn}-1)×bsp(${bsp})+Ø(${hd}) = ${((bn-1)*bsp+hd).toFixed(1)} > fin_uzunluk(${fl}) — oto konumda sığmıyor` : undefined;
  // Ø ≤ fin_length: delik çapı her halükarda fin uzunluğundan küçük olmalı
  const hdFlErr       = isAYT && hd != null && fl != null && hd > fl + 0.001
    ? `Ø(${hd}) > fin_uzunluk(${fl})` : undefined;

  // G — Sıfır değer kontrolleri
  const ptZeroErr  = isAYT && pt != null && pt <= 0
    ? `plaka_kalınlık > 0 olmalı` : undefined;
  const flZeroErr  = isAYT && fl != null && fl <= 0
    ? `fin_uzunluk > 0 olmalı` : undefined;
  const ftZeroErr  = isAYT && ft != null && ft <= 0
    ? `fin_kalınlık > 0 olmalı` : undefined;
  const hdZeroErr  = isAYT && hd != null && hd <= 0
    ? `delik_çapı > 0 olmalı` : undefined;
  const fsZeroErr  = isAYT && n > 1 && fs != null && fs <= 0
    ? `fin_aralık > 0 olmalı (n > 1)` : undefined;

  // Tüm AYT hataları
  const aytErrors = isAYT ? [
    depthError, finBlockErr, offsetErr, spacingErr,
    boltRightErr, boltLeftErr,
    bspErr, boltZFrontErr, boltZBackErr, boltZAutoErr, hdFlErr,
    ptZeroErr, flZeroErr, ftZeroErr, hdZeroErr, fsZeroErr,
  ].filter(Boolean) as string[] : [];

  // ── Ön Terminal kısıt hesaplamaları ───────────────────────────────────────
  // A1 — Merkez mesafesi delik çapından büyük olmalı (X yönünde örtüşme)
  const otBspErr       = isOT && bn > 1 && bsp != null && hd != null && bsp < hd - 0.001
    ? `vida_aralık(${bsp}) < Ø(${hd}) — delikler X'te örtüşüyor` : undefined;
  // A2 — İlk delik sol kenardan taşmamalı
  const otBoltLeftErr  = isOT && px != null && hd != null && px < hd / 2 - 0.001
    ? `posX(${px}) < Ø/2(${hd/2})` : undefined;
  // A3 — Son delik sağ kenardan taşmamalı (posX girilmişse)
  const otLastXEdge    = px != null && bsp != null ? px + (bn - 1) * bsp + (hd ?? 0) / 2 : null;
  const otBoltRightErr = isOT && W != null && hd != null && otLastXEdge != null
    && otLastXEdge > W + 0.001
    ? `posX(${px})+(${bn}-1)×bsp(${bsp})+Ø/2(${(hd/2).toFixed(1)}) = ${otLastXEdge.toFixed(1)} > W(${W})` : undefined;
  // A4 — Oto-X: toplam span ≤ W
  const otBoltAutoXErr = isOT && px == null && W != null && hd != null && bsp != null
    && (bn - 1) * bsp + hd > W + 0.001
    ? `(${bn}-1)×bsp(${bsp})+Ø(${hd}) = ${((bn-1)*bsp+hd).toFixed(1)} > W(${W}) — oto konumda sığmıyor` : undefined;

  // B1 — Delik üst kenardan taşmamalı
  const otBoltTopErr   = isOT && py != null && hd != null && py < hd / 2 - 0.001
    ? `posY(${py}) < Ø/2(${hd/2}) — delik üst kenardan taşıyor` : undefined;
  // B2 — Delik alt kenardan taşmamalı
  const otBoltBotErr   = isOT && H != null && py != null && hd != null
    && py + hd / 2 > H + 0.001
    ? `posY(${py})+Ø/2(${hd/2}) = ${(py + hd/2).toFixed(1)} > H(${H})` : undefined;
  // B3 — Oto-Y: H ≥ Ø
  const otBoltAutoYErr = isOT && py == null && H != null && hd != null && hd > H + 0.001
    ? `Ø(${hd}) > H(${H}) — oto konumda sığmıyor` : undefined;

  // C1 — Delik çapı pozitif
  const otHdZeroErr    = isOT && hd != null && hd <= 0
    ? `delik_çapı > 0 olmalı` : undefined;
  // C2 — Çap terminal yüksekliğine sığmalı
  const otHdHeightErr  = isOT && hd != null && H != null && hd > H + 0.001
    ? `Ø(${hd}) > H(${H})` : undefined;

  // D — Sıfır kontrolleri
  const otWZeroErr     = isOT && W != null && W <= 0  ? `genişlik > 0 olmalı`     : undefined;
  const otHZeroErr     = isOT && H != null && H <= 0  ? `yükseklik > 0 olmalı`    : undefined;
  const otBspZeroErr   = isOT && bn > 1 && bsp != null && bsp <= 0
    ? `vida_aralık > 0 olmalı (bn > 1)` : undefined;

  const otErrors = isOT ? [
    otBspErr, otBoltLeftErr, otBoltRightErr, otBoltAutoXErr,
    otBoltTopErr, otBoltBotErr, otBoltAutoYErr,
    otHdZeroErr, otHdHeightErr,
    otWZeroErr, otHZeroErr, otBspZeroErr,
  ].filter(Boolean) as string[] : [];

  // ── Submit engeli ─────────────────────────────────────────────────────────
  const formErrors    = [...aytErrors, ...otErrors];
  const hasFormErrors = formErrors.length > 0;
  const formErrorTooltip = hasFormErrors
    ? `Geometri hataları düzeltilmeden kaydedilemez:\n• ${formErrors.join("\n• ")}`
    : undefined;

  // AYT derinlik ipucu (bilgi bandı için)
  const aytDepthHint = isAYT && (
    (draft.fin_length_mm ?? 0) + (draft.plate_thickness_mm ?? 0)
  );

  return (
    <div className="stack">
      {/* Başlık */}
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

        {/* ── Sol: Form ── */}
        <form onSubmit={handleSubmit}>

          {/* A — Temel Bilgiler */}
          <section className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={sectionTitle}>A — Temel Bilgiler</h3>
            <div className="form-grid">
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Terminal Adı</span>
                <input className="input" required value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="ör. ABB Emax2 Ön Terminal M12" />
              </label>

              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Terminal Tipi</span>
                <select className="input" value={draft.terminal_type}
                  onChange={(e) => changeType(e.target.value)}>
                  {TERMINAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>

              {/* Basma Yüzeyi — radio butonlar */}
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ display: "block", fontSize: "0.8rem", fontWeight: 600,
                  color: "var(--fg)", marginBottom: "0.4rem" }}>
                  Basma Yüzeyi
                  <span style={{ fontSize: "0.72rem", fontWeight: 400, color: "var(--muted)", marginLeft: "0.5rem" }}>
                    (tali bakır baskı yüzeyi — çizimi etkilemez)
                  </span>
                </span>
                <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
                  {validSurfaces.map((s) => (
                    <label key={s.value} style={{
                      display: "flex", alignItems: "center", gap: "0.3rem",
                      padding: "0.28rem 0.85rem", borderRadius: 6, cursor: "pointer",
                      border: `1px solid ${draft.surface === s.value ? "var(--accent)" : "var(--line)"}`,
                      background: draft.surface === s.value ? "var(--accent-soft)" : "var(--surface)",
                      color: draft.surface === s.value ? "var(--accent)" : "var(--fg)",
                      fontSize: "0.82rem", fontWeight: draft.surface === s.value ? 600 : 400,
                      transition: "all 0.15s",
                    }}>
                      <input type="radio" name="surface" value={s.value}
                        checked={draft.surface === s.value}
                        onChange={() => set("surface", s.value)}
                        style={{ display: "none" }} />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* B — Vida & Delik */}
          <section className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={sectionTitle}>B — Vida &amp; Delik</h3>
            <div className="form-grid">
              {/* Vida tipi — select ile otomatik çap */}
              <label className="field">
                <span>Vida Tipi</span>
                <select className="input" value={draft.bolt_type}
                  onChange={(e) => changeBoltType(e.target.value)}>
                  {BOLT_SIZES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  <option value="">Diğer / Manuel</option>
                </select>
              </label>

              <NumField label="Vida Adedi" value={draft.bolt_count} min={1}
                hint={isAYT ? "posZ + (n−1)×aralık + Ø/2 ≤ fin_uzunluk (Z yönü)"
                    : isOT  ? "posX + (n−1)×aralık + Ø/2 ≤ W (X yönü)" : undefined}
                onChange={(v) => set("bolt_count", v != null ? Math.max(1, Math.round(v)) : null)} />

              <NumField label="Vida Merkez Mesafesi" unit="mm" min={0}
                value={draft.bolt_center_distance_mm}
                hint={isAYT ? "≥ Ø (Z yönünde);  posZ + (n−1)×aralık + Ø/2 ≤ fin_uzunluk"
                    : isOT  ? "≥ Ø (X yönünde);  posX + (n−1)×aralık + Ø/2 ≤ W" : undefined}
                error={isAYT ? bspErr : isOT ? (otBspZeroErr ?? otBspErr) : undefined}
                onChange={(v) => set("bolt_center_distance_mm", v)} />

              {/* Delik tipi */}
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ display: "block", fontSize: "0.8rem", fontWeight: 600,
                  color: "var(--fg)", marginBottom: "0.4rem" }}>Delik Tipi</span>
                <div style={{ display: "flex", gap: "0.45rem" }}>
                  {(["round", "slot"] as const).map((m) => (
                    <button key={m} type="button" onClick={() => changeHoleMode(m)} style={{
                      padding: "0.28rem 0.85rem", borderRadius: 6, fontSize: "0.82rem",
                      border: `1px solid ${holeMode === m ? "var(--accent)" : "var(--line)"}`,
                      background: holeMode === m ? "var(--accent-soft)" : "var(--surface)",
                      color: holeMode === m ? "var(--accent)" : "var(--fg)",
                      fontWeight: holeMode === m ? 600 : 400, cursor: "pointer",
                    }}>
                      {m === "round" ? "Yuvarlak Delik" : "Slot Delik"}
                    </button>
                  ))}
                </div>
              </div>

              {holeMode === "round" ? (
                <NumField label="Delik Çapı" unit="mm" min={0}
                  value={draft.hole_diameter_mm}
                  hint={isAYT ? "≤ vida_aralığı (Z);  ≤ fin_uzunluk"
                      : isOT  ? "≤ vida_aralığı (X);  ≤ H" : undefined}
                  error={isAYT ? (hdZeroErr ?? bspErr ?? hdFlErr)
                       : isOT  ? (otHdZeroErr ?? otBspErr ?? otHdHeightErr) : undefined}
                  onChange={(v) => set("hole_diameter_mm", v)} />
              ) : (
                <>
                  <NumField label="Slot Genişliği" unit="mm" min={0}
                    value={draft.slot_width_mm}
                    onChange={(v) => set("slot_width_mm", v)} />
                  <NumField label="Slot Uzunluğu" unit="mm" min={0}
                    value={draft.slot_length_mm}
                    onChange={(v) => set("slot_length_mm", v)} />
                </>
              )}
            </div>
          </section>

          {/* C — Fiziksel Boyutlar */}
          <section className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={sectionTitle}>C — Fiziksel Boyutlar</h3>
            {draft.terminal_type === "Arka Yatay Taraklı" && (
              <p style={{ margin: "0 0 0.7rem", fontSize: "0.77rem", color: "var(--muted)",
                background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)",
                borderRadius: 6, padding: "0.4rem 0.65rem" }}>
                Derinlik Z = Plaka Kalınlığı + Fin Uzunluğu
                {aytDepthHint !== false && aytDepthHint > 0 && (
                  <strong style={{ marginLeft: "0.5rem" }}>
                    ({draft.plate_thickness_mm ?? 0} + {draft.fin_length_mm ?? 0} = {aytDepthHint} mm)
                  </strong>
                )}
              </p>
            )}
            <div className="form-grid">
              <NumField label="Genişlik X" unit="mm" min={0}
                value={draft.terminal_width_mm}
                hint={isAYT ? "posX + Ø/2 ≤ W  (tek vida X konumu; aralık Z yönündedir)"
                    : isOT  ? "posX + (n−1)×aralık + Ø/2 ≤ W" : undefined}
                error={isAYT ? boltRightErr
                     : isOT  ? (otWZeroErr ?? otBoltRightErr ?? otBoltAutoXErr) : undefined}
                onChange={(v) => set("terminal_width_mm", v)} />
              <NumField label="Yükseklik Y" unit="mm" min={0}
                value={draft.terminal_height_mm}
                hint={isAYT ? "fin_boşluk + (n−1)×fin_aralık + fin_kalınlık ≤ H"
                    : isOT  ? "posY + Ø/2 ≤ H;  H ≥ Ø" : undefined}
                error={isAYT ? (finBlockErr ?? offsetErr)
                     : isOT  ? (otHZeroErr ?? otHdHeightErr ?? otBoltBotErr ?? otBoltAutoYErr) : undefined}
                onChange={(v) => set("terminal_height_mm", v)} />
              <NumField label="Derinlik Z" unit="mm" min={0}
                value={draft.terminal_depth_mm}
                hint={isAYT ? "plaka_kalınlık + fin_uzunluk = D" : undefined}
                error={isAYT ? depthError : undefined}
                onChange={(v) => set("terminal_depth_mm", v)} />
            </div>
          </section>

          {/* D — Delik Konumu */}
          <section className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={sectionTitle}>D — Delik Konumu</h3>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "var(--muted)" }}>
              Boş bırakılırsa delikler otomatik ortalanır.
            </p>
            <div className="form-grid">
              <NumField label="Sol Kenardan (X)" unit="mm" min={0}
                value={draft.bolt_pos_x_mm}
                hint={isAYT ? "≥ Ø/2;  posX + Ø/2 ≤ W  (vida_aralığı Z yönünde)"
                    : isOT  ? "≥ Ø/2;  posX + (n−1)×aralık + Ø/2 ≤ W" : undefined}
                error={isAYT ? (boltLeftErr ?? boltRightErr)
                     : isOT  ? (otBoltLeftErr ?? otBoltRightErr) : undefined}
                onChange={(v) => set("bolt_pos_x_mm", v)} />
              <NumField label="Üstten (Y)" unit="mm" min={0}
                value={draft.bolt_pos_y_mm}
                hint={isOT ? "≥ Ø/2;  posY + Ø/2 ≤ H" : undefined}
                error={isOT ? (otBoltTopErr ?? otBoltBotErr) : undefined}
                onChange={(v) => set("bolt_pos_y_mm", v)} />
              <NumField
                label={isAYT ? "Fin Başından (Z)" : "Önden (Z)"}
                unit="mm" min={0}
                value={draft.bolt_pos_z_mm}
                hint={isAYT ? "≥ Ø/2;  posZ + (n−1)×aralık + Ø/2 ≤ fin_uzunluk" : undefined}
                error={isAYT ? (boltZFrontErr ?? boltZBackErr ?? boltZAutoErr) : undefined}
                onChange={(v) => set("bolt_pos_z_mm", v)} />
            </div>
          </section>

          {/* E — Fin / Tarak Geometrisi */}
          {showFinFields && (
            <section className="card" style={{ marginBottom: "1rem" }}>
              <h3 style={sectionTitle}>E — Tarak (Fin) Geometrisi</h3>

              {/* Geometrik doğrulama */}
              {(() => {
                const h  = draft.terminal_height_mm;
                const n  = draft.fin_count;
                const th = draft.fin_thickness_mm;
                const sp = draft.fin_spacing_mm;
                const of = draft.fin_offset_mm;
                if (!h || !n || !th) return null;
                const finBlock  = sp != null ? (n - 1) * sp + th : th * n;
                const remaining = h - finBlock;
                const maxSp     = n > 1 ? (h - th) / (n - 1) : null;
                const isOver    = sp != null && maxSp != null && sp > maxSp + 0.001;
                const topM      = of != null ? of : remaining / 2;
                const botM      = remaining - topM;
                const isNeg     = remaining < -0.001;
                return (
                  <div style={{
                    background: (isOver || isNeg) ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.05)",
                    border: `1px solid ${(isOver || isNeg) ? "#ef4444" : "var(--line)"}`,
                    borderRadius: 6, padding: "0.5rem 0.75rem", marginBottom: "0.8rem",
                    fontSize: "0.77rem",
                  }}>
                    <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap", marginBottom: "0.2rem" }}>
                      <span>Fin blok: <b>{finBlock.toFixed(1)} mm</b></span>
                      <span style={{ color: isNeg ? "#ef4444" : "inherit" }}>
                        Kalan: <b>{remaining.toFixed(1)} mm</b>{isNeg ? " ⚠ TAŞIYOR" : ""}
                      </span>
                      <span>Üst boşluk: <b>{topM.toFixed(1)} mm</b></span>
                      <span>Alt boşluk: <b>{botM.toFixed(1)} mm</b></span>
                    </div>
                    {maxSp != null && (
                      <div style={{ color: isOver ? "#ef4444" : "#22c55e", fontWeight: 600 }}>
                        Maks. fin aralığı (m-m): {maxSp.toFixed(1)} mm
                        {isOver ? ` — girilen ${sp} mm aşıyor ⚠` : " ✓"}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="form-grid">
                <NumField label="Fin Adedi" value={draft.fin_count} min={1}
                  hint={isAYT ? "finBlok = (n−1)×fin_aralık + fin_kalınlık ≤ H" : undefined}
                  error={isAYT ? finBlockErr : undefined}
                  onChange={(v) => set("fin_count", v != null ? Math.max(1, Math.round(v)) : null)} />
                <NumField label="Fin Aralığı (m-m)" unit="mm" min={0}
                  value={draft.fin_spacing_mm}
                  hint={isAYT ? "≥ fin_kalınlık;  (n−1)×aralık + kalınlık ≤ H − boşluk" : undefined}
                  error={isAYT ? (fsZeroErr ?? spacingErr ?? finBlockErr) : undefined}
                  onChange={(v) => set("fin_spacing_mm", v)} />
                <NumField label="Fin Kalınlığı" unit="mm" min={0}
                  value={draft.fin_thickness_mm}
                  hint={isAYT ? "≤ fin_aralık  (finler örtüşmesin)" : undefined}
                  error={isAYT ? (ftZeroErr ?? spacingErr) : undefined}
                  onChange={(v) => set("fin_thickness_mm", v)} />
                <NumField label="İlk Fin Boşluğu (üstten)" unit="mm" min={0}
                  value={draft.fin_offset_mm}
                  hint={isAYT ? "fin_boşluk + finBlok ≤ H" : undefined}
                  error={isAYT ? offsetErr : undefined}
                  onChange={(v) => set("fin_offset_mm", v)} />
                <NumField label="Fin Uzunluğu" unit="mm" min={0}
                  value={draft.fin_length_mm}
                  hint={isAYT ? "plaka + fin_uzunluk = D;  posZ + (n−1)×aralık + Ø/2 ≤ fin_uzunluk" : undefined}
                  error={isAYT ? (flZeroErr ?? depthError ?? boltZBackErr ?? hdFlErr) : undefined}
                  onChange={(v) => set("fin_length_mm", v)} />
                <NumField label="Plaka Kalınlığı" unit="mm" min={0}
                  value={draft.plate_thickness_mm}
                  hint={isAYT ? "plaka_kalınlık + fin_uzunluk = D" : undefined}
                  error={isAYT ? (ptZeroErr ?? depthError) : undefined}
                  onChange={(v) => set("plate_thickness_mm", v)} />
              </div>
            </section>
          )}

          {/* Kaydet */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {hasFormErrors && (
              <div style={{
                fontSize: "0.75rem", color: "#ef4444", fontWeight: 600,
                background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: 6, padding: "0.4rem 0.65rem", lineHeight: 1.5,
              }}>
                {formErrors.length} geometri hatası giderilmeden kaydedilemez.
              </div>
            )}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSaving || hasFormErrors}
                title={formErrorTooltip}
              >
                {isSaving ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Kaydet"}
              </button>
              <button type="button" className="ghost"
                onClick={() => navigate("/definitions/terminal-types")}>
                İptal
              </button>
            </div>
          </div>
        </form>

        {/* ── Sağ: Önizleme + Özet ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* 4 görünüş — üstte */}
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
            fin_offset_mm={draft.fin_offset_mm}
            plate_thickness_mm={draft.plate_thickness_mm}
            bolt_pos_x_mm={draft.bolt_pos_x_mm}
            bolt_pos_y_mm={draft.bolt_pos_y_mm}
            bolt_pos_z_mm={draft.bolt_pos_z_mm}
          />

          {/* Özet kartı — görünüşlerin altında */}
          <section className="card">
            <div style={{ marginBottom: "0.6rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{
                padding: "3px 10px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600,
                background: "var(--accent-soft)", color: "var(--accent)",
              }}>{draft.terminal_type}</span>
              <span style={{
                padding: "3px 10px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600,
                background: "rgba(148,163,184,0.12)", color: "var(--muted)",
              }}>{surfaceLabel}</span>
              <span style={{
                padding: "3px 10px", borderRadius: 6, fontSize: "0.78rem", fontWeight: 600,
                background: holeMode === "slot" ? "rgba(251,191,36,0.15)" : "rgba(148,163,184,0.08)",
                color: holeMode === "slot" ? "#b45309" : "var(--muted)",
              }}>{holeMode === "slot" ? "Slot Delik" : "Yuvarlak Delik"}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
              {[
                ["Vida",   draft.bolt_type ? `${draft.bolt_type} ×${draft.bolt_count ?? "?"}` : "—"],
                ["Merkez", draft.bolt_center_distance_mm ? `${draft.bolt_center_distance_mm} mm` : "—"],
                ["Delik",  holeMode === "round"
                  ? (draft.hole_diameter_mm ? `Ø${draft.hole_diameter_mm} mm` : "—")
                  : (draft.slot_width_mm && draft.slot_length_mm ? `${draft.slot_width_mm}×${draft.slot_length_mm} mm` : "—")],
                ["Boyut",  draft.terminal_width_mm && draft.terminal_height_mm
                  ? `${draft.terminal_width_mm}×${draft.terminal_height_mm}×${draft.terminal_depth_mm ?? "?"} mm`
                  : "—"],
                ["Konum X", draft.bolt_pos_x_mm != null ? `${draft.bolt_pos_x_mm} mm` : "oto"],
                ["Konum Y", draft.bolt_pos_y_mm != null ? `${draft.bolt_pos_y_mm} mm` : "oto"],
                ["Konum Z", draft.bolt_pos_z_mm != null ? `${draft.bolt_pos_z_mm} mm` : "oto"],
                ...(showFinFields ? [[
                  "Fin",
                  draft.fin_count
                    ? `${draft.fin_count} adet / ${draft.fin_spacing_mm ?? "?"}mm ara / ${draft.fin_thickness_mm ?? "?"}mm kalın`
                    : "—",
                ]] : []),
              ].map(([label, value]) => (
                <div key={label} style={{
                  background: "var(--surface-alt,rgba(0,0,0,0.03))",
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

// Bölüm başlığı stili
const sectionTitle: React.CSSProperties = {
  margin: "0 0 0.9rem",
  fontSize: "0.85rem",
  fontWeight: 700,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};
