import { useState, useCallback, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  createInitialBoardState,
  applyEvent,
} from "@ai-classroom/whiteboard-core";
import type { BoardState, WhiteboardEvent } from "@ai-classroom/whiteboard-core";
import { WhiteboardCanvas } from "@/pages/whiteboard/WhiteboardCanvas";
import { ToolBar } from "@/components/whiteboard/ToolBar";
import { useWhiteboardTool } from "@/hooks/useWhiteboardTool";
import { SolidViewer } from "@/components/math/SolidViewer";
import { GraphViewer } from "@/components/math/GraphViewer";
import { exportStageToPng } from "@/lib/exportPng";
import type { SolidParams } from "@ai-classroom/geometry-core";
import type Konva from "konva";

const PERSONAL_ROOM_ID = "personal-sandbox";
const GUEST_ID = "guest-me";

export default function PersonalRoomPage() {
  const [boardState, setBoardState] = useState<BoardState>(() =>
    createInitialBoardState(PERSONAL_ROOM_ID),
  );
  const seqRef = useRef(0);
  const stageRef = useRef<Konva.Stage | null>(null);

  // Modals for 3D & 2D Math tools
  const [show3dModal, setShow3dModal] = useState(false);
  const [showGraphModal, setShowGraphModal] = useState(false);

  // Default solid params for 3D viewer
  const [solidParams, setSolidParams] = useState<SolidParams>({
    type: "cube",
    s: 3,
  });

  // Canvas size
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  useEffect(() => {
    function update() {
      const w = window.innerWidth - 64; // minus toolbar
      const h = window.innerHeight - 56; // minus header
      setCanvasSize({ width: Math.max(400, w), height: Math.max(300, h) });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleEvent = useCallback((event: WhiteboardEvent) => {
    setBoardState((prev) => applyEvent(prev, event)[0]);
  }, []);

  const {
    toolState,
    setTool,
    setColor,
    setStrokeWidth,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useWhiteboardTool(handleEvent, seqRef);

  const handlePointerDown = useCallback(
    (pt: { x: number; y: number; pressure: number }) => {
      onPointerDown(pt, PERSONAL_ROOM_ID, GUEST_ID);
    },
    [onPointerDown],
  );

  const handlePointerMove = useCallback(
    (pt: { x: number; y: number; pressure: number }) => {
      const ev = onPointerMove(pt, PERSONAL_ROOM_ID, GUEST_ID);
      if (ev) setBoardState((prev) => applyEvent(prev, ev)[0]);
    },
    [onPointerMove],
  );

  const handlePointerUp = useCallback(
    (pt: { x: number; y: number; pressure: number }) => {
      const ev = onPointerUp(pt, PERSONAL_ROOM_ID, GUEST_ID);
      if (ev) setBoardState((prev) => applyEvent(prev, ev)[0]);
    },
    [onPointerUp],
  );

  function handleClearBoard() {
    if (window.confirm("Yakin ingin menghapus seluruh coretan di papan?")) {
      setBoardState(createInitialBoardState(PERSONAL_ROOM_ID));
    }
  }

  function handleExportPng() {
    exportStageToPng(stageRef.current, {
      filename: `whiteboard-pribadi-${new Date().toISOString().slice(0, 10)}.png`,
    });
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-900 text-white selection:bg-indigo-500 selection:text-white">
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
              <span className="text-sm font-bold tracking-tight text-white">
                Papan Tulis Pribadi
              </span>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Mode Tanpa Login
              </span>
            </div>
            <p className="hidden text-[11px] text-slate-400 sm:block">
              Ruang eksplorasi gambar, visual 3D, dan grafik fungsi matematika
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* 3D Math Modal Trigger */}
          <button
            type="button"
            onClick={() => setShow3dModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-600/20 px-3 py-1.5 text-xs font-medium text-indigo-300 transition hover:bg-indigo-600/30 hover:text-white"
            title="Buka Visualisasi 3D Bangun Ruang"
          >
            <span>🧊</span>
            <span className="hidden sm:inline">Bangun 3D</span>
          </button>

          {/* 2D Graph Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowGraphModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-600/20 px-3 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-600/30 hover:text-white"
            title="Buka Grafik 2D Fungsi Matematika"
          >
            <span>📈</span>
            <span className="hidden sm:inline">Grafik 2D</span>
          </button>

          {/* Export PNG */}
          <button
            type="button"
            onClick={handleExportPng}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
            title="Unduh gambar PNG"
          >
            <span>💾</span>
            <span className="hidden sm:inline">Export PNG</span>
          </button>

          {/* Clear Board */}
          <button
            type="button"
            onClick={handleClearBoard}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-red-950/40 hover:text-red-300 hover:border-red-500/30"
            title="Bersihkan Papan"
          >
            <span>🧹</span>
          </button>

          <div className="mx-1 h-5 w-px bg-slate-800" />

          {/* Login as Teacher Button */}
          <Link
            to="/login"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-500 active:scale-95"
          >
            <span>👨‍🏫 Masuk Guru</span>
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Toolbar */}
        <aside
          className="flex shrink-0 items-start justify-center border-r border-slate-800 bg-slate-900/90 p-2"
          aria-label="Toolbar Gambar"
        >
          <ToolBar
            activeTool={toolState.activeTool}
            color={toolState.color}
            strokeWidth={toolState.strokeWidth}
            onToolChange={setTool}
            onColorChange={setColor}
            onStrokeWidthChange={setStrokeWidth}
          />
        </aside>

        {/* Center: Canvas */}
        <main
          className="flex-1 overflow-hidden bg-slate-950"
          aria-label="Papan tulis pribadi"
          onPointerDown={(e) =>
            handlePointerDown({
              x: e.nativeEvent.offsetX,
              y: e.nativeEvent.offsetY,
              pressure: e.pressure,
            })
          }
          onPointerMove={(e) =>
            handlePointerMove({
              x: e.nativeEvent.offsetX,
              y: e.nativeEvent.offsetY,
              pressure: e.pressure,
            })
          }
          onPointerUp={(e) =>
            handlePointerUp({
              x: e.nativeEvent.offsetX,
              y: e.nativeEvent.offsetY,
              pressure: e.pressure,
            })
          }
        >
          <WhiteboardCanvas
            boardState={boardState}
            onEvent={handleEvent}
            width={canvasSize.width}
            height={canvasSize.height}
            showGrid={true}
            readOnly={false}
          />
        </main>
      </div>

      {/* 3D Solid Viewer Modal */}
      {show3dModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧊</span>
                <h3 className="font-bold text-white">Visualisasi 3D Bangun Ruang</h3>
              </div>
              <button
                onClick={() => setShow3dModal(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Tutup &times;
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-4">
              <SolidViewer
                params={solidParams}
                onParamsChange={setSolidParams}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2D Graph Viewer Modal */}
      {showGraphModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📈</span>
                <h3 className="font-bold text-white">Grafik 2D Fungsi Matematika (Mafs)</h3>
              </div>
              <button
                onClick={() => setShowGraphModal(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                Tutup &times;
              </button>
            </div>

            <div className="flex-1 overflow-hidden p-4">
              <GraphViewer />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
