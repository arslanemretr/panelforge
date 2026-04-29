import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { CopperDefinitionsPage } from "./pages/CopperDefinitionsPage";
import { DeviceDefinitionsPage } from "./pages/DeviceDefinitionsPage";
import { PanelDefinitionsPage } from "./pages/PanelDefinitionsPage";
import { ProjectListPage } from "./pages/ProjectListPage";
import { ProjectWorkspacePage } from "./pages/ProjectWorkspacePage";
import { useTheme } from "./hooks/useTheme";

const navSections = [
  {
    title: "Projeler",
    items: [
      ["/projects", "Proje Listesi"],
    ],
  },
  {
    title: "Tanimlamalar",
    items: [
      ["/definitions/devices", "Cihaz Tanimlama"],
      ["/definitions/panels", "Kabin Tanimlama"],
      ["/definitions/copper", "Bakir Tanimlama"],
    ],
  },
];

export default function App() {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const isWorkspace = location.pathname === "/workspace";

  // Workspace: tam ekran, sidebar yok
  if (isWorkspace) {
    return (
      <Routes>
        <Route path="/workspace" element={<ProjectWorkspacePage />} />
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
          {navSections.map((section) => (
            <div key={section.title} className="nav-group">
              <span className="nav-group-title">{section.title}</span>
              {section.items.map(([to, label]) => (
                <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : "")}>
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="theme-toggle"
            onClick={toggle}
            title={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
          >
            <span className="theme-toggle-icon">{theme === "dark" ? "☀" : "☾"}</span>
            <span>{theme === "dark" ? "Açık Tema" : "Koyu Tema"}</span>
          </button>
        </div>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/definitions/devices" element={<DeviceDefinitionsPage />} />
          <Route path="/definitions/panels" element={<PanelDefinitionsPage />} />
          <Route path="/definitions/copper" element={<CopperDefinitionsPage />} />
        </Routes>
      </main>
    </div>
  );
}
