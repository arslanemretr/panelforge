import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { BendTypeFormPage } from "./pages/BendTypeFormPage";
import { BendTypesListPage } from "./pages/BendTypesListPage";
import { CopperDefinitionsPage } from "./pages/CopperDefinitionsPage";
import { DeviceDefinitionsPage } from "./pages/DeviceDefinitionsPage";
import { DeviceEditorPage } from "./pages/DeviceEditorPage";
import { FirmsPage } from "./pages/FirmsPage";
import { LoginPage } from "./pages/LoginPage";
import { MainCopperFormPage } from "./pages/MainCopperFormPage";
import { MainCopperListPage } from "./pages/MainCopperListPage";
import { PanelDefinitionsPage } from "./pages/PanelDefinitionsPage";
import { PanelFormPage } from "./pages/PanelFormPage";
import { ProjectListPage } from "./pages/ProjectListPage";
import { ProjectWorkspacePage } from "./pages/ProjectWorkspacePage";
import { TerminalDefinitionsPage } from "./pages/TerminalDefinitionsPage";
import { TerminalFormPage } from "./pages/TerminalFormPage";
import { UsersPage } from "./pages/UsersPage";
import { RequireAuth } from "./components/RequireAuth";
import { useTheme } from "./hooks/useTheme";
import { useAuthStore } from "./store/useAuthStore";

const ROLE_LABELS: Record<string, string> = {
  admin:    "Admin",
  engineer: "Mühendis",
  operator: "Operatör",
  viewer:   "İzleyici",
};

