import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../api/client";
import { PanelCanvas } from "../components/canvas/PanelCanvas";
import { useProjectStore } from "../store/useProjectStore";
import type { ProjectDevice } from "../types";

export function LayoutEditorPage() {
  const projectId = useProjectStore((state) => state.activeProjectId);
  const queryClient = useQueryClient();

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

  const mutation = useMutation({
    mutationFn: (device: ProjectDevice) =>
      client.updateProjectDevice(projectId as number, device.id, {
        project_panel_id: device.project_panel_id,
        device_id: device.device_id,
        label: device.label,
        x_mm: device.x_mm,
        y_mm: device.y_mm,
        rotation_deg: device.rotation_deg,
        quantity: device.quantity,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project-devices", projectId] });
    },
  });

  return (
    <section className="card">
      <div className="section-header">
        <h1>2D Yerlesim Editoru</h1>
      </div>
      <p className="helper-text">Cihazlari surukleyerek pano icinde konumlandirin.</p>
      <PanelCanvas
        panel={panelQuery.data}
        devices={devicesQuery.data}
        onDeviceMove={(device, x, y) => mutation.mutate({ ...device, x_mm: x, y_mm: y })}
      />
    </section>
  );
}
