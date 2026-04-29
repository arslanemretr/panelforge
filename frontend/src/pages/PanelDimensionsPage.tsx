import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../api/client";
import { PanelForm } from "../components/forms/PanelForm";
import { useProjectStore } from "../store/useProjectStore";
import type { Panel } from "../types";

export function PanelDimensionsPage() {
  const projectId = useProjectStore((state) => state.activeProjectId);
  const queryClient = useQueryClient();

  const panelQuery = useQuery({
    queryKey: ["panel", projectId],
    queryFn: () => client.getPanel(projectId as number),
    enabled: !!projectId,
  });

  const mutation = useMutation({
    mutationFn: (payload: Panel) => client.upsertPanel(projectId as number, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["panel", projectId] });
    },
  });

  if (!projectId) {
    return <div className="empty-state">Panel olculerini girmek icin once proje secin.</div>;
  }

  return (
    <section className="card">
      <div className="section-header">
        <h1>Pano Olculeri</h1>
      </div>
      <PanelForm initialValue={panelQuery.data} onSubmit={mutation.mutateAsync} />
    </section>
  );
}
