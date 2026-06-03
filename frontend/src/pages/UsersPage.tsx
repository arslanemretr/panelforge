import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { client } from "../api/client";
import { ConfirmModal } from "../components/ConfirmModal";
import { Modal } from "../components/Modal";
import { useAuthStore } from "../store/useAuthStore";
import type { AuthUser } from "../types";

const ROLES = [
  { value: "admin",    label: "Admin",     desc: "Tam yetki + kullanıcı yönetimi" },
  { value: "engineer", label: "Mühendis",  desc: "Tam yetki (kullanıcı yönetimi hariç)" },
  { value: "operator", label: "Operatör",  desc: "Proje içi işlemler (tanımlama/proje oluşturma hariç)" },
  { value: "viewer",   label: "İzleyici",  desc: "Salt okunur görüntüleme" },
];

const ROLE_COLORS: Record<string, string> = {
  admin:    "#dc2626",
  engineer: "#2563eb",
  operator: "#16a34a",
  viewer:   "#6b7280",
};

const EMPTY_CREATE = { email: "", full_name: "", password: "", role: "engineer" };
const EMPTY_EDIT   = { full_name: "", role: "engineer", is_active: true };

export function UsersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [createModal, setCreateModal]           = useState(false);
  const [editingUser, setEditingUser]           = useState<AuthUser | null>(null);
  const [resetPwUser, setResetPwUser]           = useState<AuthUser | null>(null);
  const [createDraft, setCreateDraft]           = useState(EMPTY_CREATE);
  const [editDraft, setEditDraft]               = useState(EMPTY_EDIT);
  const [newPassword, setNewPassword]           = useState("");
  const [showNewPw, setShowNewPw]               = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<AuthUser | null>(null);

  const usersQuery = useQuery({ queryKey: ["users"], queryFn: client.listUsers });
  const users: AuthUser[] = usersQuery.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const createMutation = useMutation({
    mutationFn: () => client.createUser(createDraft),
    onSuccess: () => { invalidate(); setCreateModal(false); setCreateDraft(EMPTY_CREATE); },
  });

  const updateMutation = useMutation({
    mutationFn: () => client.updateUser(editingUser!.id, editDraft),
    onSuccess: () => { invalidate(); setEditingUser(null); },
  });

  const resetPwMutation = useMutation({
    mutationFn: () => client.adminResetPassword(resetPwUser!.id, newPassword),
    onSuccess: () => { setResetPwUser(null); setNewPassword(""); },
  });

  function openEdit(u: AuthUser) {
    setEditingUser(u);
    setEditDraft({ full_name: u.full_name, role: u.role, is_active: u.is_active });
  }

  const roleLabel = (role: string) => ROLES.find((r) => r.value === role)?.label ?? role;

  return (
    <div className="stack">
      <section className="card page-heading">
        <div>
          <span className="eyebrow">Sistem</span>
          <h1>Kullanıcı Yönetimi</h1>
          <p>Sisteme erişecek kullanıcıları ve rollerini yönetin.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setCreateModal(true)}>
          + Kullanıcı Ekle
        </button>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Kullanıcılar</h2>
          <span className="helper-text">{users.length} kullanıcı</span>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Ad Soyad</th>
                <th>E-posta</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Kayıt Tarihi</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                  <td style={{ fontWeight: 600 }}>
                    {u.full_name}
                    {u.id === currentUser?.id && (
                      <span style={{ marginLeft: 6, fontSize: "0.72rem", color: "var(--accent)", fontWeight: 400 }}>
                        (siz)
                      </span>
                    )}
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{u.email}</td>
                  <td>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 10px", borderRadius: 20,
                      fontSize: "0.78rem", fontWeight: 700,
                      background: `${ROLE_COLORS[u.role]}18`,
                      color: ROLE_COLORS[u.role],
                      border: `1px solid ${ROLE_COLORS[u.role]}44`,
                    }}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: "0.78rem", fontWeight: 600,
                      color: u.is_active ? "#16a34a" : "#dc2626",
                    }}>
                      {u.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                    {new Date(u.created_at).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="actions-cell">
                    <button type="button" className="ghost"
                      style={{ fontSize: "0.8rem", padding: "2px 8px" }}
                      onClick={() => openEdit(u)}>
                      Düzenle
                    </button>
                    <button type="button" className="ghost"
                      style={{ fontSize: "0.8rem", padding: "2px 8px" }}
                      onClick={() => { setResetPwUser(u); setNewPassword(""); }}>
                      Şifre Sıfırla
                    </button>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr><td colSpan={6}><div className="empty-state">Kullanıcı bulunamadı.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Kullanıcı Ekle Modal ─────────────────────────────────────────────── */}
      <Modal title="Yeni Kullanıcı Ekle" open={createModal} onClose={() => { setCreateModal(false); setCreateDraft(EMPTY_CREATE); }}>
        <div className="form-grid">
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Ad Soyad *</span>
            <input className="input" value={createDraft.full_name} required
              onChange={(e) => setCreateDraft((d) => ({ ...d, full_name: e.target.value }))} />
          </label>
          <label className="field">
            <span>E-posta *</span>
            <input className="input" type="email" value={createDraft.email} required
              onChange={(e) => setCreateDraft((d) => ({ ...d, email: e.target.value }))} />
          </label>
          <label className="field">
            <span>Şifre *</span>
            <input className="input" type="password" value={createDraft.password} required
              onChange={(e) => setCreateDraft((d) => ({ ...d, password: e.target.value }))} />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Rol</span>
            <select className="input" value={createDraft.role}
              onChange={(e) => setCreateDraft((d) => ({ ...d, role: e.target.value }))}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-actions" style={{ marginTop: "1rem" }}>
          <button type="button" className="btn-primary"
            disabled={!createDraft.full_name || !createDraft.email || !createDraft.password || createMutation.isPending}
            onClick={() => createMutation.mutate()}>
            {createMutation.isPending ? "Ekleniyor…" : "Ekle"}
          </button>
          <button type="button" className="ghost" onClick={() => { setCreateModal(false); setCreateDraft(EMPTY_CREATE); }}>İptal</button>
          {createMutation.isError && (
            <span style={{ color: "#dc2626", fontSize: "0.82rem" }}>
              {(createMutation.error as any)?.response?.data?.detail ?? "Hata oluştu"}
            </span>
          )}
        </div>
      </Modal>

      {/* ── Kullanıcı Düzenle Modal ──────────────────────────────────────────── */}
      <Modal
        title={editingUser ? `Düzenle — ${editingUser.full_name}` : "Düzenle"}
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
      >
        <div className="form-grid">
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Ad Soyad *</span>
            <input className="input" value={editDraft.full_name} required
              onChange={(e) => setEditDraft((d) => ({ ...d, full_name: e.target.value }))} />
          </label>
          <label className="field">
            <span>Rol</span>
            <select className="input" value={editDraft.role}
              onChange={(e) => setEditDraft((d) => ({ ...d, role: e.target.value }))}>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Durum</span>
            <select className="input" value={editDraft.is_active ? "1" : "0"}
              onChange={(e) => setEditDraft((d) => ({ ...d, is_active: e.target.value === "1" }))}>
              <option value="1">Aktif</option>
              <option value="0">Pasif (devre dışı)</option>
            </select>
          </label>
        </div>
        <div className="form-actions" style={{ marginTop: "1rem" }}>
          <button type="button" className="btn-primary"
            disabled={!editDraft.full_name || updateMutation.isPending}
            onClick={() => updateMutation.mutate()}>
            {updateMutation.isPending ? "Kaydediliyor…" : "Güncelle"}
          </button>
          <button type="button" className="ghost" onClick={() => setEditingUser(null)}>İptal</button>
        </div>
      </Modal>

      {/* ── Şifre Sıfırla Modal ──────────────────────────────────────────────── */}
      <Modal
        title={resetPwUser ? `Şifre Sıfırla — ${resetPwUser.full_name}` : "Şifre Sıfırla"}
        open={!!resetPwUser}
        onClose={() => { setResetPwUser(null); setNewPassword(""); }}
      >
        <label className="field">
          <span>Yeni Şifre *</span>
          <div style={{ position: "relative" }}>
            <input className="input" type={showNewPw ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ paddingRight: "2.5rem", width: "100%", boxSizing: "border-box" }} />
            <button type="button" onClick={() => setShowNewPw((v) => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
              tabIndex={-1}>
              {showNewPw ? "🙈" : "👁"}
            </button>
          </div>
        </label>
        <div className="form-actions" style={{ marginTop: "1rem" }}>
          <button type="button" className="btn-primary"
            disabled={newPassword.length < 6 || resetPwMutation.isPending}
            onClick={() => resetPwMutation.mutate()}>
            {resetPwMutation.isPending ? "Kaydediliyor…" : "Şifreyi Kaydet"}
          </button>
          <button type="button" className="ghost" onClick={() => { setResetPwUser(null); setNewPassword(""); }}>İptal</button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!confirmDeactivate}
        message={`"${confirmDeactivate?.full_name}" kullanıcısını devre dışı bırakmak istediğinizden emin misiniz?`}
        confirmLabel="Devre Dışı Bırak"
        onConfirm={() => setConfirmDeactivate(null)}
        onCancel={() => setConfirmDeactivate(null)}
      />
    </div>
  );
}
