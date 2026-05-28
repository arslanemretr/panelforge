import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../../api/client";
import { Modal } from "../Modal";
import { BendTable } from "../results/BendTable";
import { BusbarBentView } from "../results/BusbarBentView";
import { BusbarDrawing } from "../results/BusbarDrawing";
import { BusbarTable } from "../results/BusbarTable";
import { HoleTable } from "../results/HoleTable";
import { SummaryCards } from "../results/SummaryCards";
import { TechnicalDrawingView } from "./TechnicalDrawingView";
import type { Busbar, CalculationSummary } from "../../types";

// ── Faz renkleri (yerel) ─────────────────────────────────────────────────────
const PHASE_COLORS_MAP: Record<string, string> = {
  L1: "#e53935", L2: "#f9a825", L3: "#1565c0", N: "#616161", PE: "#388e3c",
};

// ── Malzeme Dağılım Görsel ───────────────────────────────────────────────────
function MaterialBreakdownView({ busbars, summary }: { busbars: Busbar[]; summary: CalculationSummary }) {
  const mainBars   = busbars.filter((b) => b.busbar_type === "main");
  const branchBars = busbars.filter((b) => b.busbar_type !== "main");

  const mainLen   = mainBars.reduce((s, b) => s + Number(b.cut_length_mm), 0);
  const branchLen = branchBars.reduce((s, b) => s + Number(b.cut_length_mm), 0);
  const totalLen  = Math.max(mainLen + branchLen, 1);

  const mainHoles   = mainBars.reduce((s, b) => s + b.holes.length, 0);
  const branchHoles = branchBars.reduce((s, b) => s + b.holes.length, 0);
  const totalHoles  = Math.max(mainHoles + branchHoles, 1);

  const mainBends   = mainBars.reduce((s, b) => s + b.bends.length, 0);
  const branchBends = branchBars.reduce((s, b) => s + b.bends.length, 0);

  const BAR_W = 200; // maksimum bar genişliği px

  function row(
    label: string, color: string,
    count: number, len: number, holes: number, bends: number, total: number,
  ) {
    const barPx = Math.round((len / total) * BAR_W);
    return (
      <g>
        {/* Etiket */}
        <text fill="#94a3b8" fontSize={10} fontWeight={700}>{label}</text>
        {/* Boş arka plan */}
        <rect y={14} width={BAR_W} height={14} fill="#1e293b" rx={3} />
        {/* Dolu bar */}
        <rect y={14} width={barPx} height={14} fill={color} rx={3} opacity={0.85} />
        {/* Değer metni */}
        <text y={25} x={barPx + 6} fill={color} fontSize={9} fontWeight={600}>
          {len.toFixed(0)} mm
        </text>
        {/* İkincil bilgi */}
        <text y={38} fill="#475569" fontSize={9}>
          {count} parça · {holes} delik · {bends} büküm
        </text>
      </g>
    );
  }

  return (
    <svg
      viewBox="0 0 420 120"
      width="100%"
      style={{ display: "block" }}
      fontFamily="'Segoe UI', system-ui, monospace"
    >
      <rect width={420} height={120} fill="#0d1117" rx={8} />

      {/* Ana Bakır satırı */}
      <g transform="translate(16, 14)">
        {row("Ana Bakır", "#e65100", mainBars.length, mainLen, mainHoles, mainBends, totalLen)}
      </g>

      {/* Tali Bakır satırı */}
      <g transform="translate(16, 68)">
        {row("Tali Bakır", "#1565c0", branchBars.length, branchLen, branchHoles, branchBends, totalLen)}
      </g>

      {/* Toplam bilgiler (sağda) */}
      <g transform="translate(248, 14)">
        <rect width={156} height={92} fill="#1a1f2b" rx={6} />
        <text x={10} y={18} fill="#475569" fontSize={9}>Toplam Kesim Boyu</text>
        <text x={10} y={32} fill="#94a3b8" fontSize={13} fontWeight={700}>
          {(totalLen / 1000).toFixed(2)} m
        </text>
        <text x={10} y={50} fill="#475569" fontSize={9}>Toplam Ağırlık</text>
        <text x={10} y={64} fill="#94a3b8" fontSize={13} fontWeight={700}>
          {Number(summary.total_weight_kg).toFixed(2)} kg
        </text>
        <text x={10} y={82} fill="#475569" fontSize={9}>
          {summary.main_busbar_count} ana · {summary.branch_busbar_count} tali parça
        </text>
      </g>
    </svg>
  );
}

