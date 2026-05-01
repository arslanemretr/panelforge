import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { client } from "../api/client";
import { Modal } from "../components/Modal";
import { DeviceTechDrawing } from "../components/DeviceTechDrawing";
import type { Device } from "../types";

export function DeviceDefinitionsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [viewingDevice, setViewingDevice] = useState<Device | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const devicesQuery = useQuery({
    queryKey: ["devices"],
    queryFn: client.listDevices,
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
          <p>Cihaz kutuphanesini yonetin. Detaylı tanımlama için editör sayfasını kullanın.</p>
        </div>
        <button type="button" onClick={() => navigate("/definitions/devices/new")}>
          + Yeni Cihaz
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
                <th>Kasa</th>
                <th>Kutup</th>
                <th>Akim (A)</th>
                <th>Boyut W×H×D (mm)</th>
                <th>Terminal</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {devicesQuery.data?.map((device) => (
                <tr key={device.id}>
                  <td>{device.brand}</td>
                  <td>{device.model}</td>
                  <td>{device.device_type}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    {device.enclosure_type ?? "—"}
                  </td>
                  <td>{device.poles}</td>
                  <td>{device.current_a ?? "—"}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.85rem" }}>
                    {device.width_mm} × {device.height_mm} × {device.depth_mm ?? 0}
                  </td>
                  <td>{device.terminals.length}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => setViewingDevice(device)}
                      title="Teknik çizimi görüntüle"
                    >
                      Görüntüle
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => navigate(`/definitions/devices/${device.id}`)}
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
                  <td colSpan={9}>
                    <div className="empty-state">Tanimli cihaz yok.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Görüntüleme modalı — teknik çizim */}
      <Modal
        title={viewingDevice ? `Teknik Çizim — ${viewingDevice.brand} ${viewingDevice.model}` : ""}
        open={!!viewingDevice}
        onClose={() => setViewingDevice(null)}
      >
        {viewingDevice && (
          <div>
            <div
              style={{
                display: "flex",
                gap: "1.5rem",
                flexWrap: "wrap",
                padding: "0.75rem 0",
                marginBottom: "1rem",
                borderBottom: "1px solid var(--line)",
                fontSize: "0.875rem",
                color: "var(--muted)",
              }}
            >
              <span><strong style={{ color: "var(--text)" }}>{viewingDevice.device_type}</strong></span>
              {viewingDevice.enclosure_type && (
                <span>Kasa: <strong style={{ color: "var(--text)" }}>{viewingDevice.enclosure_type}</strong></span>
              )}
              <span>Kutup: <strong style={{ color: "var(--text)" }}>{viewingDevice.poles}</strong></span>
              <span>Akım: <strong style={{ color: "var(--text)" }}>{viewingDevice.current_a ?? "—"} A</strong></span>
              <span>
                Boyut:{" "}
                <strong style={{ color: "var(--text)" }}>
                  {viewingDevice.width_mm} × {viewingDevice.height_mm} × {viewingDevice.depth_mm ?? 0} mm
                </strong>
              </span>
              <span>Terminal: <strong style={{ color: "var(--text)" }}>{viewingDevice.terminals.length}</strong></span>
            </div>
            <DeviceTechDrawing
              widthMm={Number(viewingDevice.width_mm)}
              heightMm={Number(viewingDevice.height_mm)}
              depthMm={Number(viewingDevice.depth_mm ?? 0)}
              terminals={viewingDevice.terminals}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
