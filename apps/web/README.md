# @ai-classroom/web

Frontend application for **AI Interactive Classroom**, built with React 19, TypeScript, Vite, and Tailwind CSS.

## Features

- **PWA & Offline-First**: Workbox service worker caching and Dexie (IndexedDB) persistent outbox for uninterrupted offline classroom usage.
- **Interactive Whiteboard**: High-performance Konva canvas with stylus pressure, palm rejection, undo/redo history, shape snapping, and LaTeX math formulas.
- **3D Solid Geometry**: React Three Fiber / Three.js 3D rendering with live parameter sliders and plane cross-sections.
- **2D Function Graphs**: Mafs Cartesian coordinate system with continuous function evaluation.
- **Realtime Sync**: Reverb WebSocket channel listener with monotonic sequence ordering and gap-fill recovery.
- **Mobile Remote Controller**: Responsive `/controller` interface for smartphone laser pointing and slide controls.
- **Accessibility**: WCAG 2.2 AA compliant with SkipToMain, semantic navigation, and focus management.

## Scripts

```bash
pnpm dev         # Start Vite dev server on :5173
pnpm build       # Typecheck and create production build
pnpm test        # Run Vitest test suite in watch mode
pnpm test:run    # Run all 331 Vitest tests once
pnpm typecheck   # Validate TypeScript types (tsc --noEmit)
pnpm lint        # Run oxlint across src/
pnpm e2e         # Run Playwright end-to-end tests
```
