/**
 * Auth store — Zustand.
 * Stores the authenticated user + Bearer token and provides login/logout/fetchMe actions.
 * Token is persisted to localStorage and injected into Axios via api.ts interceptor.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@ai-classroom/shared-types";
import api from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      fetchMe: async () => {
        try {
          set({ isLoading: true });
          const { data } = await api.get<{ user: User }>("/api/v1/auth/me");
          set({ user: data.user, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (email, password) => {
        const { data } = await api.post<{ user: User; token: string }>(
          "/api/v1/auth/login",
          { email, password }
        );
        set({ user: data.user, token: data.token, isAuthenticated: true });
      },

      logout: async () => {
        try {
          await api.post("/api/v1/auth/logout");
        } catch {
          // ignore errors on logout
        }
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
