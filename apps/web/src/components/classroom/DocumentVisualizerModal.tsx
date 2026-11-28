/**
 * DocumentVisualizerModal.tsx — Webcam / Document Camera Visualizer with Ink Annotation (V8)
 *
 * Adapted from Honghe Whiteboard (`GCShowCameraApp.exe`):
 * - Uses getUserMedia (USB doc cam, laptop webcam, or rear phone camera)
 * - Freeze Frame, Rotate 90°/180°, Digital Zoom 1x–4x, Document Contrast Filter
 * - Direct ink annotation over live/frozen camera feed + 1-click "Tangkap ke Whiteboard"
 */
import React, { useEffect, useRef, useState } from 'react';

export interface DocumentVisualizerModalProps {
  open: boolean;
  onClose: () => void;
  onCaptureToBoard?: (blob: Blob, label: string) => void;
}

export const DocumentVisualizerModal: React.FC<DocumentVisualizerModalProps> = ({
  open,
  onClose,
  onCaptureToBoard,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const inkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [rotateDeg, setRotateDeg] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [docContrast, setDocContrast] = useState(false);
  const [penColor, setPenColor] = useState('#dc2626');

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setError(null);
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((stream) => {
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Kamera tidak tersedia atau izin ditolak.');
      });

    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  const toggleFreeze = () => {
    const v = videoRef.current;
    if (!v) return;
    if (frozen) {
      void v.play();
      setFrozen(false);
    } else {
      v.pause();
      setFrozen(true);
    }
  };

  const handleCapture = () => {
    const v = videoRef.current;
    const ink = inkCanvasRef.current;
    if (!v || !onCaptureToBoard) return;
    const out = document.createElement('canvas');
    out.width = v.videoWidth || 800;
    out.height = v.videoHeight || 600;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    if (docContrast) ctx.filter = 'contrast(1.38) brightness(1.08)';
    ctx.drawImage(v, 0, 0, out.width, out.height);
    ctx.filter = 'none';
    if (ink) ctx.drawImage(ink, 0, 0, out.width, out.height);
    out.toBlob((blob) => {
      if (blob) {
        onCaptureToBoard(blob, 'Tangkapan Kamera Dokumen');
        onClose();
      }
    }, 'image/png');
  };

  const clearInk = () => {
    const c = inkCanvasRef.current;
    if (c) c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
  };

  return (
    <div
      data-testid="document-visualizer-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-5 backdrop-blur-xs"
    >
      <div className="flex h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs">
          <span className="font-bold text-slate-900">📷 Kamera Dokumen / Visualizer</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={toggleFreeze} className={`rounded-lg px-2.5 py-1 font-bold ${frozen ? 'bg-amber-500 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
              {frozen ? '▶ Lanjut' : '❄ Bekukan'}
            </button>
            <button type="button" onClick={() => setRotateDeg((d) => (d + 90) % 360)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
              ↻ {rotateDeg}°
            </button>
            <button type="button" onClick={() => setZoom((z) => (z >= 3 ? 1 : Number((z + 0.5).toFixed(1))))} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
              🔍 {zoom}x
            </button>
            <button type="button" onClick={() => setDocContrast((v) => !v)} className={`rounded-lg px-2.5 py-1 font-semibold ${docContrast ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>
              Kontras Kertas
            </button>
            <button type="button" onClick={clearInk} className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600">
              Hapus Coretan
            </button>
            {onCaptureToBoard && (
              <button type="button" onClick={handleCapture} className="rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-500">
                📸 Tangkap ke Papan
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600">
              Tutup ×
            </button>
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-950">
          {error ? (
            <div className="max-w-md rounded-2xl border border-amber-400/40 bg-amber-950/60 p-5 text-center text-xs text-amber-100">
              <div className="text-2xl mb-2">📷</div>
              <p className="font-bold mb-1">Kamera tidak terdeteksi</p>
              <p className="text-amber-200/80">{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{
                  transform: `scale(${zoom}) rotate(${rotateDeg}deg)`,
                  filter: docContrast ? 'contrast(1.38) brightness(1.08)' : 'none',
                }}
                className="h-full w-full object-contain transition-transform"
              />
              <canvas
                ref={inkCanvasRef}
                width={960}
                height={540}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drawingRef.current = true;
                  const r = e.currentTarget.getBoundingClientRect();
                  lastPtRef.current = { x: ((e.clientX - r.left) / r.width) * 960, y: ((e.clientY - r.top) / r.height) * 540 };
                }}
                onPointerMove={(e) => {
                  if (!drawingRef.current || !lastPtRef.current || !inkCanvasRef.current) return;
                  const r = inkCanvasRef.current.getBoundingClientRect();
                  const pt = { x: ((e.clientX - r.left) / r.width) * 960, y: ((e.clientY - r.top) / r.height) * 540 };
                  const ctx = inkCanvasRef.current.getContext('2d');
                  if (!ctx) return;
                  ctx.strokeStyle = penColor;
                  ctx.lineWidth = 4;
                  ctx.lineCap = 'round';
                  ctx.beginPath();
                  ctx.moveTo(lastPtRef.current.x, lastPtRef.current.y);
                  ctx.lineTo(pt.x, pt.y);
                  ctx.stroke();
                  lastPtRef.current = pt;
                }}
                onPointerUp={() => { drawingRef.current = false; lastPtRef.current = null; }}
                style={{ touchAction: 'none' }}
                className="absolute inset-0 h-full w-full cursor-crosshair"
              />
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 shadow-lg">
                <span className="text-[10px] font-bold text-slate-600">Coret Langsung:</span>
                {['#dc2626', '#2563eb', '#16a34a', '#facc15'].map((c) => (
                  <button key={c} type="button" onClick={() => setPenColor(c)} className={`h-4 w-4 rounded-full border-2 ${penColor === c ? 'border-slate-900 scale-110' : 'border-white'}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
