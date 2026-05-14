import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";

import { BendTypeFormPage } from "./pages/BendTypeFormPage";
import { BendTypesListPage } from "./pages/BendTypesListPage";
import { CopperDefinitionsPage } from "./pages/CopperDefinitionsPage";
import { DeviceDefinitionsPage } from "./pages/DeviceDefinitionsPage";
import { DeviceEditorPage } from "./pages/DeviceEditorPage";
import { MainCopperFormPage } from "./pages/MainCopperFormPage";
import { MainCopperListPage } from "./pages/MainCopperListPage";
import { PanelDefinitionsPage } from "./pages/PanelDefinitionsPage";
import { PanelFormPage } from "./pages/PanelFormPage";
import { ProjectListPage } from "./pages/ProjectListPage";
import { ProjectWorkspacePage } from "./pages/ProjectWorkspacePage";
import { TerminalDefinitionsPage } from "./pages/TerminalDefinitionsPage";
import { TerminalFormPage } from "./pages/TerminalFormPage";
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
      ["/definitions/panels", "Kabin Tanimlama"],
      ["/definitions/terminal-types", "Terminal Tanimlama"],
      ["/definitions/devices", "Cihaz Tanimlama"],
      ["/definitions/copper/main", "Ana Bakir Tanimlama"],
      ["/definitions/bend-types", "Bukum Tipleri"],
      ["/definitions/copper/branch", "Tali Bakir Tanimlama"],
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
          <Route path="/definitions/terminal-types" element={<TerminalDefinitionsPage />} />
          <Route path="/definitions/terminal-types/new" element={<TerminalFormPage />} />
          <Route path="/definitions/terminal-types/:id/edit" element={<TerminalFormPage />} />
          <Route path="/definitions/bend-types" element={<BendTypesListPage />} />
          <Route path="/definitions/bend-types/new" element={<BendTypeFormPage />} />
          <Route path="/definitions/bend-types/:id/edit" element={<BendTypeFormPage />} />
          <Route path="/definitions/devices/new" element={<DeviceEditorPage />} />
          <Route path="/definitions/devices/:id" element={<DeviceEditorPage />} />
          <Route path="/definitions/panels" element={<PanelDefinitionsPage />} />
          <Route path="/definitions/panels/new" element={<PanelFormPage />} />
          <Route path="/definitions/panels/:id/edit" element={<PanelFormPage />} />
          <Route path="/definitions/copper" element={<Navigate to="/definitions/copper/main" replace />} />
          <Route path="/definitions/copper/main" element={<MainCopperListPage />} />
          <Route path="/definitions/copper/main/new" element={<MainCopperFormPage />} />
          <Route path="/definitions/copper/main/:id/edit" element={<MainCopperFormPage />} />
          <Route path="/definitions/copper/branch" element={<CopperDefinitionsPage />} />
        </Routes>
      </main>
    </div>
  );
}
