/**
 * Axios instance for Laravel API.
 * Injects Bearer token from persisted auth store on every request.
 * Also handles 401 redirect to login.
 */
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Inject Bearer token from persisted localStorage store before each request
api.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem("auth-storage");
    if (stored) {
      const { state } = JSON.parse(stored) as { state: { token?: string } };
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
  } catch {
    // ignore JSON parse errors
  }
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 419) {
      // CSRF mismatch — retry (for SPA cookie mode)
      await api.get("/sanctum/csrf-cookie");
      return api.request(error.config);
    }
    if (error.response?.status === 401) {
      // Clear stored token and redirect to login
      localStorage.removeItem("auth-storage");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
