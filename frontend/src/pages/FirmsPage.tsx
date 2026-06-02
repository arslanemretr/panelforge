/**
 * FirmsPage — Firma & Proje Tanımlama
 *
 * Sol panel: Firma listesi + Firma ekleme/düzenleme
 * Sağ panel: Seçili firmanın projeleri + Proje ekleme/düzenleme
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../api/client";
import { ConfirmModal } from "../components/ConfirmModal";
import { Modal } from "../components/Modal";
import type { ClientProject, Firm } from "../types";

// ── Boş taslaklar ─────────────────────────────────────────────────────────────
const EMPTY_FIRM = { name: "", vkn: "", address: "", phone: "", email: "" };
const EMPTY_CP   = { name: "", code: "" };

export function FirmsPage() {
  const queryClient = useQueryClient();

  // ── Seçim state'i ────────────────────────────────────────────────────────────
  const [selectedFirm, setSelectedFirm] = useState<Firm | null>(null);

  // ── Firma modal ──────────────────────────────────────────────────────────────
  const [firmModal, setFirmModal]     = useState(false);
  const [editingFirm, setEditingFirm] = useState<Firm | null>(null);
  const [firmDraft, setFirmDraft]     = useState(EMPTY_FIRM);

  // ── Proje modal ──────────────────────────────────────────────────────────────
  const [cpModal, setCpModal]     = useState(false);
  const [editingCp, setEditingCp] = useState<ClientProject | null>(null);
  const [cpDraft, setCpDraft]     = useState(EMPTY_CP);

  // ── Confirm ──────────────────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const firmsQuery = useQuery({ queryKey: ["firms"], queryFn: client.listFirms });
  const cpsQuery   = useQuery({
    queryKey: ["client-projects", selectedFirm?.id],
    queryFn: () => client.listClientProjects(selectedFirm!.id),
    enabled: !!selectedFirm,
  });

  const invalidateFirms = () => queryClient.invalidateQueries({ queryKey: ["firms"] });
  const invalidateCps   = () => queryClient.invalidateQueries({ queryKey: ["client-projects", selectedFirm?.id] });

  // ── Firma mutations ───────────────────────────────────────────────────────────
  const createFirmMutation = useMutation({
    mutationFn: () => client.createFirm({ name: firmDraft.name, vkn: firmDraft.vkn || null, address: firmDraft.address || null, phone: firmDraft.phone || null, email: firmDraft.email || null }),
    onSuccess: () => { invalidateFirms(); closeFirmModal(); },
  });
  const updateFirmMutation = useMutation({
    mutationFn: () => client.updateFirm(editingFirm!.id, { name: firmDraft.name, vkn: firmDraft.vkn || null, address: firmDraft.address || null, phone: firmDraft.phone || null, email: firmDraft.email || null }),
    onSuccess: (updated) => {
      invalidateFirms();
      if (selectedFirm?.id === editingFirm?.id) setSelectedFirm(updated);
      closeFirmModal();
    },
  });
  const deleteFirmMutation = useMutation({
    mutationFn: (id: number) => client.deleteFirm(id),
    onSuccess: (_, id) => {
      invalidateFirms();
      if (selectedFirm?.id === id) setSelectedFirm(null);
    },
  });

  // ── ClientProject mutations ───────────────────────────────────────────────────
  const createCpMutation = useMutation({
    mutationFn: () => client.createClientProject({ firm_id: selectedFirm!.id, name: cpDraft.name, code: cpDraft.code || null }),
    onSuccess: () => { invalidateCps(); closeCpModal(); },
  });
  const updateCpMutation = useMutation({
    mutationFn: () => client.updateClientProject(editingCp!.id, { firm_id: selectedFirm!.id, name: cpDraft.name, code: cpDraft.code || null }),
    onSuccess: () => { invalidateCps(); closeCpModal(); },
  });
  const deleteCpMutation = useMutation({
    mutationFn: (id: number) => client.deleteClientProject(id),
    onSuccess: () => invalidateCps(),
  });

  // ── Modal yardımcıları ───────────────────────────────────────────────────────
  function openFirmModal(firm?: Firm) {
    setEditingFirm(firm ?? null);
    setFirmDraft(firm ? { name: firm.name, vkn: firm.vkn ?? "", address: firm.address ?? "", phone: firm.phone ?? "", email: firm.email ?? "" } : EMPTY_FIRM);
    setFirmModal(true);
  }
  function closeFirmModal() { setFirmModal(false); setEditingFirm(null); setFirmDraft(EMPTY_FIRM); }

  function openCpModal(cp?: ClientProject) {
    setEditingCp(cp ?? null);
    setCpDraft(cp ? { name: cp.name, code: cp.code ?? "" } : EMPTY_CP);
    setCpModal(true);
  }
  function closeCpModal() { setCpModal(false); setEditingCp(null); setCpDraft(EMPTY_CP); }

  const firms = firmsQuery.data ?? [];
  const cps   = cpsQuery.data ?? [];

  return (
    <div className="stack">
      {/* Sayfa başlığı */}
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Tanımlamalar</span>
          <h1>Firma &amp; Proje Tanımlama</h1>
          <p>Firmaları ve firmaya bağlı projeleri yönetin. Her proje altında birden fazla bakır projesi açılabilir.</p>
        </div>
      </section>

      {/* 2 Kolon Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

        {/* ── SOL: Firmalar ──────────────────────────────────────────────────── */}
        <section className="table-card">
          <div className="section-header">
            <h2>Firmalar</h2>
            <button type="button" className="btn-primary" onClick={() => openFirmModal()}>
              + Firma Ekle
            </button>
          </div>

          {firms.length === 0 ? (
            <div className="empty-state" style={{ padding: "2rem 0" }}>
              Henüz firma yok. "Firma Ekle" ile ilk firmayı oluşturun.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
              {firms.map((firm) => (
                <div
                  key={firm.id}
                  onClick={() => setSelectedFirm(firm)}
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: 8,
                    border: `1.5px solid ${selectedFirm?.id === firm.id ? "var(--accent)" : "var(--line)"}`,
                    background: selectedFirm?.id === firm.id ? "var(--accent-soft)" : "var(--surface)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    transition: "border-color 0.15s",
                  }}
                >
                  {/* Firma baş harfi */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "var(--accent)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "1rem", flexShrink: 0,
                  }}>
                    {firm.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Bilgiler */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{firm.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                      {[firm.vkn && `VKN: ${firm.vkn}`, firm.phone, firm.email].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>

                  {/* İşlemler */}
                  <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
                    <button
                      type="button"
                      className="ghost"
                      style={{ fontSize: "0.8rem", padding: "2px 8px" }}
                      onClick={(e) => { e.stopPropagation(); openFirmModal(firm); }}
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      style={{ fontSize: "0.8rem", padding: "2px 8px" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDelete({
                          message: `"${firm.name}" firmasını ve tüm projelerini silmek istediğinizden emin misiniz?`,
                          onConfirm: () => { deleteFirmMutation.mutate(firm.id); setConfirmDelete(null); },
                        });
                      }}
                    >
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── SAĞ: Projeler ──────────────────────────────────────────────────── */}
        <section className="table-card">
          {!selectedFirm ? (
            <div className="empty-state" style={{ padding: "3rem 0" }}>
              Sol taraftan bir firma seçin.
            </div>
          ) : (
            <>
              <div className="section-header">
                <div>
                  <h2>{selectedFirm.name}</h2>
                  <span className="helper-text" style={{ fontSize: "0.82rem" }}>
                    {cps.length} proje
                  </span>
                </div>
                <button type="button" className="btn-primary" onClick={() => openCpModal()}>
                  + Proje Ekle
                </button>
              </div>

              {cps.length === 0 ? (
                <div className="empty-state" style={{ padding: "2rem 0" }}>
                  Bu firmaya henüz proje eklenmemiş.
                </div>
              ) : (
                <div className="table-wrap" style={{ marginTop: "1rem" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Proje Kodu</th>
                        <th>Proje Adı</th>
                        <th>Bakır Proje</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cps.map((cp) => (
                        <tr key={cp.id}>
                          <td style={{ fontFamily: "monospace", color: "var(--accent)", fontWeight: 600 }}>
                            {cp.code || "—"}
                          </td>
                          <td style={{ fontWeight: 600 }}>{cp.name}</td>
                          <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                            —
                          </td>
                          <td className="actions-cell">
                            <button
                              type="button"
                              className="ghost"
                              style={{ fontSize: "0.8rem", padding: "2px 8px" }}
                              onClick={() => openCpModal(cp)}
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              className="ghost danger"
                              style={{ fontSize: "0.8rem", padding: "2px 8px" }}
                              onClick={() =>
                                setConfirmDelete({
                                  message: `"${cp.name}" projesini silmek istediğinizden emin misiniz?`,
                                  onConfirm: () => { deleteCpMutation.mutate(cp.id); setConfirmDelete(null); },
                                })
                              }
                            >
                              Sil
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* ── Firma Modal ──────────────────────────────────────────────────────── */}
      <Modal
        title={editingFirm ? "Firma Düzenle" : "Yeni Firma Ekle"}
        open={firmModal}
        onClose={closeFirmModal}
      >
        <div className="form-grid">
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Firma Adı <span style={{ color: "#e53935" }}>*</span></span>
            <input className="input" value={firmDraft.name} required
              onChange={(e) => setFirmDraft((d) => ({ ...d, name: e.target.value }))} />
          </label>
          <label className="field">
            <span>Vergi Kimlik No (VKN)</span>
            <input className="input" value={firmDraft.vkn}
              onChange={(e) => setFirmDraft((d) => ({ ...d, vkn: e.target.value }))} />
          </label>
          <label className="field">
            <span>Telefon</span>
            <input className="input" value={firmDraft.phone}
              onChange={(e) => setFirmDraft((d) => ({ ...d, phone: e.target.value }))} />
          </label>
          <label className="field">
            <span>E-posta</span>
            <input className="input" type="email" value={firmDraft.email}
              onChange={(e) => setFirmDraft((d) => ({ ...d, email: e.target.value }))} />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Adres</span>
            <textarea className="input" rows={2} value={firmDraft.address}
              onChange={(e) => setFirmDraft((d) => ({ ...d, address: e.target.value }))}
              style={{ resize: "vertical" }} />
          </label>
        </div>
        <div className="form-actions" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="btn-primary"
            disabled={!firmDraft.name.trim() || createFirmMutation.isPending || updateFirmMutation.isPending}
            onClick={() => editingFirm ? updateFirmMutation.mutate() : createFirmMutation.mutate()}
          >
            {(createFirmMutation.isPending || updateFirmMutation.isPending)
              ? "Kaydediliyor…"
              : editingFirm ? "Güncelle" : "Ekle"}
          </button>
          <button type="button" className="ghost" onClick={closeFirmModal}>İptal</button>
        </div>
      </Modal>

      {/* ── Proje Modal ──────────────────────────────────────────────────────── */}
      <Modal
        title={editingCp ? "Proje Düzenle" : `${selectedFirm?.name ?? ""} — Yeni Proje`}
        open={cpModal}
        onClose={closeCpModal}
      >
        <div className="form-grid">
          <label className="field">
            <span>Proje Kodu</span>
            <input className="input" value={cpDraft.code} placeholder="Örn: 0325-26"
              onChange={(e) => setCpDraft((d) => ({ ...d, code: e.target.value }))} />
          </label>
          <label className="field">
            <span>Proje Adı <span style={{ color: "#e53935" }}>*</span></span>
            <input className="input" value={cpDraft.name} required
              onChange={(e) => setCpDraft((d) => ({ ...d, name: e.target.value }))} />
          </label>
        </div>
        <div className="form-actions" style={{ marginTop: "1rem" }}>
          <button
            type="button"
            className="btn-primary"
            disabled={!cpDraft.name.trim() || createCpMutation.isPending || updateCpMutation.isPending}
            onClick={() => editingCp ? updateCpMutation.mutate() : createCpMutation.mutate()}
          >
            {(createCpMutation.isPending || updateCpMutation.isPending)
              ? "Kaydediliyor…"
              : editingCp ? "Güncelle" : "Ekle"}
          </button>
          <button type="button" className="ghost" onClick={closeCpModal}>İptal</button>
        </div>
      </Modal>

      {/* ── Silme Onay ───────────────────────────────────────────────────────── */}
      <ConfirmModal
        open={!!confirmDelete}
        message={confirmDelete?.message ?? ""}
        onConfirm={() => confirmDelete?.onConfirm()}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
