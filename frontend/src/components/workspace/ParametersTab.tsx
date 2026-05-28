import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import type { CopperSettings } from "../../types";

interface ParametersTabProps {
  projectId: number;
}

// ── InfoChip ─────────────────────────────────────────────────────────────────
function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "var(--panel-strong)",
        border: "1px solid var(--line)",
        borderRadius: "10px",
        padding: "0.6rem 0.9rem",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </div>
      <div style={{ fontWeight: 700, fontFamily: "monospace", fontSize: "1rem", color: "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}

function val(value?: number | null, unit = "mm") {
  return value != null ? `${Number(value)} ${unit}` : "-";
}

// ── Büküm Kesit Diyagramı ────────────────────────────────────────────────────
function BukumDiyagrami({ R, t, k }: { R: number; t: number; k: number }) {
  // Büküm payı hesabı
  const BA = (Math.PI / 2) * (R + k * t);
  const tPx = Math.max(8, Math.min(t * 3, 32));   // thickness piksel ölçeği
  const RPx = Math.max(12, Math.min(R * 2, 60));   // radius piksel ölçeği

  const barY = 90;           // yatay bara merkezi
  const barX1 = 20;
  const barX2 = 130;
  const bendCx = barX2;      // büküm merkezi
  const bendCy = barY - RPx; // büküm merkezi Y

  // Büküm yayı (90° — sağdan yukarıya)
  const arcEndX = barX2 + RPx;
  const arcEndY = barY - RPx;

  return (
    <svg viewBox="0 0 280 160" width="100%" style={{ display: "block" }} fontFamily="'Segoe UI', system-ui, monospace">
      {/* Arka plan */}
      <rect width={280} height={160} fill="var(--panel-strong)" rx={8} />
      <rect width={280} height={160} fill="none" stroke="var(--line)" strokeWidth={1} rx={8} />

      {/* Yatay bara */}
      <rect
        x={barX1} y={barY - tPx / 2}
        width={barX2 - barX1} height={tPx}
        fill="rgba(229,115,22,0.15)" stroke="#e65100" strokeWidth={1.5} rx={1}
      />

      {/* Büküm yayı (iç) */}
      <path
        d={`M ${barX2} ${barY + tPx / 2} A ${RPx + tPx / 2} ${RPx + tPx / 2} 0 0 1 ${barX2 + RPx + tPx / 2} ${barY - RPx}`}
        fill="none" stroke="#e65100" strokeWidth={1.5}
      />
      {/* Büküm yayı (dış) */}
      <path
        d={`M ${barX2} ${barY - tPx / 2} A ${RPx - tPx / 2} ${RPx - tPx / 2} 0 0 1 ${barX2 + RPx - tPx / 2} ${barY - RPx}`}
        fill="none" stroke="#e65100" strokeWidth={1.5}
      />
      {/* Büküm dolgusu */}
      <path
        d={`M ${barX2} ${barY + tPx / 2}
            A ${RPx + tPx / 2} ${RPx + tPx / 2} 0 0 1 ${barX2 + RPx + tPx / 2} ${barY - RPx}
            L ${barX2 + RPx - tPx / 2} ${barY - RPx}
            A ${RPx - tPx / 2} ${RPx - tPx / 2} 0 0 0 ${barX2} ${barY - tPx / 2}
            Z`}
        fill="rgba(229,115,22,0.15)"
      />

      {/* Dikey kol (büküm sonrası) */}
      <rect
        x={barX2 + RPx - tPx / 2} y={20}
        width={tPx} height={barY - RPx - 20}
        fill="rgba(229,115,22,0.15)" stroke="#e65100" strokeWidth={1.5} rx={1}
      />

      {/* K faktörü nötr eksen (kesik mavi çizgi) */}
      <line
        x1={barX1} y1={barY + (k - 0.5) * tPx}
        x2={barX2} y2={barY + (k - 0.5) * tPx}
        stroke="#1565c0" strokeWidth={1} strokeDasharray="4 3"
      />

      {/* ── Etiketler ── */}
      {/* R iç yarıçap */}
      <line x1={bendCx} y1={bendCy} x2={barX2} y2={barY} stroke="#94a3b8" strokeWidth={0.8} />
      <text x={bendCx - 8} y={bendCy - 4} fill="#94a3b8" fontSize={9} textAnchor="middle">
        R={R}mm
      </text>

      {/* Kalınlık t */}
      <line x1={barX1 + 20} y1={barY - tPx / 2 - 3} x2={barX1 + 20} y2={barY + tPx / 2 + 3}
        stroke="#94a3b8" strokeWidth={0.8} />
      <text x={barX1 + 20} y={barY - tPx / 2 - 7} fill="#94a3b8" fontSize={9} textAnchor="middle">
        t={t}mm
      </text>

      {/* K faktörü */}
      <text x={barX2 + RPx + 18} y={barY - RPx + 4} fill="#1565c0" fontSize={9}>
        K={k}
      </text>

      {/* Büküm payı formülü */}
      <rect x={4} y={136} width={272} height={20} fill="rgba(21,101,192,0.1)" rx={4} />
      <text x={140} y={149} textAnchor="middle" fill="#94a3b8" fontSize={9}>
        BA = (π/2) × (R + K×t) = {BA.toFixed(1)} mm
      </text>
    </svg>
  );
}

// ── Delik / Slot Diyagramı ──────────────────────────────────────────────────
function DelikDiyagrami({
  minEdge, minBend, holeDiam, useSlot, slotW, slotL,
}: {
  minEdge: number; minBend: number; holeDiam: number;
  useSlot: boolean; slotW: number; slotL: number;
}) {
  const barY = 85;          // bara üst kenarı
  const barThick = 14;      // bara görsel kalınlığı (px)
  const holeX  = 130;       // delik merkezi X
  const bendX  = 230;       // büküm konumu (simüle)
  const kenarX = 24;        // bara sol kenarı

  // Ölçek: piksel / mm (küçük tutalım)
  const sc = Math.min(40 / Math.max(minEdge, minBend, 1), 2.5);

  const holeR   = useSlot ? 0 : Math.max(4, (holeDiam / 2) * 1.5);
  const slotHW  = useSlot ? Math.max(4, (slotW / 2) * 1.5) : 0;
  const slotHL  = useSlot ? Math.max(8, (slotL / 2) * 1.5) : 0;

  const holeColor = useSlot ? "#1565c0" : "#e65100";

  return (
    <svg viewBox="0 0 280 160" width="100%" style={{ display: "block" }} fontFamily="'Segoe UI', system-ui, monospace">
      <rect width={280} height={160} fill="var(--panel-strong)" rx={8} />
      <rect width={280} height={160} fill="none" stroke="var(--line)" strokeWidth={1} rx={8} />

      {/* Bara gövdesi */}
      <rect
        x={kenarX} y={barY}
        width={bendX - kenarX} height={barThick}
        fill="rgba(229,115,22,0.12)" stroke="#e65100" strokeWidth={1.5} rx={2}
      />

      {/* Büküm simgesi (dikey çizgi) */}
      <line x1={bendX} y1={barY - 12} x2={bendX} y2={barY + barThick + 12}
        stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 3" />
      <text x={bendX + 3} y={barY - 6} fill="#94a3b8" fontSize={8}>büküm</text>

      {/* Delik veya slot */}
      {useSlot ? (
        <rect
          x={holeX - slotHL / 2} y={barY + barThick / 2 - slotHW}
          width={slotHL} height={slotHW * 2}
          fill="var(--panel-strong)" stroke={holeColor} strokeWidth={1.5} rx={slotHW}
        />
      ) : (
        <circle
          cx={holeX} cy={barY + barThick / 2}
          r={holeR}
          fill="var(--panel-strong)" stroke={holeColor} strokeWidth={1.5}
        />
      )}

      {/* Min delik-kenar ok */}
      <line x1={kenarX} y1={barY - 18} x2={holeX} y2={barY - 18}
        stroke="#94a3b8" strokeWidth={1} markerEnd="url(#arrow)" />
      {/* Ok uçları */}
      <line x1={kenarX} y1={barY - 22} x2={kenarX} y2={barY - 14} stroke="#94a3b8" strokeWidth={1} />
      <line x1={holeX}  y1={barY - 22} x2={holeX}  y2={barY - 14} stroke="#94a3b8" strokeWidth={1} />
      <text x={(kenarX + holeX) / 2} y={barY - 22}
        textAnchor="middle" fill="#94a3b8" fontSize={9}>
        minKenar={minEdge}mm
      </text>

      {/* Min delik-büküm ok */}
      <line x1={holeX} y1={barY + barThick + 16} x2={bendX} y2={barY + barThick + 16}
        stroke="#94a3b8" strokeWidth={1} />
      <line x1={holeX}  y1={barY + barThick + 12} x2={holeX}  y2={barY + barThick + 20} stroke="#94a3b8" strokeWidth={1} />
      <line x1={bendX}  y1={barY + barThick + 12} x2={bendX}  y2={barY + barThick + 20} stroke="#94a3b8" strokeWidth={1} />
      <text x={(holeX + bendX) / 2} y={barY + barThick + 30}
        textAnchor="middle" fill="#94a3b8" fontSize={9}>
        minBüküm={minBend}mm
      </text>

      {/* Delik boyutu etiketi */}
      <text
        x={holeX} y={barY + barThick + 52}
        textAnchor="middle" fill={holeColor} fontSize={9} fontWeight={700}
      >
        {useSlot ? `Slot ${slotL}×${slotW} mm` : `Ø ${holeDiam} mm`}
      </text>

      {/* Tip etiketi */}
      <rect
        x={holeX - 28} y={140} width={56} height={14}
        fill={`${holeColor}22`} stroke={`${holeColor}55`} rx={4}
      />
      <text x={holeX} y={150} textAnchor="middle" fill={holeColor} fontSize={9} fontWeight={700}>
        {useSlot ? "SLOT DELİK" : "YUVARLAk DELİK"}
      </text>
    </svg>
  );
}

// ── Ana bileşen ───────────────────────────────────────────────────────────────
export function ParametersTab({ projectId }: ParametersTabProps) {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ["copper-settings", projectId],
    queryFn: () => client.getCopperSettings(projectId),
  });

  const settings = settingsQuery.data;

  const [bendRadius, setBendRadius] = useState<number>(10);
  const [kFactor, setKFactor] = useState<number>(0.33);
  const [minEdge, setMinEdge] = useState<number>(15);
  const [minBend, setMinBend] = useState<number>(15);
  const [holeDiam, setHoleDiam] = useState<number>(11);
  const [useSlot, setUseSlot] = useState<boolean>(false);
  const [slotW, setSlotW] = useState<number>(12);
  const [slotL, setSlotL] = useState<number>(18);

  useEffect(() => {
    if (!settings) return;
    setBendRadius(Number(settings.bend_inner_radius_mm ?? 10));
    setKFactor(Number(settings.k_factor ?? 0.33));
    setMinEdge(Number(settings.min_hole_edge_distance_mm ?? 15));
    setMinBend(Number(settings.min_bend_hole_distance_mm ?? 15));
    setHoleDiam(Number(settings.default_hole_diameter_mm ?? 11));
    setUseSlot(settings.use_slot_holes ?? false);
    setSlotW(Number(settings.slot_width_mm ?? 12));
    setSlotL(Number(settings.slot_length_mm ?? 18));
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (payload: CopperSettings) => client.upsertCopperSettings(projectId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["copper-settings", projectId] });
    },
  });

  function handleSave() {
    const merged: CopperSettings = {
      ...settings,
      main_material: settings?.main_material ?? "Cu",
      branch_material: settings?.branch_material ?? "Cu",
      bend_inner_radius_mm: bendRadius,
      k_factor: kFactor,
      min_hole_edge_distance_mm: minEdge,
      min_bend_hole_distance_mm: minBend,
      default_hole_diameter_mm: holeDiam,
      use_slot_holes: useSlot,
      slot_width_mm: useSlot ? slotW : null,
      slot_length_mm: useSlot ? slotL : null,
    };
    saveMutation.mutate(merged);
  }

  if (settingsQuery.isLoading) {
    return <div className="loading-state">Yukleniyor...</div>;
  }

  const mainThickness = Number(settings?.main_thickness_mm ?? 5);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", alignItems: "start" }}>

      {/* ── SOL: Form ────────────────────────────────────────────────────────── */}
      <div className="stack">
        {/* Bakır özetleri */}
        <section className="table-card">
          <div className="section-header" style={{ marginBottom: "1rem" }}>
            <h3>Secili Bakir Ozetleri</h3>
            <span className="helper-text" style={{ fontSize: "0.82rem" }}>
              Ana ve tali bakir secimlerinden gelen aktif proje degerleri
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ border: "1.5px solid rgba(224,104,0,0.3)", borderRadius: "14px", padding: "1rem 1.2rem", background: "rgba(224,104,0,0.04)" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Ana Bakir</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <InfoChip label="Kesit" value={`${settings?.main_width_mm ?? "-"} x ${settings?.main_thickness_mm ?? "-"}`} />
                <InfoChip label="Faz Araligi" value={val(settings?.main_phase_spacing_mm)} />
                <InfoChip label="Yon" value={settings?.busbar_orientation ?? "-"} />
                <InfoChip label="Uzunluk" value={val(settings?.busbar_length_mm)} />
              </div>
            </div>

            <div style={{ border: "1.5px solid rgba(21,101,192,0.3)", borderRadius: "14px", padding: "1rem 1.2rem", background: "rgba(21,101,192,0.04)" }}>
              <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>Tali Bakir</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                <InfoChip label="Kesit" value={`${settings?.branch_width_mm ?? "-"} x ${settings?.branch_thickness_mm ?? "-"}`} />
                <InfoChip label="Malzeme" value={settings?.branch_material ?? "-"} />
                <InfoChip label="Delik Capi" value={val(settings?.default_hole_diameter_mm)} />
                <InfoChip label="Bukum Ic R" value={val(settings?.bend_inner_radius_mm)} />
              </div>
            </div>
          </div>
        </section>

        {/* Hesaplama parametreleri */}
        <section className="table-card">
          <div className="section-header" style={{ marginBottom: "1.25rem" }}>
            <h3>Hesaplama Parametreleri</h3>
            <span className="helper-text" style={{ fontSize: "0.82rem" }}>
              Delik ve bukum hesaplarinda kullanilan ortak proje parametreleri
            </span>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Bukum Ic Yaricapi (mm)</span>
              <input className="input" type="number" min={0} step={0.5}
                value={bendRadius} onChange={(e) => setBendRadius(Number(e.target.value))} />
            </label>
            <label className="field">
              <span>K Faktor</span>
              <input className="input" type="number" min={0} max={0.5} step={0.01}
                value={kFactor} onChange={(e) => setKFactor(Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Min Delik-Kenar (mm)</span>
              <input className="input" type="number" min={0} step={0.5}
                value={minEdge} onChange={(e) => setMinEdge(Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Min Delik-Bukum (mm)</span>
              <input className="input" type="number" min={0} step={0.5}
                value={minBend} onChange={(e) => setMinBend(Number(e.target.value))} />
            </label>
            <label className="field">
              <span>Varsayilan Delik Capi (mm)</span>
              <input className="input" type="number" min={1} step={0.5}
                value={holeDiam} onChange={(e) => setHoleDiam(Number(e.target.value))} />
            </label>
            <div className="field">
              <span>Slot Delik</span>
              <label style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "0.65rem 0.9rem",
                border: "1px solid var(--line)", borderRadius: "10px",
                background: useSlot ? "var(--accent-soft)" : "var(--bg-input)",
              }}>
                <input type="checkbox" checked={useSlot} onChange={(e) => setUseSlot(e.target.checked)} />
                <span>{useSlot ? "Aktif" : "Pasif"}</span>
              </label>
            </div>
            {useSlot && (
              <>
                <label className="field">
                  <span>Slot Genisligi (mm)</span>
                  <input className="input" type="number" min={1} step={0.5}
                    value={slotW} onChange={(e) => setSlotW(Number(e.target.value))} />
                </label>
                <label className="field">
                  <span>Slot Uzunlugu (mm)</span>
                  <input className="input" type="number" min={1} step={0.5}
                    value={slotL} onChange={(e) => setSlotL(Number(e.target.value))} />
                </label>
              </>
            )}

            <div className="form-actions" style={{ gridColumn: "1 / -1" }}>
              <button type="button" className="btn-primary"
                disabled={saveMutation.isPending} onClick={handleSave}>
                {saveMutation.isPending ? "Kaydediliyor..." : "Parametreleri Kaydet"}
              </button>
              {saveMutation.isSuccess && (
                <span style={{ color: "#22c55e", fontSize: "0.82rem", alignSelf: "center" }}>
                  ✓ Kaydedildi
                </span>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── SAĞ: Görsel Panel (sticky) ────────────────────────────────────────── */}
      <div style={{ position: "sticky", top: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Aktif değerler özeti */}
        <section className="table-card">
          <h3 style={{ margin: "0 0 0.75rem" }}>Aktif Parametre Değerleri</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <InfoChip label="Büküm R" value={`${bendRadius} mm`} />
            <InfoChip label="K Faktörü" value={String(kFactor)} />
            <InfoChip label="Min Kenar" value={`${minEdge} mm`} />
            <InfoChip label="Min Büküm" value={`${minBend} mm`} />
            <InfoChip label="Delik Çapı" value={useSlot ? `${slotL}×${slotW} mm` : `Ø ${holeDiam} mm`} />
            <InfoChip label="Kalınlık (t)" value={val(settings?.main_thickness_mm)} />
          </div>
        </section>

        {/* Büküm kesit diyagramı */}
        <section className="table-card">
          <h3 style={{ margin: "0 0 0.75rem" }}>Büküm Kesit Diyagramı</h3>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "0 0 0.5rem" }}>
            Parametreler değiştikçe canlı güncellenir
          </p>
          <BukumDiyagrami R={bendRadius} t={mainThickness} k={kFactor} />
        </section>

        {/* Delik / slot diyagramı */}
        <section className="table-card">
          <h3 style={{ margin: "0 0 0.75rem" }}>
            {useSlot ? "Slot Delik Diyagramı" : "Yuvarlak Delik Diyagramı"}
          </h3>
          <p style={{ fontSize: "0.78rem", color: "var(--muted)", margin: "0 0 0.5rem" }}>
            Mesafe kısıtları ve delik geometrisi
          </p>
          <DelikDiyagrami
            minEdge={minEdge}
            minBend={minBend}
            holeDiam={holeDiam}
            useSlot={useSlot}
            slotW={slotW}
            slotL={slotL}
          />
        </section>
      </div>
    </div>
  );
}
