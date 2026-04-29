import { useQuery } from "@tanstack/react-query";

import { client } from "../api/client";
import { PanelCanvas } from "../components/canvas/PanelCanvas";
import { useProjectStore } from "../store/useProjectStore";

export function DrawingPage() {
  const projectId = useProjectStore((state) => state.activeProjectId);
  const panelQuery = useQuery({
    queryKey: ["panel", projectId],
    queryFn: () => client.getPanel(projectId as number),
    enabled: !!projectId,
  });
  const devicesQuery = useQuery({
    queryKey: ["project-devices", projectId],
    queryFn: () => client.listProjectDevices(projectId as number),
    enabled: !!projectId,
  });
  const resultsQuery = useQuery({
    queryKey: ["results", projectId],
    queryFn: () => client.getResults(projectId as number),
    enabled: !!projectId,
  });

  return (
    <section className="card">
      <div className="section-header">
        <h1>2D Cizim</h1>
      </div>
      <PanelCanvas panel={panelQuery.data} devices={devicesQuery.data} busbars={resultsQuery.data?.busbars} />
    </section>
  );
}
