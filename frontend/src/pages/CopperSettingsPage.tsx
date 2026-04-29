import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../api/client";
import { CopperSettingsForm } from "../components/forms/CopperSettingsForm";
import { useProjectStore } from "../store/useProjectStore";
import type { CopperSettings } from "../types";

export function CopperSettingsPage() {
  const projectId = useProjectStore((state) => state.activeProjectId);
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ["copper-settings", projectId],
    queryFn: () => client.getCopperSettings(projectId as number),
    enabled: !!projectId,
  });

  const mutation = useMutation({
    mutationFn: (payload: CopperSettings) => client.upsertCopperSettings(projectId as number, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["copper-settings", projectId] });
    },
  });

  if (!projectId) {
    return <div className="empty-state">Bakir ayarlari icin once proje secin.</div>;
  }

  return (
    <section className="card">
      <div className="section-header">
        <h1>Bakir Bilgileri</h1>
      </div>
      <CopperSettingsForm initialValue={settingsQuery.data} onSubmit={mutation.mutateAsync} />
    </section>
  );
}
