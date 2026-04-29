import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { client } from "../api/client";
import { useProjectStore } from "../store/useProjectStore";

export function CalculationCheckPage() {
  const projectId = useProjectStore((state) => state.activeProjectId);
  const navigate = useNavigate();

  const validationQuery = useQuery({
    queryKey: ["validation", projectId],
    queryFn: () => client.validateProject(projectId as number),
    enabled: !!projectId,
  });

  const calculationMutation = useMutation({
    mutationFn: () => client.calculateProject(projectId as number),
    onSuccess: () => navigate("/results"),
  });

  if (!projectId) {
    return <div className="empty-state">Kontrol icin once proje secin.</div>;
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="section-header">
          <h1>Hesaplama Kontrolu</h1>
        </div>
        <div className="status-grid">
          <article className={`status-card ${validationQuery.data?.can_calculate ? "ok" : "warn"}`}>
            <strong>{validationQuery.data?.can_calculate ? "Hesaplama hazir" : "Eksikler var"}</strong>
            <span>{validationQuery.data?.can_calculate ? "Calistirabilirsiniz." : "Asagidaki alanlari tamamlayin."}</span>
          </article>
        </div>
      </section>

      <section className="card">
        <h2>Eksik Veriler</h2>
        <ul className="plain-list">
          {validationQuery.data?.missing_fields.map((item) => (
            <li key={item}>{item}</li>
          ))}
          {!validationQuery.data?.missing_fields.length && <li>Eksik veri bulunmuyor.</li>}
        </ul>
      </section>

      <section className="card">
        <h2>Uyarilar</h2>
        <ul className="plain-list">
          {validationQuery.data?.warnings.map((item) => (
            <li key={item}>{item}</li>
          ))}
          {!validationQuery.data?.warnings.length && <li>Uyari yok.</li>}
        </ul>
        <div className="form-actions">
          <button disabled={!validationQuery.data?.can_calculate} onClick={() => calculationMutation.mutate()}>
            Calistir
          </button>
        </div>
      </section>
    </div>
  );
}
