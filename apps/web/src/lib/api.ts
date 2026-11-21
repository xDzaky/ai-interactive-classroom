/**
 * Axios instance for Laravel API.
 * Handles CSRF token for Sanctum SPA auth (K003).
 */
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  withCredentials: true, // Required for Sanctum cookie auth
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

// Intercept responses to handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 419) {
      // CSRF mismatch — refresh token and retry
      await api.get("/sanctum/csrf-cookie");
      return api.request(error.config);
    }
    if (error.response?.status === 401) {
      // Redirect to login if unauthenticated
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

/** Call once before login to get CSRF cookie (K003) */
export async function initCsrf() {
  await api.get("/sanctum/csrf-cookie");
}

export default api;