export default function App() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const { user, logout, isAdmin, isEngineer } = useAuthStore();

  const isWorkspace = location.pathname === "/workspace";
  const isLogin     = location.pathname === "/login";

  // Login sayfası — shell yok
  if (isLogin) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Workspace — tam ekran, sidebar yok
  if (isWorkspace) {
    return (
      <Routes>
        <Route path="/workspace" element={
          <RequireAuth require="operator"><ProjectWorkspacePage /></RequireAuth>
        } />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-mark">PF</span>
          <div>
            <strong>PanelForge</strong>
            <small>Engineering workspace</small>
          </div>
        </div>

        <nav className="sidebar-nav grouped">
          {/* Projeler */}
          <div className="nav-group">
            <span className="nav-group-title">Projeler</span>
            <NavLink to="/projects" className={({ isActive }) => isActive ? "active" : ""}>
              Bakir Projesi Listesi
            </NavLink>
          </div>

          {/* Tanımlamalar */}
          <div className="nav-group">
            <span className="nav-group-title">Tanimlamalar</span>
            <NavLink to="/definitions/firms"          className={({ isActive }) => isActive ? "active" : ""}>Firma &amp; Proje</NavLink>
            <NavLink to="/definitions/panels"         className={({ isActive }) => isActive ? "active" : ""}>Kabin Tanimlama</NavLink>
            <NavLink to="/definitions/terminal-types" className={({ isActive }) => isActive ? "active" : ""}>Terminal Tanimlama</NavLink>
            <NavLink to="/definitions/devices"        className={({ isActive }) => isActive ? "active" : ""}>Cihaz Tanimlama</NavLink>
            <NavLink to="/definitions/copper/main"    className={({ isActive }) => isActive ? "active" : ""}>Ana Bakir Tanimlama</NavLink>
            <NavLink to="/definitions/bend-types"     className={({ isActive }) => isActive ? "active" : ""}>Bukum Tipleri</NavLink>
            <NavLink to="/definitions/copper/branch"  className={({ isActive }) => isActive ? "active" : ""}>Tali Bakir Tanimlama</NavLink>
          </div>

          {/* Sistem — sadece admin görür */}
          {isAdmin() && (
            <div className="nav-group">
              <span className="nav-group-title">Sistem</span>
              <NavLink to="/definitions/users" className={({ isActive }) => isActive ? "active" : ""}>
                Kullanici Yonetimi
              </NavLink>
            </div>
          )}
        </nav>

        {/* Kullanıcı bilgisi + çıkış */}
        <div className="sidebar-footer" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {user && (
            <div style={{
              padding: "0.6rem 0.75rem",
              background: "var(--panel-strong)",
              borderRadius: 8,
              border: "1px solid var(--line)",
            }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 2 }}>
                {user.full_name}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                {user.email}
              </div>
              <div style={{ marginTop: 4 }}>
                <span style={{
                  fontSize: "0.7rem", fontWeight: 700, padding: "1px 6px",
                  borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)",
                }}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="theme-toggle"
              style={{ flex: 1 }}
              onClick={toggle}
              title={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
            >
              <span className="theme-toggle-icon">{theme === "dark" ? "☀" : "☾"}</span>
              <span>{theme === "dark" ? "Açık" : "Koyu"}</span>
            </button>
            <button
              type="button"
              className="ghost danger"
              style={{ padding: "0.45rem 0.75rem", fontSize: "0.8rem" }}
              onClick={logout}
              title="Çıkış yap"
            >
              Çıkış
            </button>
          </div>
        </div>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />

          {/* Auth gereken tüm sayfalar */}
          <Route path="/projects" element={
            <RequireAuth><ProjectListPage /></RequireAuth>
          } />

          <Route path="/definitions/firms" element={
            <RequireAuth><FirmsPage /></RequireAuth>
          } />
          <Route path="/definitions/panels" element={
            <RequireAuth><PanelDefinitionsPage /></RequireAuth>
          } />
          <Route path="/definitions/panels/new" element={
            <RequireAuth require="engineer"><PanelFormPage /></RequireAuth>
          } />
          <Route path="/definitions/panels/:id/edit" element={
            <RequireAuth require="engineer"><PanelFormPage /></RequireAuth>
          } />
          <Route path="/definitions/terminal-types" element={
            <RequireAuth><TerminalDefinitionsPage /></RequireAuth>
          } />
          <Route path="/definitions/terminal-types/new" element={
            <RequireAuth require="engineer"><TerminalFormPage /></RequireAuth>
          } />
          <Route path="/definitions/terminal-types/:id/edit" element={
            <RequireAuth require="engineer"><TerminalFormPage /></RequireAuth>
          } />
          <Route path="/definitions/bend-types" element={
            <RequireAuth><BendTypesListPage /></RequireAuth>
          } />
          <Route path="/definitions/bend-types/new" element={
            <RequireAuth require="engineer"><BendTypeFormPage /></RequireAuth>
          } />
          <Route path="/definitions/bend-types/:id/edit" element={
            <RequireAuth require="engineer"><BendTypeFormPage /></RequireAuth>
          } />
          <Route path="/definitions/devices" element={
            <RequireAuth><DeviceDefinitionsPage /></RequireAuth>
          } />
          <Route path="/definitions/devices/new" element={
            <RequireAuth require="engineer"><DeviceEditorPage /></RequireAuth>
          } />
          <Route path="/definitions/devices/:id" element={
            <RequireAuth require="engineer"><DeviceEditorPage /></RequireAuth>
          } />
          <Route path="/definitions/copper" element={<Navigate to="/definitions/copper/main" replace />} />
          <Route path="/definitions/copper/main" element={
            <RequireAuth><MainCopperListPage /></RequireAuth>
          } />
          <Route path="/definitions/copper/main/new" element={
            <RequireAuth require="engineer"><MainCopperFormPage /></RequireAuth>
          } />
          <Route path="/definitions/copper/main/:id/edit" element={
            <RequireAuth require="engineer"><MainCopperFormPage /></RequireAuth>
          } />
          <Route path="/definitions/copper/branch" element={
            <RequireAuth><CopperDefinitionsPage /></RequireAuth>
          } />
          <Route path="/definitions/users" element={
            <RequireAuth require="admin"><UsersPage /></RequireAuth>
          } />
        </Routes>
      </main>
    </div>
  );
}
