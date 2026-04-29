import { useQuery } from "@tanstack/react-query";

import { client } from "../api/client";
import { SummaryCards } from "../components/results/SummaryCards";
import { BusbarTable } from "../components/results/BusbarTable";
import { HoleTable } from "../components/results/HoleTable";
import { BendTable } from "../components/results/BendTable";
import { useProjectStore } from "../store/useProjectStore";

export function ResultsPage() {
  const projectId = useProjectStore((state) => state.activeProjectId);

  const resultsQuery = useQuery({
    queryKey: ["results", projectId],
    queryFn: () => client.getResults(projectId as number),
    enabled: !!projectId,
  });

  if (!projectId) {
    return <div className="empty-state">Sonuclar icin once proje secin.</div>;
  }

  if (!resultsQuery.data?.busbars.length) {
    return <div className="empty-state">Henuz hesaplama sonucu yok. Kontrol ekranindan hesaplama calistirin.</div>;
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="section-header">
          <h1>Sonuclar</h1>
        </div>
        <SummaryCards summary={resultsQuery.data.summary} />
      </section>
      <BusbarTable busbars={resultsQuery.data.busbars} />
      <HoleTable busbars={resultsQuery.data.busbars} />
      <BendTable busbars={resultsQuery.data.busbars} />
    </div>
  );
}
