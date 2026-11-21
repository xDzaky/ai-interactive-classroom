/**
 * PersonalRoomPage — Guest whiteboard sandbox (no login required)
 * URL: /whiteboard
 *
 * Board state + history managed here.
 * WhiteboardCanvas uses legacy onEvent callback — receives committed events,
 * applies them via pushHistory using boardStateRef (no stale closure).
 */
import {
  useState,
  useCallback,
  useRef,
  useEffect,
  lazy,
  Suspense,
} from "react";
import { Link } from "react-router-dom";
import {
  createInitialBoardState,
  createHistory,
  undo as historyUndo,
  redo as historyRedo,
  pushHistory,
} from "@ai-classroom/whiteboard-core";
import type { BoardState, WhiteboardEvent, WhiteboardHistory } from "@ai-classroom/whiteboard-core";
import { WhiteboardCanvas } from "@/pages/whiteboard/WhiteboardCanvas";
import { ToolBar } from "@/components/whiteboard/ToolBar";
import { exportStageToPng } from "@/lib/exportPng";
import type { SolidParams } from "@ai-classroom/geometry-core";
import type Konva from "konva";
import type { ToolType } from "@/hooks/useWhiteboardTool";

const SolidViewer = lazy(() =>
  import("@/components/math/SolidViewer").then((m) => ({ default: m.SolidViewer })),
);
const GraphViewer = lazy(() =>
  import("@/components/math/GraphViewer").then((m) => ({ default: m.GraphViewer })),
);

const PERSONAL_ROOM_ID = "personal-sandbox";

export default function PersonalRoomPage() {
  const [boardState, setBoardState] = useState<BoardState>(() =>
    createInitialBoardState(PERSONAL_ROOM_ID),
  );
  const [history, setHistory] = useState<WhiteboardHistory>(() => createHistory(100));

  // Refs so callbacks never go stale
  const boardStateRef = useRef(boardState);
  boardStateRef.current = boardState;
  const historyRef = useRef(history);
  historyRef.current = history;

  const [activeTool, setActiveTool] = useState<ToolType>("pen");
  const [color, setColor] = useState("#f8fafc");
  const [strokeWidth, setStrokeWidth] = useState(3);

  const stageRef = useRef<Konva.Stage | null>(null);
  const [show3dModal, setShow3dModal] = useState(false);
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [solidParams, setSolidParams] = useState<SolidParams>({ type: "cube", s: 3 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    function update() {
      setCanvasSize({
        width: Math.max(400, window.innerWidth - 56),
        height: Math.max(300, window.innerHeight - 56),
      });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // -------------------------------------------------------------------------
  // onEvent — stable callback, reads latest state from refs (no stale closure)
  // -------------------------------------------------------------------------
  const handleEvent = useCallback((event: WhiteboardEvent) => {
    if (
      event.event_type === "device.pointer.moved" ||
      event.event_type === "device.action"
    )
      return;
    const result = pushHistory(boardStateRef.current, historyRef.current, event);
    setBoardState(result.state);
    setHistory(result.history);
  }, []); // empty deps — reads from refs which are always current

  // -------------------------------------------------------------------------
  // Undo / Redo — same pattern
  // -------------------------------------------------------------------------
  const handleUndo = useCallback(() => {
    const result = historyUndo(boardStateRef.current, historyRef.current);
    setBoardState(result.state);
    setHistory(result.history);
  }, []);

  const handleRedo = useCallback(() => {
    const result = historyRedo(boardStateRef.current, historyRef.current);
    setBoardState(result.state);
    setHistory(result.history);
  }, []);

  // -------------------------------------------------------------------------
  // Board actions
  // -------------------------------------------------------------------------
  function handleClearBoard() {
    if (window.confirm("Yakin ingin menghapus seluruh coretan di papan?")) {
      setBoardState(createInitialBoardState(PERSONAL_ROOM_ID));
      setHistory(createHistory(100));
    }
  }

  function handleExportPng() {
    exportStageToPng(stageRef.current, {
      filename: `whiteboard-pribadi-${new Date().toISOString().slice(0, 10)}.png`,
    });
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white">
      {/* Top Navbar */}
      <header className="z-20 flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-xs font-bold text-white shadow-md shadow-indigo-500/20"
          >
            AI
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight">Papan Tulis Pribadi</span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Mode Tanpa Login
              </span>
            </div>
            <p className="hidden text-[11px] text-slate-400 sm:block">
              Ruang eksplorasi gambar, visual 3D, dan grafik fungsi matematika
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShow3dModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600/20 px-3 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-600/30 hover:text-white">
            <span>🧊</span><span className="hidden sm:inline">Bangun 3D</span>
          </button>
          <button type="button" onClick={() => setShowGraphModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-600/20 px-3 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-600/30 hover:text-white">
            <span>📈</span><span className="hidden sm:inline">Grafik 2D</span>
          </button>
          <button type="button" onClick={handleExportPng}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white">
            <span>💾</span><span className="hidden sm:inline">Export PNG</span>
          </button>
          <button type="button" onClick={handleClearBoard} title="Bersihkan Papan"
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-red-950/40 hover:text-red-300 hover:border-red-500/30">
            <span>🧹</span>
          </button>
          <div className="mx-1 h-5 w-px bg-slate-800" />
          <Link to="/login"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95">
            👨‍🏫 Masuk Guru
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <aside data-toolbar
          className="flex shrink-0 items-start justify-center border-r border-slate-800 bg-slate-900/90 p-1.5"
          aria-label="Toolbar Gambar" style={{ zIndex: 10 }}>
          <ToolBar
            activeTool={activeTool}
            color={color}
            strokeWidth={strokeWidth}
            onToolChange={setActiveTool}
            onColorChange={setColor}
            onStrokeWidthChange={setStrokeWidth}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
          />
        </aside>

        {/* Canvas — uses legacy onEvent which routes to handleEvent */}
        <main className="relative flex-1 overflow-hidden" aria-label="Papan tulis pribadi">
          <WhiteboardCanvas
            boardState={boardState}
            onEvent={handleEvent}
            width={canvasSize.width}
            height={canvasSize.height}
            showGrid
            readOnly={false}
            activeTool={activeTool}
            color={color}
            strokeWidth={strokeWidth}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={history.past.length > 0}
            canRedo={history.future.length > 0}
            stageRef={stageRef}
          />
        </main>
      </div>

      {/* 3D Modal */}
      {show3dModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧊</span>
                <h3 className="font-bold">Visualisasi 3D Bangun Ruang</h3>
              </div>
              <button onClick={() => setShow3dModal(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white">
                Tutup &times;
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" /></div>}>
                <SolidViewer params={solidParams} onParamsChange={setSolidParams} />
              </Suspense>
            </div>
          </div>
        </div>
      )}

      {/* 2D Graph Modal */}
      {showGraphModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📈</span>
                <h3 className="font-bold">Grafik 2D Fungsi Matematika</h3>
              </div>
              <button onClick={() => setShowGraphModal(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white">
                Tutup &times;
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <Suspense fallback={<div className="flex h-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" /></div>}>
                <GraphViewer />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
