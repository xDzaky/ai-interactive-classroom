import { createBrowserRouter, Navigate } from "react-router-dom";
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

function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
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
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/login", element: withSuspense(LoginPage) },
  { path: "/dashboard", element: withSuspense(DashboardPage) },
  { path: "/rooms/create", element: withSuspense(CreateRoomPage) },
  { path: "/room/:roomId/lobby", element: withSuspense(LobbyPage) },
  { path: "/join", element: withSuspense(JoinPage) },
  { path: "/join/:code", element: withSuspense(JoinPage) },
  { path: "/room/:roomId", element: withSuspense(RoomPage) },
  { path: "/room/:roomId/replay", element: withSuspense(ReplayViewer) },
  { path: "/controller", element: withSuspense(ControllerPage) },
  { path: "*", element: withSuspense(NotFoundPage) },
]);
