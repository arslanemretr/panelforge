import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { client } from "../api/client";
import { ConnectionTab } from "../components/workspace/ConnectionTab";
import { CopperSelectionTab } from "../components/workspace/CopperSelectionTab";
import { DeviceSelectionTab } from "../components/workspace/DeviceSelectionTab";
import { PanelSelectionTab } from "../components/workspace/PanelSelectionTab";
import { ParametersTab } from "../components/workspace/ParametersTab";
import { ResultsTab } from "../components/workspace/ResultsTab";
import { useProjectStore } from "../store/useProjectStore";
import { useTheme } from "../hooks/useTheme";

type WorkspaceTab =
  | "panel-selection"
  | "device-selection"
  | "copper-selection"
  | "connections"
  | "parameters"
  | "results";

interface TabDef {
  key: WorkspaceTab;
  label: string;
  requiresPanel: boolean;
}

const TABS: TabDef[] = [
  { key: "panel-selection",  label: "1 · Kabin Seçimi",    requiresPanel: false },
  { key: "device-selection", label: "2 · Cihaz Yerleşimi", requiresPanel: true  },
  { key: "copper-selection", label: "3 · Bakır Seçimi",    requiresPanel: true  },
  { key: "connections",      label: "4 · Bağlantılar",     requiresPanel: true  },
  { key: "parameters",       label: "5 · Parametreler",    requiresPanel: true  },
  { key: "results",          label: "6 · Sonuçlar",        requiresPanel: true  },
];

export function ProjectWorkspacePage() {
  const navigate = useNavigate();
  const projectId = useProjectStore((state) => state.activeProjectId);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("panel-selection");
  const { theme, toggle } = useTheme();

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => client.getProject(projectId as number),
    enabled: !!projectId,
  });

  const projectPanelsQuery = useQuery({
    queryKey: ["project-panels", projectId],
    queryFn: () => client.listProjectPanels(projectId as number),
    enabled: !!projectId,
  });

  if (!projectId) {
    return (
      <div className="page-center">
        <p>Aktif proje seçilmedi.</p>
        <button type="button" className="btn-primary" onClick={() => navigate("/")}>
          Projelere Dön
        </button>
      </div>
    );
  }

  const project = projectQuery.data;
  const panelSelectionDone = (projectPanelsQuery.data?.length ?? 0) > 0;

  function handleTabClick(tab: TabDef) {
    if (tab.requiresPanel && !panelSelectionDone) return;
    setActiveTab(tab.key);
  }

  return (
    <div className="workspace-page">
      {/* Page header */}
      <div className="workspace-header">
        <div>
          <button type="button" className="ghost" style={{ marginBottom: "0.4rem" }} onClick={() => navigate("/projects")}>
            ← Proje Listesi
          </button>
          <h1 style={{ margin: "0.15rem 0 0" }}>
            {project?.panel_code && (
              <span style={{ fontFamily: "monospace", color: "var(--accent)", marginRight: "0.6rem", fontSize: "1rem", fontWeight: 600 }}>
                {project.panel_code}
              </span>
            )}
            {project?.name ?? "..."}
          </h1>
          {project?.customer_name && (
            <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>{project.customer_name}</span>
          )}
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggle}
          title={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
          style={{ alignSelf: "flex-start", width: "auto" }}
        >
          <span className="theme-toggle-icon">{theme === "dark" ? "☀" : "☾"}</span>
        </button>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((tab) => {
          const disabled = tab.requiresPanel && !panelSelectionDone;
          return (
            <button
              key={tab.key}
              type="button"
              className={[
                "tab-btn",
                activeTab === tab.key ? "active" : "",
                disabled ? "disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled}
              onClick={() => handleTabClick(tab)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="workspace-body">
        {activeTab === "panel-selection"  && <PanelSelectionTab  projectId={projectId} />}
        {activeTab === "device-selection" && <DeviceSelectionTab projectId={projectId} />}
        {activeTab === "copper-selection" && <CopperSelectionTab projectId={projectId} />}
        {activeTab === "connections"      && <ConnectionTab      projectId={projectId} />}
        {activeTab === "parameters"       && <ParametersTab      projectId={projectId} />}
        {activeTab === "results"          && <ResultsTab         projectId={projectId} />}
      </div>
    </div>
  );
}
