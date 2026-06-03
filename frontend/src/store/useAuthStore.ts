import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: "admin" | "engineer" | "operator" | "viewer";
  is_active: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;

  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;

  // Yetki yardımcıları
  isAdmin: () => boolean;
  isEngineer: () => boolean;   // admin + engineer
  isOperator: () => boolean;   // admin + engineer + operator
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null }),

      isAdmin: () => get().user?.role === "admin",

      isEngineer: () => {
        const role = get().user?.role;
        return role === "admin" || role === "engineer";
      },

      isOperator: () => {
        const role = get().user?.role;
        return role === "admin" || role === "engineer" || role === "operator";
      },
    }),
    {
      name: "panelforge-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
