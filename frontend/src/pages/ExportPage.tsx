import { client } from "../api/client";
import { useProjectStore } from "../store/useProjectStore";

export function ExportPage() {
  const projectId = useProjectStore((state) => state.activeProjectId);

  if (!projectId) {
    return <div className="empty-state">Cikti almak icin once proje secin.</div>;
  }

  return (
    <section className="card">
      <div className="section-header">
        <h1>Imalat Ciktilari</h1>
      </div>
      <div className="export-grid">
        <a className="export-card" href={client.exportUrl(projectId, "pdf")} target="_blank" rel="noreferrer">
          <strong>PDF</strong>
          <span>Imalat foyu olustur</span>
        </a>
        <a className="export-card" href={client.exportUrl(projectId, "excel")} target="_blank" rel="noreferrer">
          <strong>Excel</strong>
          <span>Parca listesi indir</span>
        </a>
        <a className="export-card" href={client.exportUrl(projectId, "csv")} target="_blank" rel="noreferrer">
          <strong>CSV</strong>
          <span>Tablo verisini aktar</span>
        </a>
        <a className="export-card" href={client.exportUrl(projectId, "dxf")} target="_blank" rel="noreferrer">
          <strong>DXF</strong>
          <span>2D geometriyi al</span>
        </a>
      </div>
    </section>
  );
}
