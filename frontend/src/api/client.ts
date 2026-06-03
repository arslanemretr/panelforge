import axios from "axios";

import type {
  AuthToken,
  AuthUser,
  BendType,
  BranchConductor,
  CalculationResults,
  ClientProject,
  CopperDefinition,
  CopperSettings,
  Device,
  DeviceImportPreview,
  DeviceImportResult,
  DeviceConnection,
  Firm,
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

// ── Auth interceptors ────────────────────────────────────────────────────────
// Request: her isteğe Authorization header ekle
api.interceptors.request.use((config) => {
  // Dinamik import: store'u doğrudan import etmek döngüsel bağımlılık yaratır
  try {
    const raw = localStorage.getItem("panelforge-auth");
    if (raw) {
      const { state } = JSON.parse(raw);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    }
  } catch {
    // ignore
  }
  return config;
});

// Response: 401 → refresh dene → başarısızsa logout
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (token ? p.resolve(token) : p.reject(error)));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry || original.url?.includes("/auth/")) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const raw = localStorage.getItem("panelforge-auth");
      const { state } = raw ? JSON.parse(raw) : { state: null };
      if (!state?.refreshToken) throw new Error("no refresh token");

      const { data } = await axios.post<AuthToken>(
        `${api.defaults.baseURL}/auth/refresh`,
        { refresh_token: state.refreshToken },
      );

      // Store'u güncelle
      const stored = raw ? JSON.parse(raw) : {};
      stored.state = { ...stored.state, accessToken: data.access_token, refreshToken: data.refresh_token, user: data.user };
      localStorage.setItem("panelforge-auth", JSON.stringify(stored));

      api.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
      processQueue(null, data.access_token);
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      // Logout
      const raw = localStorage.getItem("panelforge-auth");
      if (raw) {
        const stored = JSON.parse(raw);
        stored.state = { ...stored.state, user: null, accessToken: null, refreshToken: null };
        localStorage.setItem("panelforge-auth", JSON.stringify(stored));
      }
      window.location.href = "/login";
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);

export const client = {
  // Auth
  login: async (email: string, password: string) =>
    (await api.post<AuthToken>("/auth/login", { email, password })).data,
  refreshToken: async (refresh_token: string) =>
    (await api.post<AuthToken>("/auth/refresh", { refresh_token })).data,
  getMe: async () => (await api.get<AuthUser>("/auth/me")).data,
  changePassword: async (current_password: string, new_password: string) =>
    api.put("/auth/me/password", { current_password, new_password }),

  // Kullanıcı Yönetimi (admin)
  listUsers: async () => (await api.get<AuthUser[]>("/users")).data,
  createUser: async (payload: { email: string; full_name: string; password: string; role: string }) =>
    (await api.post<AuthUser>("/users", payload)).data,
  updateUser: async (id: number, payload: { full_name: string; role: string; is_active: boolean }) =>
    (await api.put<AuthUser>(`/users/${id}`, payload)).data,
  adminResetPassword: async (id: number, new_password: string) =>
    api.put(`/users/${id}/password`, { new_password }),

  // Firma
  listFirms: async () => (await api.get<Firm[]>("/firms")).data,
  createFirm: async (payload: Omit<Firm, "id" | "created_at" | "updated_at">) =>
    (await api.post<Firm>("/firms", payload)).data,
  updateFirm: async (id: number, payload: Omit<Firm, "id" | "created_at" | "updated_at">) =>
    (await api.put<Firm>(`/firms/${id}`, payload)).data,
  deleteFirm: async (id: number) => api.delete(`/firms/${id}`),

  // Proje (müşteri projesi)
  listClientProjects: async (firmId?: number) =>
    (await api.get<ClientProject[]>("/client-projects", { params: firmId ? { firm_id: firmId } : undefined })).data,
  createClientProject: async (payload: { firm_id: number; code?: string | null; name: string; agreement_date?: string | null; planned_completion_date?: string | null }) =>
    (await api.post<ClientProject>("/client-projects", payload)).data,
  updateClientProject: async (id: number, payload: { firm_id: number; code?: string | null; name: string; agreement_date?: string | null; planned_completion_date?: string | null }) =>
    (await api.put<ClientProject>(`/client-projects/${id}`, payload)).data,
  deleteClientProject: async (id: number) => api.delete(`/client-projects/${id}`),

  // Bakır Projesi
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
  updateProjectPanel: async (projectId: number, panelId: number, payload: Partial<Omit<ProjectPanel, "id" | "project_id" | "panel_definition">>) =>
    (await api.put<ProjectPanel>(`/projects/${projectId}/panel-layout/${panelId}`, payload)).data,
  resetProjectPanelFromLibrary: async (projectId: number, panelId: number) =>
    (await api.post<ProjectPanel>(`/projects/${projectId}/panel-layout/${panelId}/reset`, {})).data,

  listProjectCoppers: async (projectId: number) =>
    (await api.get<ProjectCopper[]>(`/projects/${projectId}/copper-layout`)).data,
  createProjectCopper: async (
    projectId: number,
    payload: { copper_definition_id: number; length_mm: number; quantity: number },
  ) => (await api.post<ProjectCopper>(`/projects/${projectId}/copper-layout`, payload)).data,
  updateProjectCopper: async (
    projectId: number,
    copperId: number,
    payload: Partial<Omit<ProjectCopper, "id" | "project_id" | "seq" | "copper_definition" | "phase_type">>,
  ) => (await api.put<ProjectCopper>(`/projects/${projectId}/copper-layout/${copperId}`, payload)).data,
  resetProjectCopperFromLibrary: async (projectId: number, copperId: number) =>
    (await api.post<ProjectCopper>(`/projects/${projectId}/copper-layout/${copperId}/reset`, {})).data,
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
      bend_type_id?: number | null;
      branch_conductor_id?: number | null;
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
      bend_type_id?: number | null;
      branch_conductor_id?: number | null;
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