// ── Bara Önizleme Galerisi ───────────────────────────────────────────────────
function BusbarGallery({ busbars, onSelect }: { busbars: Busbar[]; onSelect: (b: Busbar) => void }) {
  if (busbars.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "0.5rem" }}>
      {busbars.map((b) => {
        const phaseColor = PHASE_COLORS_MAP[b.phase] ?? "#888";
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b)}
            title={`${b.part_no} — ${b.name}`}
            style={{
              background: "var(--panel-strong)",
              border: `1.5px solid ${phaseColor}55`,
              borderRadius: 8,
              padding: "0.5rem 0.6rem",
              cursor: "pointer",
              textAlign: "left",
              minWidth: 150,
              maxWidth: 200,
              flex: "1 1 150px",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = phaseColor)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${phaseColor}55`)}
          >
            {/* Mini bara çizimi */}
            <div style={{
              background: "#fff",
              borderRadius: 4,
              padding: "2px 4px",
              marginBottom: "0.4rem",
              overflow: "hidden",
              maxHeight: 60,
            }}>
              <BusbarDrawing busbar={b} />
            </div>

            {/* Etiket satırı */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.25rem" }}>
              <span style={{
                fontFamily: "monospace", fontSize: "0.75rem", fontWeight: 700,
                color: "var(--text)",
              }}>
                {b.part_no}
              </span>
              <span style={{
                padding: "1px 6px", borderRadius: 4, fontSize: "0.72rem", fontWeight: 700,
                background: `${phaseColor}22`, color: phaseColor,
                fontFamily: "monospace",
              }}>
                {b.phase}
              </span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>
              {b.cut_length_mm} mm · {b.holes.length} delik · {b.bends.length} büküm
            </div>
          </button>
        );
      })}
    </div>
  );
}

interface ResultsTabProps {
  projectId: number;
}

function Collapsible({
  title,
  badge,
  children,
  defaultOpen = true,
}: {
  title: string;
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="table-card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          padding: "0.9rem 1.2rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          borderBottom: open ? "1px solid var(--line)" : "none",
          color: "var(--text)",
        }}
      >
        <span style={{ fontSize: "1rem", lineHeight: 1, color: "var(--text)" }}>{open ? "▾" : "▸"}</span>
        <h3 style={{ margin: 0, color: "var(--text)" }}>{title}</h3>
        {badge && (
          <span
            style={{
              marginLeft: "auto",
              background: "var(--accent-soft)",
              color: "var(--accent)",
              borderRadius: 20,
              padding: "2px 10px",
              fontSize: "0.78rem",
              fontWeight: 600,
            }}
          >
            {badge}
          </span>
        )}
      </button>
      {open && <div style={{ padding: "1rem 1.2rem" }}>{children}</div>}
    </section>
  );
}

export function ResultsTab({ projectId }: ResultsTabProps) {
  const queryClient = useQueryClient();
  const [selectedBusbar, setSelectedBusbar] = useState<Busbar | null>(null);

  const validationQuery = useQuery({
    queryKey: ["validation", projectId],
    queryFn: () => client.validateProject(projectId),
  });
  const resultsQuery = useQuery({
    queryKey: ["results", projectId],
    queryFn: () => client.getResults(projectId),
  });
  const panelQuery = useQuery({
    queryKey: ["panel", projectId],
    queryFn: () => client.getPanel(projectId),
  });
  const projectPanelsQuery = useQuery({
    queryKey: ["project-panels", projectId],
    queryFn: () => client.listProjectPanels(projectId),
  });
  const devicesQuery = useQuery({
    queryKey: ["project-devices", projectId],
    queryFn: () => client.listProjectDevices(projectId),
  });
  const copperSettingsQuery = useQuery({
    queryKey: ["copper-settings", projectId],
    queryFn: () => client.getCopperSettings(projectId),
  });

  const calculateMutation = useMutation({
    mutationFn: () => client.calculateProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["results", projectId] });
      queryClient.invalidateQueries({ queryKey: ["validation", projectId] });
    },
  });

  const validation = validationQuery.data;
  const results = resultsQuery.data;
  const canCalculate = validation?.can_calculate ?? false;
  const hasResults = (results?.busbars.length ?? 0) > 0;

  return (
    <>
      <div className="stack">
        <section className="table-card">
          <div
            className="section-header"
            style={{
              marginBottom: validation && (validation.missing_fields.length > 0 || validation.warnings.length > 0) ? "1rem" : 0,
            }}
          >
            <div>
              <h3 style={{ marginBottom: "0.2rem" }}>Hesaplama</h3>
              <span className="helper-text" style={{ fontSize: "0.82rem" }}>
                {canCalculate ? "Tum gerekli veriler hazir." : "Hesaplama icin eksik veri var."}
              </span>
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!canCalculate || calculateMutation.isPending}
              onClick={() => calculateMutation.mutate()}
              style={{ minWidth: 140 }}
            >
              {calculateMutation.isPending ? "Hesaplaniyor..." : "Hesapla"}
            </button>
          </div>

          {validation && (
            <>
              {validation.missing_fields.length > 0 && (
                <div className="alert alert-warning" style={{ marginTop: "0.75rem" }}>
                  <strong>Eksik alanlar:</strong>
                  <ul style={{ margin: "0.25rem 0 0 1rem", paddingLeft: 0 }}>
                    {validation.missing_fields.map((field) => (
                      <li key={field} style={{ marginBottom: "0.15rem" }}>
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div className="alert alert-info" style={{ marginTop: "0.75rem" }}>
                  <strong>Uyarilar:</strong>
                  <ul style={{ margin: "0.25rem 0 0 1rem", paddingLeft: 0 }}>
                    {validation.warnings.map((warning, index) => (
                      <li key={index} style={{ marginBottom: "0.15rem" }}>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {calculateMutation.isSuccess && (
                <div
                  className="alert"
                  style={{
                    marginTop: "0.75rem",
                    background: "rgba(21,128,61,0.08)",
                    border: "1px solid rgba(21,128,61,0.25)",
                    color: "#15803d",
                  }}
                >
                  Hesaplama tamamlandi.
                </div>
              )}
            </>
          )}
        </section>

        {hasResults && (
          <section className="table-card">
            <div className="section-header" style={{ marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h3 style={{ marginBottom: 0 }}>Hesaplama Ozeti</h3>
                {results!.warnings.length > 0 && (
                  <span
                    style={{
                      background: "rgba(220,38,38,0.12)",
                      color: "#dc2626",
                      borderRadius: 20,
                      padding: "2px 10px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    ⚠ {results!.warnings.length} geometri ihlali
                  </span>
                )}
              </div>
            </div>
            <SummaryCards summary={results!.summary} />

            {/* Malzeme Dağılımı Görsel */}
            <div style={{ marginTop: "1rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.4rem", fontWeight: 600 }}>
                Malzeme Dağılımı
              </div>
              <MaterialBreakdownView busbars={results!.busbars} summary={results!.summary} />
            </div>

            {results!.warnings.length > 0 && (
              <div
                style={{
                  marginTop: "1rem",
                  border: "1px solid rgba(220,38,38,0.30)",
                  borderRadius: 8,
                  background: "rgba(220,38,38,0.06)",
                  padding: "0.8rem 1rem",
                }}
              >
                <strong style={{ color: "#dc2626", display: "block", marginBottom: "0.4rem" }}>
                  ⚠ Geometri dogrulama ihlalleri
                </strong>
                <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                  {results!.warnings.map((warning, index) => (
                    <li key={index} style={{ marginBottom: "0.2rem", fontSize: "0.88rem", color: "var(--text)" }}>
                      {warning}
                    </li>
                  ))}
                </ul>
                <p style={{ margin: "0.6rem 0 0", fontSize: "0.8rem", color: "var(--muted)" }}>
                  Parametreler sekmesinden bogaz mesafelerini artirarak bu ihlalleri giderin.
                </p>
              </div>
            )}
          </section>
        )}

        {hasResults && (
          <Collapsible title="Bakir Parca Tablosu" badge={`${results!.busbars.length} parca`}>
            <BusbarTable busbars={results!.busbars} onView={setSelectedBusbar} />
            {/* Bara Önizleme Galerisi */}
            <div style={{ marginTop: "1rem", borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: "0.5rem", fontWeight: 600 }}>
                Bara Önizlemeleri — Tıklanınca Detay Açılır
              </div>
              <BusbarGallery busbars={results!.busbars} onSelect={setSelectedBusbar} />
            </div>
          </Collapsible>
        )}

        {hasResults && results!.summary.total_hole_count > 0 && (
          <Collapsible title="Delik Listesi" badge={`${results!.summary.total_hole_count} delik`} defaultOpen={false}>
            <HoleTable busbars={results!.busbars} />
          </Collapsible>
        )}

        {hasResults && results!.summary.total_bend_count > 0 && (
          <Collapsible title="Bukum Listesi" badge={`${results!.summary.total_bend_count} bukum`} defaultOpen={false}>
            <BendTable busbars={results!.busbars} />
          </Collapsible>
        )}

        {hasResults && (
          <section className="table-card">
            <div className="section-header" style={{ marginBottom: "1rem" }}>
              <div>
                <h3 style={{ marginBottom: "0.2rem" }}>Disa Aktar</h3>
                <span className="helper-text" style={{ fontSize: "0.82rem" }}>
                  Son hesap sonucu PDF, Excel, DXF ve CSV olarak indirilebilir.
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {(
                [
                  { type: "pdf", label: "PDF", color: "#dc2626" },
                  { type: "excel", label: "Excel", color: "#16a34a" },
                  { type: "dxf", label: "DXF", color: "#2563eb" },
                  { type: "csv", label: "CSV", color: "#7c3aed" },
                ] as const
              ).map(({ type, label, color }) => (
                <a
                  key={type}
                  className="btn-primary"
                  href={client.exportUrl(projectId, type)}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    background: color,
                    border: "none",
                    textDecoration: "none",
                    padding: "0.6rem 1.2rem",
                    borderRadius: 8,
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#fff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  {label}
                </a>
              ))}
            </div>
          </section>
        )}

        {hasResults && (
          <TechnicalDrawingView
            panel={panelQuery.data}
            projectPanels={projectPanelsQuery.data ?? []}
            devices={devicesQuery.data ?? []}
            copperSettings={copperSettingsQuery.data}
            busbars={results!.busbars}
            title="Pano Teknik Görünümü"
          />
        )}

        {results && !hasResults && (
          <div className="empty-state" style={{ padding: "3rem 0" }}>
            Sonuc bulunamadi. Parametreleri kontrol edip tekrar hesaplayin.
          </div>
        )}
      </div>

      <Modal
        title={selectedBusbar ? `${selectedBusbar.part_no} Parca Detayi` : "Parca Detayi"}
        open={selectedBusbar !== null}
        onClose={() => setSelectedBusbar(null)}
      >
        {selectedBusbar && (
          <div className="modal-body">
            <div className="summary-grid" style={{ marginBottom: "1rem" }}>
              <div className="summary-card">
                <span>Tip</span>
                <strong>{selectedBusbar.busbar_type === "main" ? "Ana bakir" : "Tali bakir"}</strong>
              </div>
              <div className="summary-card">
                <span>Bagli cihaz</span>
                <strong>{selectedBusbar.connected_device_label ?? "Ana dagitim"}</strong>
              </div>
              <div className="summary-card">
                <span>Kesit</span>
                <strong>
                  {selectedBusbar.width_mm} x {selectedBusbar.thickness_mm} mm
                </strong>
              </div>
              <div className="summary-card">
                <span>Kesim boyu</span>
                <strong>{selectedBusbar.cut_length_mm} mm</strong>
              </div>
            </div>

            <div className="page-grid">
              <section className="table-card" style={{ padding: "1rem" }}>
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                  <div>
                    <h3 style={{ marginBottom: "0.2rem" }}>Tam Acilim</h3>
                    <span className="helper-text" style={{ fontSize: "0.82rem" }}>
                      Delik koordinatlari ve bukum mesafeleri acilim uzerinde gosterilir.
                    </span>
                  </div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem" }}>
                  <BusbarDrawing busbar={selectedBusbar} />
                </div>
              </section>

              <section className="table-card" style={{ padding: "1rem" }}>
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                  <div>
                    <h3 style={{ marginBottom: "0.2rem" }}>Bukulmus Hali</h3>
                    <span className="helper-text" style={{ fontSize: "0.82rem" }}>
                      Tali bakirin ana bakirdan cihaza giden geometri gorunumu.
                    </span>
                  </div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem" }}>
                  <BusbarBentView busbar={selectedBusbar} />
                </div>
              </section>
            </div>

            <div className="page-grid" style={{ marginTop: "1rem" }}>
              <section className="table-card" style={{ padding: "1rem" }}>
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                  <h3 style={{ margin: 0 }}>Delik Ozeti</h3>
                </div>
                <div className="list-stack">
                  {selectedBusbar.holes.map((hole) => (
                    <div key={hole.hole_no} className="list-card static">
                      <strong style={{ fontFamily: "monospace" }}>
                        H{hole.hole_no} - X:{hole.x_mm} Y:{hole.y_mm}
                      </strong>
                      <span>
                        {hole.slot_width_mm && hole.slot_length_mm
                          ? `${hole.slot_length_mm} x ${hole.slot_width_mm} slot`
                          : `Cap ${hole.diameter_mm ?? "-"}`}
                      </span>
                      <small>{hole.description ?? "Baglanti deligi"}</small>
                    </div>
                  ))}
                </div>
              </section>

              <section className="table-card" style={{ padding: "1rem" }}>
                <div className="section-header" style={{ marginBottom: "0.75rem" }}>
                  <h3 style={{ margin: 0 }}>Bukum Ozeti</h3>
                </div>
                <div className="list-stack">
                  {selectedBusbar.bends.length > 0 ? (
                    selectedBusbar.bends.map((bend) => (
                      <div key={bend.bend_no} className="list-card static">
                        <strong style={{ fontFamily: "monospace" }}>
                          B{bend.bend_no} - {bend.distance_from_start_mm} mm
                        </strong>
                        <span>
                          {bend.angle_deg} deg | {bend.direction} | Ic R {bend.inner_radius_mm} mm
                        </span>
                        <small>{bend.description ?? "Baglanti bukumu"}</small>
                      </div>
                    ))
                  ) : (
                    <div className="list-card static">
                      <strong>Bukum yok</strong>
                      <span>Bu parca duz geometri ile uretilir.</span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
