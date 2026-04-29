import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { client } from "../api/client";
import { Modal } from "../components/Modal";
import { useProjectStore } from "../store/useProjectStore";

const emptyProjectDraft = {
  name: "",
  customer_name: "",
  panel_code: "",
  prepared_by: "",
  description: "",
};

export function ProjectListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setActiveProjectId = useProjectStore((state) => state.setActiveProjectId);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(emptyProjectDraft);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: client.listProjects,
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: number) => client.deleteProject(projectId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  function handleDelete(projectId: number, projectName: string) {
    if (window.confirm(`"${projectName}" projesini kalıcı olarak silmek istediğinizden emin misiniz?\nBu işlem geri alınamaz.`)) {
      deleteProjectMutation.mutate(projectId);
    }
  }

  const createProjectMutation = useMutation({
    mutationFn: () =>
      client.createProject({
        ...draft,
        panel_code: draft.panel_code || `PF-${Date.now().toString().slice(-6)}`,
      }),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      setActiveProjectId(project.id);
      setModalOpen(false);
      setDraft(emptyProjectDraft);
      navigate("/workspace");
    },
  });

  const sortedProjects = useMemo(
    () => [...(projectsQuery.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
    [projectsQuery.data],
  );

  function set<K extends keyof typeof draft>(key: K, value: string) {
    setDraft((cur) => ({ ...cur, [key]: value }));
  }

  return (
    <div className="stack">
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Projeler</span>
          <h1>Proje Listesi</h1>
          <p>Projeleri tablo halinde görüntüleyin, yeni proje oluşturun ve seçilen projeyi çalışma ekranında açın.</p>
        </div>
        <button type="button" onClick={() => setModalOpen(true)}>
          Yeni Proje
        </button>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Kayıtlı Projeler</h2>
          <span className="helper-text">{sortedProjects.length} proje</span>
        </div>
        <div className="table-wrap">
          <table className="project-table">
            <thead>
              <tr>
                <th>Proje Kodu</th>
                <th>Proje Adı</th>
                <th>Müşteri Adı</th>
                <th>Hazırlayan</th>
                <th>Oluşturma</th>
                <th>Güncelleme</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((project) => (
                <tr key={project.id}>
                  <td style={{ fontFamily: "monospace", color: "var(--accent)", fontWeight: 600 }}>
                    {project.panel_code || "-"}
                  </td>
                  <td style={{ fontWeight: 600 }}>{project.name}</td>
                  <td>{project.customer_name || "-"}</td>
                  <td>{project.prepared_by || "-"}</td>
                  <td style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    {new Date(project.created_at).toLocaleDateString("tr-TR")}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                    {new Date(project.updated_at).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: "0.3rem 0.9rem", fontSize: "0.85rem", borderRadius: "8px" }}
                      onClick={() => {
                        setActiveProjectId(project.id);
                        navigate("/workspace");
                      }}
                    >
                      Aç →
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
                    <div className="empty-state">Henüz proje yok. "Yeni Proje" butonuyla ilk kaydı ekleyin.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal title="Yeni Proje Ekle" open={modalOpen} onClose={() => setModalOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createProjectMutation.mutate();
          }}
        >
          <div className="form-grid">
            <label className="field">
              <span>Proje Kodu</span>
              <input
                className="input"
                value={draft.panel_code}
                placeholder="Örn: PF-2024-001"
                onChange={(e) => set("panel_code", e.target.value)}
              />
            </label>

            <label className="field">
              <span>Proje Adı <span style={{ color: "#e53935" }}>*</span></span>
              <input
                className="input"
                value={draft.name}
                required
                onChange={(e) => set("name", e.target.value)}
              />
            </label>

            <label className="field">
              <span>Müşteri Adı</span>
              <input
                className="input"
                value={draft.customer_name}
                onChange={(e) => set("customer_name", e.target.value)}
              />
            </label>

            <label className="field">
              <span>Hazırlayan</span>
              <input
                className="input"
                value={draft.prepared_by}
                onChange={(e) => set("prepared_by", e.target.value)}
              />
            </label>

            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Açıklama</span>
              <textarea
                className="input"
                rows={3}
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                style={{ resize: "vertical" }}
              />
            </label>
          </div>

          <div className="form-actions" style={{ marginTop: "1.25rem" }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={!draft.name.trim() || createProjectMutation.isPending}
            >
              {createProjectMutation.isPending ? "Oluşturuluyor..." : "Projeyi Oluştur"}
            </button>
            <button type="button" className="ghost" onClick={() => setModalOpen(false)}>
              İptal
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
