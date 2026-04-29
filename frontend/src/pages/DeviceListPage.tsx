import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../api/client";
import { DeviceForm } from "../components/forms/DeviceForm";
import { useProjectStore } from "../store/useProjectStore";

export function DeviceListPage() {
  const projectId = useProjectStore((state) => state.activeProjectId);
  const queryClient = useQueryClient();
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [label, setLabel] = useState("ANA-Q1");
  const [x, setX] = useState(180);
  const [y, setY] = useState(220);

  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: client.listDevices,
  });

  const projectDevicesQuery = useQuery({
    queryKey: ["project-devices", projectId],
    queryFn: () => client.listProjectDevices(projectId as number),
    enabled: !!projectId,
  });

  const createDeviceMutation = useMutation({
    mutationFn: client.createDevice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  const placeDeviceMutation = useMutation({
    mutationFn: () =>
      client.createProjectDevice(projectId as number, {
        project_panel_id: null,
        device_id: selectedDeviceId as number,
        label,
        x_mm: x,
        y_mm: y,
        rotation_deg: 0,
        quantity: 1,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["project-devices", projectId] });
    },
  });

  return (
    <div className="page-grid">
      <section className="card">
        <div className="section-header">
          <h1>Cihaz Kutuphanesi</h1>
        </div>
        <DeviceForm onSubmit={createDeviceMutation.mutateAsync} />
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Proje Icine Ekle</h2>
        </div>
        {!projectId && <div className="empty-state">Yerlesim icin once proje secin.</div>}
        {projectId && (
          <form
            className="stack"
            onSubmit={(event) => {
              event.preventDefault();
              placeDeviceMutation.mutate();
            }}
          >
            <label>
              <span>Cihaz sec</span>
              <select value={selectedDeviceId ?? ""} onChange={(event) => setSelectedDeviceId(Number(event.target.value))}>
                <option value="">Seciniz</option>
                {devicesQuery.data?.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.brand} {device.model} - {device.device_type}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Etiket</span>
              <input value={label} onChange={(event) => setLabel(event.target.value)} />
            </label>
            <div className="inline-grid">
              <label>
                <span>X</span>
                <input type="number" value={x} onChange={(event) => setX(Number(event.target.value))} />
              </label>
              <label>
                <span>Y</span>
                <input type="number" value={y} onChange={(event) => setY(Number(event.target.value))} />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" disabled={!selectedDeviceId}>
                Pano icine yerlestir
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Yerlestirilen Cihazlar</h2>
        </div>
        <div className="list-stack">
          {projectDevicesQuery.data?.map((device) => (
            <article key={device.id} className="list-card static">
              <strong>{device.label}</strong>
              <span>
                {device.device.brand} {device.device.model}
              </span>
              <small>
                X: {device.x_mm} / Y: {device.y_mm}
              </small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
