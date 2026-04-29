import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ProjectState {
  activeProjectId: number | null;
  setActiveProjectId: (projectId: number | null) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
    }),
    {
      name: "panelforge-project-store",
    },
  ),
);
