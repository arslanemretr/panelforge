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
import { useTheme } from "../hooks/useTheme";
import { useProjectStore } from "../store/useProjectStore";

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
  { key: "panel-selection", label: "1 · Kabin Secimi", requiresPanel: false },
  { key: "device-selection", label: "2 · Cihaz Yerlesimi", requiresPanel: true },
  { key: "copper-selection", label: "3 · Ana Bakir Secimi", requiresPanel: true },
  { key: "connections", label: "4 · Tali Bakir Secimi", requiresPanel: true },
  { key: "parameters", label: "5 · Parametreler", requiresPanel: true },
  { key: "results", label: "6 · Sonuclar", requiresPanel: true },
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
        <p>Aktif proje secilmedi.</p>
        <button type="button" className="btn-primary" onClick={() => navigate("/projects")}>
          Projelere Don
        </button>
      </div>
    );
  }

  const panelSelectionDone = (projectPanelsQuery.data?.length ?? 0) > 0;

  function handleTabClick(tab: TabDef) {
    if (tab.requiresPanel && !panelSelectionDone) {
      return;
    }
    setActiveTab(tab.key);
  }

  return (
    <div className="workspace-page">
      <div className="workspace-header">
        <div>
          <button type="button" className="ghost" style={{ marginBottom: "0.4rem" }} onClick={() => navigate("/projects")}>
            ← Proje Listesi
          </button>
          <h1 style={{ margin: "0.15rem 0 0" }}>
            {projectQuery.data?.panel_code && (
              <span style={{ fontFamily: "monospace", color: "var(--accent)", marginRight: "0.6rem", fontSize: "1rem", fontWeight: 600 }}>
                {projectQuery.data.panel_code}
              </span>
            )}
            {projectQuery.data?.name ?? "..."}
          </h1>
          {projectQuery.data?.customer_name && (
            <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>{projectQuery.data.customer_name}</span>
          )}
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={toggle}
          title={theme === "dark" ? "Acik temaya gec" : "Koyu temaya gec"}
          style={{ alignSelf: "flex-start", width: "auto" }}
        >
          <span className="theme-toggle-icon">{theme === "dark" ? "☀" : "☾"}</span>
        </button>
      </div>

      <div className="tab-bar">
        {TABS.map((tab) => {
          const disabled = tab.requiresPanel && !panelSelectionDone;
          return (
            <button
              key={tab.key}
              type="button"
              className={["tab-btn", activeTab === tab.key ? "active" : "", disabled ? "disabled" : ""].filter(Boolean).join(" ")}
              disabled={disabled}
              onClick={() => handleTabClick(tab)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="workspace-body">
        {activeTab === "panel-selection" && <PanelSelectionTab projectId={projectId} />}
        {activeTab === "device-selection" && <DeviceSelectionTab projectId={projectId} />}
        {activeTab === "copper-selection" && <CopperSelectionTab projectId={projectId} />}
        {activeTab === "connections" && <ConnectionTab projectId={projectId} />}
        {activeTab === "parameters" && <ParametersTab projectId={projectId} />}
        {activeTab === "results" && <ResultsTab projectId={projectId} />}
      </div>
    </div>
  );
}
