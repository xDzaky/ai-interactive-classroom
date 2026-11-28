/**
 * PresenterViewPage.tsx — Clean Projector Display for Dual-Screen Mode (`/presenter`, V8)
 */
import React, { useEffect, useState } from 'react';
import { createInitialBoardState, type BoardState } from '@ai-classroom/whiteboard-core';
import { subscribePresenterSync } from '@/lib/presenterSync';
import { WhiteboardCanvas } from '@/pages/whiteboard/WhiteboardCanvas';

export default function PresenterViewPage() {
  const [boardState, setBoardState] = useState<BoardState>(() => createInitialBoardState('presenter-local'));
  const [caption, setCaption] = useState<string | null>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    const unsub = subscribePresenterSync((msg) => {
      if (msg.type === 'board_state' && msg.boardState) {
        setBoardState(msg.boardState);
        setCaption(msg.caption ?? null);
      }
    });
    return () => {
      window.removeEventListener('resize', onResize);
      unsub();
    };
  }, []);

  return (
    <div data-testid="presenter-view-page" className="relative h-screen w-screen overflow-hidden bg-white">
      <WhiteboardCanvas
        boardState={boardState}
        activeTool="hand"
        color="#0f172a"
        strokeWidth={3}
        readOnly={true}
        width={size.w}
        height={size.h}
        onEvent={() => {}}
      />
      {caption && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-2xl bg-slate-900/90 px-5 py-2.5 text-sm font-semibold text-white shadow-2xl">
          {caption}
        </div>
      )}
      <div className="fixed top-3 right-3 z-40 rounded-full bg-slate-900/70 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-xs">
        🖥️ Layar Proyektor (Sinkron Real-Time)
      </div>
    </div>
  );
}
