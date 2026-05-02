import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { client } from "../api/client";
import { ConfirmModal } from "../components/ConfirmModal";
import { Modal } from "../components/Modal";
import { DeviceTechDrawing } from "../components/DeviceTechDrawing";
import type { Device, DeviceImportPreview } from "../types";

function fmtDate(value?: string): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("tr-TR");
}

export function DeviceDefinitionsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [viewingDevice, setViewingDevice] = useState<Device | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [search, setSearch] = useState<string>(localStorage.getItem("device-search") ?? "");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<DeviceImportPreview | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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
        setDeleteError(error.response.data?.detail ?? "Bu cihaz bir projede kullaniliyor, silinemez.");
      } else {
        setDeleteError("Silme islemi basarisiz oldu.");
      }
    },
  });

  const previewImportMutation = useMutation({
    mutationFn: client.previewDevicesImport,
    onSuccess: (data) => {
      setImportPreview(data);
      setImportError(null);
    },
    onError: () => {
      setImportPreview(null);
      setImportError("Excel dosyasi onizlenemedi.");
    },
  });

  const importMutation = useMutation({
    mutationFn: client.importDevicesExcel,
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["devices"] });
      setImportNotice(`${data.created_device_count} cihaz ve ${data.created_terminal_count} terminal eklendi.`);
      setImportModalOpen(false);
      setImportFile(null);
      setImportPreview(null);
      setImportError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: unknown) => {
      if (axios.isAxiosError(error)) {
        setImportError(error.response?.data?.detail ?? "Excel iceri aktarma basarisiz oldu.");
      } else {
        setImportError("Excel iceri aktarma basarisiz oldu.");
      }
    },
  });

  function handleDelete(deviceId: number, deviceName: string) {
    setDeleteError(null);
    setConfirmPending({
      message: `"${deviceName}" cihazini silmek istediginizden emin misiniz?`,
      onConfirm: () => {
        deleteMutation.mutate(deviceId);
        setConfirmPending(null);
      },
    });
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    localStorage.setItem("device-search", value);
  }

  async function handleFileSelected(file: File | null) {
    setImportFile(file);
    setImportPreview(null);
    setImportError(null);
    if (!file) {
      return;
    }
    await previewImportMutation.mutateAsync(file);
  }

  const allDevices = devicesQuery.data ?? [];
  const filtered = allDevices.filter((device) => {
    if (!search) return true;
    return [device.brand, device.model, device.device_type].some((value) =>
      value.toLowerCase().includes(search.toLowerCase()),
    );
  });

  return (
    <div className="stack">
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanimlamalar</span>
          <h1>Cihaz Tanimlama</h1>
          <p>Cihaz kutuphanesini yonetin. Tablo ustunden filtreleyin, export alin ve toplu import yapin.</p>
        </div>
        <button type="button" onClick={() => navigate("/definitions/devices/new")}>
          + Yeni Cihaz
        </button>
      </section>

      {deleteError && <div className="alert alert-warning">{deleteError}</div>}
      {importNotice && <div className="alert alert-info">{importNotice}</div>}

      <section className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <input
            type="search"
            placeholder="Marka, model veya tip ara..."
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            style={{ flex: 1, maxWidth: "320px" }}
          />
          {search && (
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              {filtered.length} / {allDevices.length} kayit
            </span>
          )}
          <div style={{ display: "flex", gap: "0.6rem", marginLeft: "auto", flexWrap: "wrap" }}>
            <a className="btn-inline ghost" href={client.exportDevicesExcelUrl()}>
              Excel'e Aktar
            </a>
            <a className="btn-inline ghost" href={client.importDevicesTemplateUrl()}>
              Ornek Sablon Indir
            </a>
            <button type="button" className="ghost" onClick={() => setImportModalOpen(true)}>
              Excel'den Iceri Aktar
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ padding: "0.5rem 0.65rem" }}>Marka</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Model</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Tip</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Kasa</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Kutup</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Akim (A)</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>W x H x D (mm)</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Terminal</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Olusturma</th>
                <th style={{ padding: "0.5rem 0.65rem" }}>Revizyon</th>
                <th
                  style={{
                    padding: "0.5rem 0.9rem",
                    borderLeft: "2px solid var(--line)",
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  Islem
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((device) => (
                <tr key={device.id}>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{device.brand}</td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{device.model}</td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{device.device_type}</td>
                  <td style={{ padding: "0.45rem 0.65rem", color: "var(--muted)", fontSize: "0.85rem" }}>
                    {device.enclosure_type ?? "-"}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{device.poles}</td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{device.current_a ?? "-"}</td>
                  <td style={{ padding: "0.45rem 0.65rem", fontVariantNumeric: "tabular-nums", fontSize: "0.85rem" }}>
                    {device.width_mm} x {device.height_mm} x {device.depth_mm ?? 0}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem" }}>{device.terminals.length}</td>
                  <td style={{ padding: "0.45rem 0.65rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                    {fmtDate(device.created_at)}
                  </td>
                  <td style={{ padding: "0.45rem 0.65rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                    {fmtDate(device.updated_at)}
                  </td>
                  <td
                    className="actions-cell"
                    style={{
                      padding: "0.45rem 0.9rem",
                      borderLeft: "2px solid var(--line)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <button type="button" className="ghost" onClick={() => setViewingDevice(device)}>
                      Goruntule
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => navigate(`/definitions/devices/new?clone=${device.id}`)}
                    >
                      Kopyala
                    </button>
                    <button type="button" className="ghost" onClick={() => navigate(`/definitions/devices/${device.id}`)}>
                      Duzenle
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      disabled={deleteMutation.isPending}
                      onClick={() => handleDelete(device.id, `${device.brand} ${device.model}`)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={11}>
                    <div className="empty-state">{search ? "Arama kriterine uygun cihaz bulunamadi." : "Tanimli cihaz yok."}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        title={viewingDevice ? `Teknik Cizim - ${viewingDevice.brand} ${viewingDevice.model}` : ""}
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
              <span>
                <strong style={{ color: "var(--text)" }}>{viewingDevice.device_type}</strong>
              </span>
              {viewingDevice.enclosure_type && (
                <span>
                  Kasa: <strong style={{ color: "var(--text)" }}>{viewingDevice.enclosure_type}</strong>
                </span>
              )}
              <span>
                Kutup: <strong style={{ color: "var(--text)" }}>{viewingDevice.poles}</strong>
              </span>
              <span>
                Akim: <strong style={{ color: "var(--text)" }}>{viewingDevice.current_a ?? "-"} A</strong>
              </span>
              <span>
                Boyut: <strong style={{ color: "var(--text)" }}>{viewingDevice.width_mm} x {viewingDevice.height_mm} x {viewingDevice.depth_mm ?? 0} mm</strong>
              </span>
              <span>
                Terminal: <strong style={{ color: "var(--text)" }}>{viewingDevice.terminals.length}</strong>
              </span>
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

      <Modal
        title="Excel'den Toplu Cihaz Iceri Aktar"
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      >
        <div className="stack">
          <p className="helper-text" style={{ marginTop: 0 }}>
            Dolu ornek sablonu indirip duzenleyin, sonra ayni yapidaki Excel dosyasini yukleyin.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <a className="btn-inline ghost" href={client.importDevicesTemplateUrl()}>
              Ornek Sablon Indir
            </a>
            <a className="btn-inline ghost" href={client.exportDevicesExcelUrl()}>
              Mevcut Kutuphaneyi Excel'e Aktar
            </a>
          </div>
          <label className="field">
            <span>Excel Dosyasi</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void handleFileSelected(file);
              }}
            />
          </label>
          {previewImportMutation.isPending && <div className="alert alert-info">Excel dosyasi analiz ediliyor...</div>}
          {importError && <div className="alert alert-warning">{importError}</div>}
          {importPreview && (
            <div className="stack">
              <div className="summary-grid">
                <div className="summary-card">
                  <span>Cihaz</span>
                  <strong>{importPreview.device_count}</strong>
                </div>
                <div className="summary-card">
                  <span>Terminal</span>
                  <strong>{importPreview.terminal_count}</strong>
                </div>
                <div className="summary-card">
                  <span>Hata</span>
                  <strong>{importPreview.errors.length}</strong>
                </div>
              </div>
              {!!importPreview.devices.length && (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Kod</th>
                        <th>Marka</th>
                        <th>Model</th>
                        <th>Tip</th>
                        <th>Kutup</th>
                        <th>Terminal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.devices.map((row) => (
                        <tr key={row.device_code}>
                          <td>{row.device_code}</td>
                          <td>{row.brand}</td>
                          <td>{row.model}</td>
                          <td>{row.device_type}</td>
                          <td>{row.poles}</td>
                          <td>{row.terminal_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!!importPreview.errors.length && (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Sayfa</th>
                        <th>Satir</th>
                        <th>Hata</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.errors.map((error, index) => (
                        <tr key={`${error.sheet}-${error.row}-${index}`}>
                          <td>{error.sheet}</td>
                          <td>{error.row}</td>
                          <td>{error.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={!importFile || !importPreview?.can_import || importMutation.isPending}
              onClick={() => {
                if (importFile) {
                  importMutation.mutate(importFile);
                }
              }}
            >
              {importMutation.isPending ? "Iceri Aktariliyor..." : "Iceri Aktar"}
            </button>
            <button type="button" className="ghost" onClick={() => setImportModalOpen(false)}>
              Kapat
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={confirmPending !== null}
        message={confirmPending?.message ?? ""}
        onConfirm={() => confirmPending?.onConfirm()}
        onCancel={() => setConfirmPending(null)}
      />
    </div>
  );
}
