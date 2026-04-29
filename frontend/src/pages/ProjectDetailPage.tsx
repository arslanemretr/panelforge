import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../api/client";
import { useProjectStore } from "../store/useProjectStore";

export function ProjectDetailPage() {
  const projectId = useProjectStore((state) => state.activeProjectId);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => client.getProject(projectId as number),
    enabled: !!projectId,
  });

  const mutation = useMutation({
    mutationFn: () =>
      client.updateProject(projectId as number, {
        name: projectQuery.data?.name,
        customer_name: projectQuery.data?.customer_name,
        panel_code: projectQuery.data?.panel_code,
        prepared_by: projectQuery.data?.prepared_by,
        description: message || projectQuery.data?.description,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  if (!projectId) {
    return <div className="empty-state">Soldaki akisa devam etmek icin once bir proje secin.</div>;
  }

  const project = projectQuery.data;

  return (
    <div className="stack">
      <section className="card">
        <span className="eyebrow">Proje Bilgileri</span>
        <h1>{project?.name}</h1>
        <p>{project?.customer_name}</p>
        <div className="meta-grid">
          <div>
            <span>Pano Kodu</span>
            <strong>{project?.panel_code ?? "-"}</strong>
          </div>
          <div>
            <span>Hazirlayan</span>
            <strong>{project?.prepared_by ?? "-"}</strong>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Aciklama / Notlar</h2>
        </div>
        <textarea
          rows={5}
          value={message}
          placeholder={project?.description ?? "Bu proje icin teknik notlar..."}
          onChange={(event) => setMessage(event.target.value)}
        />
        <div className="form-actions">
          <button onClick={() => mutation.mutate()}>Notlari kaydet</button>
        </div>
      </section>
    </div>
  );
}
