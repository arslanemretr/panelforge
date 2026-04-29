import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

import { client } from "../api/client";
import { Modal } from "../components/Modal";
import { DeviceForm } from "../components/forms/DeviceForm";
import type { Device } from "../types";

export function DeviceDefinitionsPage() {
  const queryClient = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: client.listDevices,
  });

  const createMutation = useMutation({
    mutationFn: client.createDevice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["devices"] });
      setAddModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Omit<Device, "id"> }) =>
      client.updateDevice(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["devices"] });
      setEditingDevice(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: client.deleteDevice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["devices"] });
      setDeleteError(null);
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setDeleteError(error.response.data?.detail ?? "Bu cihaz bir projede kullanılıyor, silinemez.");
      } else {
        setDeleteError("Silme işlemi başarısız oldu.");
      }
    },
  });

  function handleDelete(deviceId: number) {
    setDeleteError(null);
    deleteMutation.mutate(deviceId);
  }

  return (
    <div className="stack">
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanimlamalar</span>
          <h1>Cihaz Tanimlama</h1>
          <p>Cihaz kutuphanesini tablo halinde yonetin. Yeni cihazlari modal uzerinden ekleyin.</p>
        </div>
        <button type="button" onClick={() => setAddModalOpen(true)}>
          Yeni Cihaz
        </button>
      </section>

      {deleteError && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "rgba(229, 57, 53, 0.1)",
            border: "1px solid rgba(229, 57, 53, 0.4)",
            borderRadius: "8px",
            color: "#e53935",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>⚠️</span>
          <span>{deleteError}</span>
          <button
            type="button"
            className="ghost"
            style={{ marginLeft: "auto", padding: "0.1rem 0.4rem", fontSize: "0.8rem" }}
            onClick={() => setDeleteError(null)}
          >
            ✕
          </button>
        </div>
      )}

      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Marka</th>
                <th>Model</th>
                <th>Tip</th>
                <th>Kutup</th>
                <th>Akim</th>
                <th>Olcu</th>
                <th>Terminal</th>
                <th>Islem</th>
              </tr>
            </thead>
            <tbody>
              {devicesQuery.data?.map((device) => (
                <tr key={device.id}>
                  <td>{device.brand}</td>
                  <td>{device.model}</td>
                  <td>{device.device_type}</td>
                  <td>{device.poles}</td>
                  <td>{device.current_a ?? "-"}</td>
                  <td>
                    {device.width_mm}x{device.height_mm}x{device.depth_mm ?? 0}
                  </td>
                  <td>{device.terminals.length}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setEditingDevice(device)}
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(device.id)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {!devicesQuery.data?.length && (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">Tanimli cihaz yok.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add modal */}
      <Modal title="Yeni Cihaz Tanimla" open={addModalOpen} onClose={() => setAddModalOpen(false)}>
        <DeviceForm onSubmit={createMutation.mutateAsync} />
      </Modal>

      {/* Edit modal */}
      <Modal
        title={editingDevice ? `Düzenle — ${editingDevice.brand} ${editingDevice.model}` : ""}
        open={!!editingDevice}
        onClose={() => setEditingDevice(null)}
      >
        {editingDevice && (
          <DeviceForm
            key={editingDevice.id}
            initialValue={editingDevice}
            onSubmit={async (payload) => {
              await updateMutation.mutateAsync({ id: editingDevice.id, payload });
            }}
          />
        )}
      </Modal>
    </div>
  );
}
