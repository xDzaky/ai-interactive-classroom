import { createBrowserRouter, Navigate, useRouteError, isRouteErrorResponse } from "react-router-dom";
import { lazy, Suspense } from "react";

// Lazy-loaded pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const CreateRoomPage = lazy(() => import("@/pages/room/CreateRoomPage"));
const LobbyPage = lazy(() => import("@/pages/room/LobbyPage"));
const RoomPage = lazy(() => import("@/pages/room/RoomPage"));
const JoinPage = lazy(() => import("@/pages/room/JoinPage"));
const ControllerPage = lazy(() =>
  import("@/pages/room/ControllerPage").then((m) => ({ default: m.ControllerPage })),
);
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const ReplayViewer = lazy(() => import("@/pages/room/ReplayViewer"));
const PersonalRoomPage = lazy(() => import("@/pages/room/PersonalRoomPage"));
const NotesPage = lazy(() => import("@/pages/notes/NotesPage"));
const AffineWorkspacePage = lazy(() => import("@/pages/workspace/AffineWorkspacePage"));
const PresenterViewPage = lazy(() => import("@/pages/presenter/PresenterViewPage"));

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-slate-900">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
    </div>
  );
}

function RouteError() {
  const error = useRouteError();
  const errorMessage = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
    ? error.message
    : "Terjadi kesalahan tidak terduga.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 p-6 text-center text-white selection:bg-indigo-500 selection:text-white">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/20 text-2xl text-red-400 shadow-lg shadow-red-500/10">
        ⚠️
      </div>
      <h1 className="text-xl font-bold tracking-tight text-white">
        Terjadi Gangguan pada Halaman
      </h1>
      <p className="mt-2 max-w-md text-xs text-slate-400">{errorMessage}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95"
        >
          Muat Ulang Halaman
        </button>
        <button
          type="button"
          onClick={() => (window.location.href = "/dashboard")}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 active:scale-95"
        >
          Kembali ke Dashboard
        </button>
      </div>
    </div>
  );
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "login", element: withSuspense(LoginPage) },
      { path: "dashboard", element: withSuspense(DashboardPage) },
      { path: "rooms/create", element: withSuspense(CreateRoomPage) },
      { path: "room/new", element: withSuspense(CreateRoomPage) },
      { path: "room/:roomId/lobby", element: withSuspense(LobbyPage) },
      { path: "join", element: withSuspense(JoinPage) },
      { path: "join/:code", element: withSuspense(JoinPage) },
      { path: "room/:roomId", element: withSuspense(RoomPage) },
      { path: "room/:roomId/replay", element: withSuspense(ReplayViewer) },
      { path: "whiteboard", element: withSuspense(PersonalRoomPage) },
      { path: "notes", element: withSuspense(NotesPage) },
      { path: "notes/:notebookId", element: withSuspense(NotesPage) },
      { path: "workspace", element: withSuspense(AffineWorkspacePage) },
      { path: "workspace/:docId", element: withSuspense(AffineWorkspacePage) },
      { path: "presenter", element: withSuspense(PresenterViewPage) },
      { path: "room/personal", element: withSuspense(PersonalRoomPage) },
      { path: "sandbox", element: withSuspense(PersonalRoomPage) },
      { path: "controller", element: withSuspense(ControllerPage) },
      { path: "remote", element: withSuspense(ControllerPage) },
      { path: "connect", element: withSuspense(ControllerPage) },
      { path: "*", element: withSuspense(NotFoundPage) },
    ],
  },
]);
