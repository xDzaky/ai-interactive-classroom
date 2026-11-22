/**
 * TeacherView — P04-T07
 * Teacher/host view: writable whiteboard + toolbar + room controls.
 * Shows participant list sidebar (real-time via ParticipantList, P04-T09).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  createInitialBoardState,
  applyEvent,
  getActiveScene,
} from "@ai-classroom/whiteboard-core";
import type { BoardState, WhiteboardEvent } from "@ai-classroom/whiteboard-core";
import { WhiteboardCanvas } from "@/pages/whiteboard/WhiteboardCanvas";
import { ToolBar } from "@/components/whiteboard/ToolBar";
import { useWhiteboardTool } from "@/hooks/useWhiteboardTool";
import { endRoom } from "@/lib/api/rooms";
import { ParticipantList } from "@/components/room/ParticipantList";
import { PresenterQueue } from "@/components/room/PresenterQueue";
import { ConnectDeviceModal } from "@/components/room/ConnectDeviceModal";
import { ActivityBuilder } from "@/components/room/ActivityBuilder";
import { GroupWorkspace } from "@/components/room/GroupWorkspace";
import { ClassroomTimer } from "@/components/room/ClassroomTimer";
import { RandomPicker } from "@/components/room/RandomPicker";
import { GroupGenerator } from "@/components/room/GroupGenerator";
import { TemplatePickerModal } from "@/features/templates/TemplatePickerModal";
import { ObjectsPanel, type BoardObjectItem } from "@/components/workspace/ObjectsPanel";
import { RadialMenu, type RadialMenuItem } from "@/components/whiteboard/RadialMenu";
import type { LessonTemplate } from "@ai-classroom/curriculum-schema";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TeacherViewProps {
  roomId: string;
  participantToken: string;
  /** Participant ID decoded from token (base64 segment before ".") */
  participantId: string;
  roomCode?: string;
}

// ---------------------------------------------------------------------------
// TeacherView
// ---------------------------------------------------------------------------

