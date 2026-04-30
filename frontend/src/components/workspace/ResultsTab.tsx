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
import { DeviceFrontView } from "./DeviceFrontView";
import { DeviceSideView } from "./DeviceSideView";
import { PanelTopView } from "./PanelTopView";
import type { Busbar } from "../../types";

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
              <div>
                <h3 style={{ marginBottom: "0.2rem" }}>Hesaplama Ozeti</h3>
              </div>
            </div>
            <SummaryCards summary={results!.summary} />

            {results!.warnings.length > 0 && (
              <div className="alert alert-warning" style={{ marginTop: "1rem" }}>
                <strong>Hesaplama uyarilari:</strong>
                <ul style={{ margin: "0.25rem 0 0 1rem", paddingLeft: 0 }}>
                  {results!.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {hasResults && (
          <Collapsible title="Bakir Parca Tablosu" badge={`${results!.busbars.length} parca`}>
            <BusbarTable busbars={results!.busbars} onView={setSelectedBusbar} />
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
          <DeviceFrontView
            panel={panelQuery.data}
            projectPanels={projectPanelsQuery.data ?? []}
            devices={devicesQuery.data ?? []}
            copperSettings={copperSettingsQuery.data}
            title="Genel Pano Gorunumu - Cihaz ve Bakir Yerlesimi"
          />
        )}

        {hasResults && (
          <Collapsible title="Pano Gorunum — Yan ve Ust" defaultOpen={false}>
            <div className="view-pair-grid">
              <DeviceSideView
                panel={panelQuery.data}
                projectPanels={projectPanelsQuery.data ?? []}
                devices={devicesQuery.data ?? []}
                busbars={results!.busbars}
              />
              <PanelTopView
                panel={panelQuery.data}
                projectPanels={projectPanelsQuery.data ?? []}
                devices={devicesQuery.data ?? []}
                busbars={results!.busbars}
              />
            </div>
          </Collapsible>
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
