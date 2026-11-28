/**
 * MicroLectureRecorderModal.tsx — Micro-Lecture Recorder UI + IndexedDB Video Library (V8)
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  deleteRecording,
  listRecordings,
  saveRecording,
  type LectureRecording,
} from '@/lib/microLectureRecorder';

export interface MicroLectureRecorderModalProps {
  open: boolean;
  onClose: () => void;
}

export const MicroLectureRecorderModal: React.FC<MicroLectureRecorderModalProps> = ({
  open,
  onClose,
}) => {
  const [recordings, setRecordings] = useState<LectureRecording[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [includeMic, setIncludeMic] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef<number>(0);

  useEffect(() => {
    if (open) void listRecordings().then(setRecordings);
  }, [open]);

  useEffect(() => {
    if (!isRecording) return;
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [isRecording]);

  if (!open) return null;

  const startRec = async () => {
    setError(null);
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const tracks = [...display.getTracks()];
      if (includeMic) {
        try {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
          tracks.push(...mic.getAudioTracks());
        } catch {
          // mic optional
        }
      }
      const combined = new MediaStream(tracks);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : 'video/webm';
      const mr = new MediaRecorder(combined, { mimeType });
      chunksRef.current = [];
      startTsRef.current = Date.now();
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = async () => {
        tracks.forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const durationSec = Math.max(1, Math.round((Date.now() - startTsRef.current) / 1000));
        await saveRecording({
          id: `rec-${Date.now()}`,
          title: `Micro-Lecture ${new Date().toLocaleTimeString('id-ID')}`,
          durationSec,
          mimeType,
          blob,
          createdAt: Date.now(),
        });
        setRecordings(await listRecordings());
        setIsRecording(false);
        setElapsed(0);
      };
      mr.start();
      recorderRef.current = mr;
      setIsRecording(true);
      setElapsed(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rekam layar dibatalkan atau tidak didukung.');
    }
  };

  const stopRec = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  return (
    <div data-testid="micro-lecture-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-900">🎥 Perekam Micro-Lecture (IndexedDB Offline)</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">Tutup ×</button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center gap-2 font-semibold text-slate-700">
              <input type="checkbox" checked={includeMic} onChange={(e) => setIncludeMic(e.target.checked)} className="accent-indigo-600" />
              Sertakan Suara Mikrofon Guru
            </label>
            {isRecording ? (
              <button type="button" onClick={stopRec} className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white shadow-sm animate-pulse">
                ⏹ Hentikan ({String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')})
              </button>
            ) : (
              <button type="button" onClick={() => void startRec()} className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-indigo-500">
                ● Mulai Rekam Layar
              </button>
            )}
          </div>

          {error && <div className="rounded-xl bg-rose-50 p-3 text-rose-700">{error}</div>}

          {previewUrl && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
              <video src={previewUrl} controls className="max-h-64 w-full" />
            </div>
          )}

          <div className="space-y-2">
            <h4 className="font-bold text-slate-700">Daftar Rekaman Tersimpan ({recordings.length})</h4>
            {recordings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-slate-400">
                Belum ada rekaman micro-lecture.
              </div>
            ) : (
              recordings.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div>
                    <div className="font-bold text-slate-800">{rec.title}</div>
                    <div className="text-[10px] text-slate-400">{rec.durationSec} detik · {(rec.blob.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setPreviewUrl(URL.createObjectURL(rec.blob))} className="rounded-lg bg-indigo-50 px-2.5 py-1 font-bold text-indigo-700">▶ Putar</button>
                    <button
                      type="button"
                      onClick={() => {
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(rec.blob);
                        a.download = `${rec.title.replace(/\s+/g, '-')}.webm`;
                        a.click();
                      }}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700"
                    >
                      ⬇ Unduh
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await deleteRecording(rec.id);
                        setRecordings(await listRecordings());
                      }}
                      className="rounded-lg bg-rose-50 px-2 py-1 font-bold text-rose-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
