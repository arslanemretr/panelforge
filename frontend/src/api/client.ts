import axios from "axios";

import type {
  BendType,
  BranchConductor,
  CalculationResults,
  CopperDefinition,
  CopperSettings,
  Device,
  DeviceImportPreview,
  DeviceImportResult,
  DeviceConnection,
  Panel,
  PanelDefinition,
  PanelType,
  PhaseLabel,
  PhaseType,
  Project,
  ProjectCopper,
  ProjectPanel,
  ProjectDevice,
  TerminalDefinition,
  ValidationResult,
} from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
});

export const client = {
  listProjects: async () => (await api.get<Project[]>("/projects")).data,
  getProject: async (projectId: number) => (await api.get<Project>(`/projects/${projectId}`)).data,
  createProject: async (payload: Partial<Project>) => (await api.post<Project>("/projects", payload)).data,
  updateProject: async (projectId: number, payload: Partial<Project>) =>
    (await api.put<Project>(`/projects/${projectId}`, payload)).data,
  deleteProject: async (projectId: number) => api.delete(`/projects/${projectId}`),

  getPanel: async (projectId: number) => (await api.get<Panel | null>(`/projects/${projectId}/panel`)).data,
  upsertPanel: async (projectId: number, payload: Panel) =>
    (await api.put<Panel>(`/projects/${projectId}/panel`, payload)).data,
  listPanelDefinitions: async () => (await api.get<PanelDefinition[]>("/panel-definitions")).data,
  createPanelDefinition: async (payload: Omit<PanelDefinition, "id" | "created_at" | "updated_at" | "panel_type">) =>
    (await api.post<PanelDefinition>("/panel-definitions", payload)).data,
  updatePanelDefinition: async (id: number, payload: Omit<PanelDefinition, "id" | "created_at" | "updated_at" | "panel_type">) =>
    (await api.put<PanelDefinition>(`/panel-definitions/${id}`, payload)).data,
  deletePanelDefinition: async (definitionId: number) => api.delete(`/panel-definitions/${definitionId}`),
  listPanelTypes: async () => (await api.get<PanelType[]>("/panel-types")).data,
  createPanelType: async (name: string) => (await api.post<PanelType>("/panel-types", { name })).data,
  deletePanelType: async (id: number) => api.delete(`/panel-types/${id}`),
  listProjectPanels: async (projectId: number) =>
    (await api.get<ProjectPanel[]>(`/projects/${projectId}/panel-layout`)).data,
  createProjectPanel: async (
    projectId: number,
    payload: { panel_definition_id: number; label?: string | null; quantity?: number },
  ) => (await api.post<ProjectPanel>(`/projects/${projectId}/panel-layout`, payload)).data,
  deleteProjectPanel: async (projectId: number, projectPanelId: number) =>
    api.delete(`/projects/${projectId}/panel-layout/${projectPanelId}`),
  updateProjectPanelLabel: async (projectId: number, panelId: number, label: string) =>
    (await api.patch<ProjectPanel>(`/projects/${projectId}/panel-layout/${panelId}`, { label })).data,
  reorderProjectPanel: async (projectId: number, panelId: number, direction: "up" | "down") =>
    (await api.put<ProjectPanel[]>(`/projects/${projectId}/panel-layout/${panelId}/reorder`, { direction })).data,

  listProjectCoppers: async (projectId: number) =>
    (await api.get<ProjectCopper[]>(`/projects/${projectId}/copper-layout`)).data,
  createProjectCopper: async (
    projectId: number,
    payload: { copper_definition_id: number; length_mm: number; quantity: number },
  ) => (await api.post<ProjectCopper>(`/projects/${projectId}/copper-layout`, payload)).data,
  deleteProjectCopper: async (projectId: number, copperId: number) =>
    api.delete(`/projects/${projectId}/copper-layout/${copperId}`),

  listBendTypes: async () =>
    (await api.get<BendType[]>("/bend-types")).data,
  getBendType: async (id: number) =>
    (await api.get<BendType>(`/bend-types/${id}`)).data,
  createBendType: async (payload: Omit<BendType, "id" | "created_at" | "updated_at" | "bend_count">) =>
    (await api.post<BendType>("/bend-types", payload)).data,
  updateBendType: async (id: number, payload: Omit<BendType, "id" | "created_at" | "updated_at" | "bend_count">) =>
    (await api.put<BendType>(`/bend-types/${id}`, payload)).data,
  deleteBendType: async (id: number) => api.delete(`/bend-types/${id}`),

  listBranchConductors: async () =>
    (await api.get<BranchConductor[]>("/branch-conductors")).data,
  getBranchConductor: async (id: number) =>
    (await api.get<BranchConductor>(`/branch-conductors/${id}`)).data,
  createBranchConductor: async (payload: Omit<BranchConductor, "id" | "created_at" | "updated_at" | "copper_definition" | "bend_type" | "device">) =>
    (await api.post<BranchConductor>("/branch-conductors", payload)).data,
  updateBranchConductor: async (id: number, payload: Omit<BranchConductor, "id" | "created_at" | "updated_at" | "copper_definition" | "bend_type" | "device">) =>
    (await api.put<BranchConductor>(`/branch-conductors/${id}`, payload)).data,
  deleteBranchConductor: async (id: number) => api.delete(`/branch-conductors/${id}`),

  listTerminalDefinitions: async () =>
    (await api.get<TerminalDefinition[]>("/terminal-definitions")).data,
  getTerminalDefinition: async (id: number) =>
    (await api.get<TerminalDefinition>(`/terminal-definitions/${id}`)).data,
  createTerminalDefinition: async (payload: Omit<TerminalDefinition, "id" | "created_at" | "updated_at">) =>
    (await api.post<TerminalDefinition>("/terminal-definitions", payload)).data,
  updateTerminalDefinition: async (id: number, payload: Omit<TerminalDefinition, "id" | "created_at" | "updated_at">) =>
    (await api.put<TerminalDefinition>(`/terminal-definitions/${id}`, payload)).data,
  deleteTerminalDefinition: async (id: number) => api.delete(`/terminal-definitions/${id}`),

  listDevices: async () => (await api.get<Device[]>("/devices")).data,
  createDevice: async (payload: Omit<Device, "id">) => (await api.post<Device>("/devices", payload)).data,
  updateDevice: async (deviceId: number, payload: Omit<Device, "id">) =>
    (await api.put<Device>(`/devices/${deviceId}`, payload)).data,
  deleteDevice: async (deviceId: number) => api.delete(`/devices/${deviceId}`),
  exportDevicesExcelUrl: () => `${api.defaults.baseURL}/devices/export/excel`,
  importDevicesTemplateUrl: () => `${api.defaults.baseURL}/devices/import/template`,
  previewDevicesImport: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return (await api.post<DeviceImportPreview>("/devices/import/preview", formData)).data;
  },
  importDevicesExcel: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return (await api.post<DeviceImportResult>("/devices/import/excel", formData)).data;
  },

  listProjectDevices: async (projectId: number) =>
    (await api.get<ProjectDevice[]>(`/projects/${projectId}/devices`)).data,
  createProjectDevice: async (
    projectId: number,
    payload: Omit<ProjectDevice, "id" | "project_id" | "device">,
  ) => (await api.post<ProjectDevice>(`/projects/${projectId}/devices`, payload)).data,
  updateProjectDevice: async (
    projectId: number,
    projectDeviceId: number,
    payload: Omit<ProjectDevice, "id" | "project_id" | "device">,
  ) => (await api.put<ProjectDevice>(`/projects/${projectId}/devices/${projectDeviceId}`, payload)).data,
  deleteProjectDevice: async (projectId: number, projectDeviceId: number) =>
    api.delete(`/projects/${projectId}/devices/${projectDeviceId}`),

  getCopperSettings: async (projectId: number) =>
    (await api.get<CopperSettings | null>(`/projects/${projectId}/copper-settings`)).data,
  upsertCopperSettings: async (projectId: number, payload: CopperSettings) =>
    (await api.put<CopperSettings>(`/projects/${projectId}/copper-settings`, payload)).data,
  listCopperDefinitions: async (kind?: "main" | "branch") =>
    (await api.get<CopperDefinition[]>("/copper-definitions", { params: kind ? { kind } : undefined })).data,
  getCopperDefinition: async (id: number) =>
    (await api.get<CopperDefinition>(`/copper-definitions/${id}`)).data,
  createCopperDefinition: async (payload: Omit<CopperDefinition, "id" | "created_at" | "updated_at">) =>
    (await api.post<CopperDefinition>("/copper-definitions", payload)).data,
  updateCopperDefinition: async (id: number, payload: Omit<CopperDefinition, "id" | "created_at" | "updated_at">) =>
    (await api.put<CopperDefinition>(`/copper-definitions/${id}`, payload)).data,
  deleteCopperDefinition: async (definitionId: number) => api.delete(`/copper-definitions/${definitionId}`),

  // Faz Etiketleri
  listPhaseLabels: async () => (await api.get<PhaseLabel[]>("/phase-labels")).data,
  createPhaseLabel: async (label: string, color: string) =>
    (await api.post<PhaseLabel>("/phase-labels", { label, color })).data,
  updatePhaseLabel: async (id: number, color: string) =>
    (await api.put<PhaseLabel>(`/phase-labels/${id}`, { color })).data,
  deletePhaseLabel: async (id: number) => api.delete(`/phase-labels/${id}`),

  // Faz Tipleri
  listPhaseTypes: async () => (await api.get<PhaseType[]>("/phase-types")).data,
  createPhaseType: async (name: string, phases: string) =>
    (await api.post<PhaseType>("/phase-types", { name, phases })).data,
  deletePhaseType: async (id: number) => api.delete(`/phase-types/${id}`),

  listConnections: async (projectId: number) =>
    (await api.get<DeviceConnection[]>(`/projects/${projectId}/connections`)).data,
  createConnection: async (
    projectId: number,
    payload: {
      source_type: string;
      source_device_id?: number | null;
      source_terminal_id?: number | null;
      target_device_id: number;
      target_terminal_id: number;
      phase: string;
      connection_type: string;
    },
  ) => (await api.post<DeviceConnection>(`/projects/${projectId}/connections`, payload)).data,
  updateConnection: async (
    projectId: number,
    connectionId: number,
    payload: {
      source_type: string;
      source_device_id?: number | null;
      source_terminal_id?: number | null;
      target_device_id: number;
      target_terminal_id: number;
      phase: string;
      connection_type: string;
    },
  ) => (await api.put<DeviceConnection>(`/projects/${projectId}/connections/${connectionId}`, payload)).data,
  deleteConnection: async (projectId: number, connectionId: number) =>
    api.delete(`/projects/${projectId}/connections/${connectionId}`),
  autoAssignConnections: async (projectId: number) =>
    (await api.post<DeviceConnection[]>(`/projects/${projectId}/connections/auto-assign`)).data,

  validateProject: async (projectId: number) =>
    (await api.post<ValidationResult>(`/projects/${projectId}/validate`)).data,
  calculateProject: async (projectId: number) =>
    (await api.post(`/projects/${projectId}/calculate`)).data,
  getResults: async (projectId: number) =>
    (await api.get<CalculationResults>(`/projects/${projectId}/results`)).data,

  exportUrl: (projectId: number, type: "pdf" | "dxf" | "excel" | "csv") =>
    `${api.defaults.baseURL}/projects/${projectId}/export/${type}`,
};
