/**
 * Auth store — Zustand.
 * Stores the authenticated user and provides login/logout actions.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@ai-classroom/shared-types";
import api, { initCsrf } from "@/lib/api";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      fetchMe: async () => {
        try {
          set({ isLoading: true });
          const { data } = await api.get<User>("/api/v1/auth/me");
          set({ user: data, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (email, password) => {
        await initCsrf();
        const { data } = await api.post<{ user: User }>("/api/v1/auth/login", {
          email,
          password,
        });
        set({ user: data.user, isAuthenticated: true });
      },

      logout: async () => {
        await api.post("/api/v1/auth/logout");
        set({ user: null, isAuthenticated: false });
        get().setUser(null);
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
