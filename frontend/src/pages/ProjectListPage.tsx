import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { client } from "../api/client";
import { ConfirmModal } from "../components/ConfirmModal";
import { Modal } from "../components/Modal";
import { useProjectStore } from "../store/useProjectStore";
import type { ClientProject, Firm, Project } from "../types";

const EMPTY_DRAFT = {
  name: "",
  panel_code: "",
  prepared_by: "",
  description: "",
  client_project_id: null as number | null,
};

export function ProjectListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);

  const [modalOpen, setModalOpen]           = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [draft, setDraft]                   = useState(EMPTY_DRAFT);
  const [selectedFirmId, setSelectedFirmId] = useState<number | "">("");
  const [confirmPending, setConfirmPending] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // ── Queries ─────────────────────────────────────────────────────────────────
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: client.listProjects });
  const firmsQuery    = useQuery({ queryKey: ["firms"],    queryFn: client.listFirms });
  const cpsQuery      = useQuery({
    queryKey: ["client-projects", selectedFirmId || null],
    queryFn: () => client.listClientProjects(selectedFirmId ? Number(selectedFirmId) : undefined),
    enabled: !!selectedFirmId,
  });

  const firms: Firm[]                   = firmsQuery.data ?? [];
  const clientProjects: ClientProject[] = cpsQuery.data ?? [];

  // ── Mutations ────────────────────────────────────────────────────────────────
  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => client.deleteProject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });

  const createProjectMutation = useMutation({
    mutationFn: () =>
      client.createProject({
        name: draft.name,
        panel_code: draft.panel_code || `PF-${Date.now().toString().slice(-6)}`,
        prepared_by: draft.prepared_by || null,
        description: draft.description || null,
        client_project_id: draft.client_project_id,
      }),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setActiveProjectId(project.id);
      closeModal();
      navigate("/workspace");
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: () =>
      client.updateProject(editingProject!.id, {
        name: draft.name,
        panel_code: draft.panel_code || null,
        prepared_by: draft.prepared_by || null,
        description: draft.description || null,
        client_project_id: draft.client_project_id,
        customer_name: editingProject!.customer_name,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeModal();
    },
  });

  // ── Modal yardımcıları ───────────────────────────────────────────────────────
  function openCreateModal() {
    setEditingProject(null);
    setDraft(EMPTY_DRAFT);
    setSelectedFirmId("");
    setModalOpen(true);
  }

  function openEditModal(project: Project) {
    setEditingProject(project);
    setDraft({
      name:              project.name,
      panel_code:        project.panel_code ?? "",
      prepared_by:       project.prepared_by ?? "",
      description:       project.description ?? "",
      client_project_id: project.client_project_id ?? null,
    });
    // Firma seçimini doldur
    const firmId = project.client_project?.firm_id ?? "";
    setSelectedFirmId(firmId);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingProject(null);
    setDraft(EMPTY_DRAFT);
    setSelectedFirmId("");
  }

  function handleSubmit() {
    if (editingProject) {
      updateProjectMutation.mutate();
    } else {
      createProjectMutation.mutate();
    }
  }

  function handleDelete(id: number, name: string) {
    setConfirmPending({
      message: `"${name}" bakır projesini kalıcı olarak silmek istediğinizden emin misiniz?`,
      onConfirm: () => { deleteProjectMutation.mutate(id); setConfirmPending(null); },
    });
  }

  const sortedProjects = useMemo(
    () => [...(projectsQuery.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [projectsQuery.data],
  );

  const isPending = createProjectMutation.isPending || updateProjectMutation.isPending;

  return (
    <div className="stack">
      {/* Sayfa başlığı */}
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Projeler</span>
          <h1>Bakır Projesi Listesi</h1>
          <p>
            Bakır projelerini görüntüleyin ve çalışma ekranında açın.
            Firma ve proje tanımları için{" "}
            <a href="/definitions/firms" style={{ color: "var(--accent)" }}>Firma &amp; Proje Tanımlama</a>{" "}
            sayfasını kullanın.
          </p>
        </div>
        <button type="button" onClick={openCreateModal}>
          + Yeni Bakır Projesi
        </button>
      </section>

      {/* Tablo */}
      <section className="card">
        <div className="section-header">
          <h2>Kayıtlı Bakır Projeleri</h2>
          <span className="helper-text">{sortedProjects.length} proje</span>
        </div>
        <div className="table-wrap">
          <table className="project-table">
            <thead>
              <tr>
                <th>Firma</th>
                <th>Proje</th>
                <th>Panel Kodu</th>
                <th>Bakır Projesi Adı</th>
                <th>Hazırlayan</th>
                <th>Güncelleme</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((project) => (
                <tr key={project.id}>
                  <td style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    {project.client_project?.firm.name ?? <span style={{ color: "var(--line)" }}>—</span>}
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>
                    {project.client_project ? (
                      <span>
                        {project.client_project.code && (
                          <span style={{ fontFamily: "monospace", color: "var(--accent)", fontWeight: 600, marginRight: 4 }}>
                            {project.client_project.code}
                          </span>
                        )}
                        {project.client_project.name}
                      </span>
                    ) : (
                      <span style={{ color: "var(--line)" }}>—</span>
                    )}
                  </td>
                  <td style={{ fontFamily: "monospace", color: "var(--accent)", fontWeight: 600 }}>
                    {project.panel_code || "—"}
                  </td>
                  <td style={{ fontWeight: 600 }}>{project.name}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    {project.prepared_by || "—"}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    {new Date(project.updated_at).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem", borderRadius: "8px" }}
                      onClick={() => { setActiveProjectId(project.id); navigate("/workspace"); }}
                    >
                      Aç →
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      style={{ padding: "0.3rem 0.7rem", fontSize: "0.85rem", borderRadius: "8px" }}
                      onClick={() => openEditModal(project)}
                    >
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="ghost danger"
                      style={{ padding: "0.3rem 0.7rem", fontSize: "0.85rem", borderRadius: "8px" }}
                      disabled={deleteProjectMutation.isPending}
                      onClick={() => handleDelete(project.id, project.name)}
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {!sortedProjects.length && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      Henüz bakır projesi yok. "Yeni Bakır Projesi" ile ilk kaydı oluşturun.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Oluştur / Düzenle Modal (ortak form) ──────────────────────────────── */}
      <Modal
        title={editingProject ? `Düzenle — ${editingProject.name}` : "Yeni Bakır Projesi"}
        open={modalOpen}
        onClose={closeModal}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div className="form-grid">

            {/* Firma seçimi */}
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Firma</span>
              <select
                className="input"
                value={selectedFirmId}
                onChange={(e) => {
                  setSelectedFirmId(e.target.value ? Number(e.target.value) : "");
                  setDraft((d) => ({ ...d, client_project_id: null }));
                }}
              >
                <option value="">— Firma seçin (opsiyonel) —</option>
                {firms.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </label>

            {/* Proje seçimi (firmaya bağlı) */}
            {selectedFirmId && (
              <label className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Proje</span>
                <select
                  className="input"
                  value={draft.client_project_id ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, client_project_id: e.target.value ? Number(e.target.value) : null }))
                  }
                >
                  <option value="">— Proje seçin (opsiyonel) —</option>
                  {clientProjects.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      {cp.code ? `${cp.code} — ` : ""}{cp.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Ayırıcı */}
            <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--line)", marginTop: "0.25rem", paddingTop: "0.75rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Bakır Projesi Bilgileri
              </span>
            </div>

            <label className="field">
              <span>Panel Kodu</span>
              <input
                className="input"
                value={draft.panel_code}
                placeholder="Örn: PF-2024-001"
                onChange={(e) => setDraft((d) => ({ ...d, panel_code: e.target.value }))}
              />
            </label>

            <label className="field">
              <span>Bakır Projesi Adı <span style={{ color: "#e53935" }}>*</span></span>
              <input
                className="input"
                value={draft.name}
                required
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </label>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Hazırlayan</span>
              <input
                className="input"
                value={draft.prepared_by}
                onChange={(e) => setDraft((d) => ({ ...d, prepared_by: e.target.value }))}
              />
            </label>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Açıklama</span>
              <textarea
                className="input"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                style={{ resize: "vertical" }}
              />
            </label>
          </div>

          <div className="form-actions" style={{ marginTop: "1.25rem" }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={!draft.name.trim() || isPending}
            >
              {isPending
                ? (editingProject ? "Güncelleniyor…" : "Oluşturuluyor…")
                : (editingProject ? "Güncelle" : "Bakır Projesini Oluştur")}
            </button>
            <button type="button" className="ghost" onClick={closeModal}>İptal</button>
          </div>
        </form>
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
