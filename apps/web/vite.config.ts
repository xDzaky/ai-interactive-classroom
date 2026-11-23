import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt", // ADR-011: NEVER auto-reload during live class
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "AI Interactive Classroom",
        short_name: "AI Classroom",
        description: "Platform pembelajaran interaktif berbasis AI",
        theme_color: "#ffffff",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Don't cache API or WebSocket — always online for collab
        navigateFallbackDenylist: [/^\/api/, /^\/app/],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ai-classroom/curriculum-schema": path.resolve(__dirname, "../../packages/curriculum-schema/src"),
      "@ai-classroom/whiteboard-core": path.resolve(__dirname, "../../packages/whiteboard-core/src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/sanctum": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/broadcasting": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "query-vendor": ["@tanstack/react-query"],
          "three-vendor": ["three"],
          "canvas-vendor": ["konva", "react-konva", "perfect-freehand"],
          "math-vendor": ["mathlive", "katex"],
        },
      },
    },
  },
});