export function TeacherView({ roomId, participantToken: _token, participantId, roomCode }: TeacherViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ── Whiteboard state ────────────────────────────────────────────────────
  const [boardState, setBoardState] = useState<BoardState>(() => createInitialBoardState(roomId));
  const seqRef = useRef(0);

  // Handle events from tool hook → update state
  const handleEvent = useCallback((event: WhiteboardEvent) => {
    setBoardState((prev) => applyEvent(prev, event)[0]);
  }, []);

  // ── Tool state ──────────────────────────────────────────────────────────
  const {
    toolState,
    setTool,
    setColor,
    setStrokeWidth,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useWhiteboardTool(handleEvent, seqRef);

  // Wrap pointer handlers to inject roomId + participantId
  const handlePointerDown = useCallback(
    (pt: { x: number; y: number; pressure: number }) => {
      onPointerDown(pt, roomId, participantId);
    },
    [onPointerDown, roomId, participantId],
  );

  const handlePointerMove = useCallback(
    (pt: { x: number; y: number; pressure: number }) => {
      const ev = onPointerMove(pt, roomId, participantId);
      if (ev) setBoardState((prev) => applyEvent(prev, ev)[0]);
    },
    [onPointerMove, roomId, participantId],
  );

  const handlePointerUp = useCallback(
    (pt: { x: number; y: number; pressure: number }) => {
      const ev = onPointerUp(pt, roomId, participantId);
      if (ev) setBoardState((prev) => applyEvent(prev, ev)[0]);
    },
    [onPointerUp, roomId, participantId],
  );

  // ── Canvas size ─────────────────────────────────────────────────────────
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    function update() {
      const w = window.innerWidth - 56 - 224; // minus toolbar + sidebar
      const h = window.innerHeight - 56;      // minus header
      setCanvasSize({ width: Math.max(400, w), height: Math.max(300, h) });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── End room ────────────────────────────────────────────────────────────
  const endMutation = useMutation({
    mutationFn: () => endRoom(roomId),
    onSuccess: () => navigate("/dashboard"),
  });

  // ── Connect Device modal ─────────────────────────────────────────────────
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [objectsPanelOpen, setObjectsPanelOpen] = useState(false);

  // ── Extract objects from active scene for ObjectsPanel ───────────────────
  const activeScene = getActiveScene(boardState);
  const boardObjects: BoardObjectItem[] = Object.values(activeScene?.objects || {}).map((obj: any) => ({
    id: obj.id,
    type: obj.type,
    label: obj.label || obj.solidType || obj.type,
    color: obj.color || '#6366f1',
    hidden: !!obj.display?.hidden,
    locked: !!obj.locked,
  }));

  const handleSelectTemplate = useCallback((template: LessonTemplate) => {
    if (template.boardState) {
      setBoardState(template.boardState as unknown as BoardState);
    }
  }, []);

  const radialItems: RadialMenuItem[] = [
    { id: 'pen', label: 'Pena', icon: '✏️', action: () => setTool('pen') },
    { id: 'eraser', label: 'Hapus', icon: '⌫', action: () => setTool('eraser') },
    { id: 'rect', label: 'Kotak', icon: '▭', action: () => setTool('rect') },
    { id: 'circle', label: 'Lingkaran', icon: '◯', action: () => setTool('circle') },
    { id: 'template', label: 'Template', icon: '📚', action: () => setTemplateModalOpen(true) },
  ];

  // ── Participant count shown in header (ParticipantList sidebar has full list) ─
  const [participantCount] = useState(1);

  return (
    <div className="flex h-screen flex-col bg-slate-900 text-white overflow-hidden">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-slate-700 px-4">
        <span className="text-sm font-semibold text-green-400 flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse"
            aria-hidden="true"
          />
          {t("room.live")}
        </span>
        {roomCode && (
          <span className="font-mono text-xs text-slate-400">
            {t("room.joinCode")}: <strong className="text-white">{roomCode}</strong>
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setObjectsPanelOpen(!objectsPanelOpen)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              objectsPanelOpen ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            aria-label="Daftar Objek"
          >
            📋 Objek ({boardObjects.length})
          </button>
          <button
            onClick={() => setTemplateModalOpen(true)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            aria-label="Pustaka Template"
          >
            📚 Template
          </button>
          <span className="text-xs text-slate-400">
            {t("room.participants", { count: participantCount })}
          </span>
          <button
            onClick={() => setDeviceModalOpen(true)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            aria-label={t("device.connectDevice")}
          >
            {t("device.connectDevice")}
          </button>
          <button
            onClick={() => {
              if (window.confirm(t("room.endRoom") + "?")) {
                endMutation.mutate();
              }
            }}
            disabled={endMutation.isPending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
            aria-label={t("room.endRoom")}
          >
            {endMutation.isPending ? "…" : t("room.endRoom")}
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Leftmost: Collapsible ObjectsPanel */}
        {objectsPanelOpen && (
          <ObjectsPanel
            objects={boardObjects}
            onSelect={(_id) => {}}
            onToggleVisibility={(id, hidden) => {
              handleEvent({
                type: 'whiteboard.object.updated',
                roomId,
                actorId: participantId,
                objectId: id,
                patch: { display: { hidden } },
                seq: ++seqRef.current,
                timestamp: Date.now(),
              } as unknown as WhiteboardEvent);
            }}
            onToggleLock={(id, locked) => {
              handleEvent({
                type: 'whiteboard.object.updated',
                roomId,
                actorId: participantId,
                objectId: id,
                patch: { locked },
                seq: ++seqRef.current,
                timestamp: Date.now(),
              } as unknown as WhiteboardEvent);
            }}
            onRename={(id, label) => {
              handleEvent({
                type: 'whiteboard.object.updated',
                roomId,
                actorId: participantId,
                objectId: id,
                patch: { label },
                seq: ++seqRef.current,
                timestamp: Date.now(),
              } as unknown as WhiteboardEvent);
            }}
            onDelete={(id) => {
              handleEvent({
                type: 'whiteboard.object.deleted',
                roomId,
                actorId: participantId,
                objectId: id,
                seq: ++seqRef.current,
                timestamp: Date.now(),
              } as unknown as WhiteboardEvent);
            }}
            isOpen={objectsPanelOpen}
            onClose={() => setObjectsPanelOpen(false)}
          />
        )}

        {/* Left: toolbar */}
        <aside
          className="flex shrink-0 items-start justify-center bg-slate-800 border-r border-slate-700 p-2"
          aria-label={t("room.toolbar") ?? "Toolbar"}
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

        {/* Center: canvas */}
        <main
          className="flex-1 overflow-hidden"
          aria-label="Papan tulis"
          onPointerDown={(e) =>
            handlePointerDown({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, pressure: e.pressure })
          }
          onPointerMove={(e) =>
            handlePointerMove({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, pressure: e.pressure })
          }
          onPointerUp={(e) =>
            handlePointerUp({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, pressure: e.pressure })
          }
        >
          <WhiteboardCanvas
            boardState={boardState}
            onEvent={handleEvent}
            width={canvasSize.width}
            height={canvasSize.height}
            showGrid
            readOnly={false}
          />
        </main>

        {/* Right: participant list (real-time via ParticipantList) */}
        <aside
          className="flex w-56 shrink-0 flex-col border-l border-slate-700 bg-slate-800"
          aria-label={t("room.participants", { count: 0 })}
        >
          <ParticipantList roomId={roomId} authToken={_token || undefined} />
          <PresenterQueue roomId={roomId} authToken={_token || undefined} />
          <ActivityBuilder roomId={roomId} />
          <GroupWorkspace roomId={roomId} />
          <ClassroomTimer canControl />
          <RandomPicker participants={[]} />
          <GroupGenerator roomId={roomId} participants={[]} />
        </aside>
      </div>

      {/* Connect Device Modal */}
      <ConnectDeviceModal
        roomId={roomId}
        open={deviceModalOpen}
        onClose={() => setDeviceModalOpen(false)}
      />

      {/* Floating Radial Quick Action Menu */}
      <RadialMenu items={radialItems} />

      {/* Lesson Template Library Modal */}
      <TemplatePickerModal
        isOpen={templateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  );
}
