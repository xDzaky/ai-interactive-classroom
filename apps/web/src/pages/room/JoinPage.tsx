import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, Link } from "react-router-dom";
import { joinRoom } from "@/lib/api/rooms";

export default function JoinPage() {
  const { t } = useTranslation();
  const { code: routeCode } = useParams<{ code?: string }>();
  const navigate = useNavigate();

  const [code, setCode] = useState(routeCode ? routeCode.toUpperCase() : "");
  const [alias, setAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (routeCode) {
      setCode(routeCode.toUpperCase());
    }
  }, [routeCode]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setError("Masukkan 8 digit kode ruangan.");
      return;
    }
    if (cleanCode.length !== 8) {
      setError("Kode ruangan harus tepat 8 karakter (contoh: ABC12345).");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const studentAlias = alias.trim() || undefined;
      const result = await joinRoom(cleanCode, studentAlias as string);

      // Store participant token locally so RoomPage can authenticate
      localStorage.setItem(
        `ai-classroom-participant-${result.participant.room_id}`,
        result.participant_token,
      );

      navigate(`/room/${result.participant.room_id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Gagal bergabung ke ruangan. Pastikan kode benar dan ruangan aktif.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 selection:bg-indigo-500 selection:text-white">
      {/* Decorative ambient background glows */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/90 p-8 shadow-2xl shadow-indigo-950/50 backdrop-blur-xl sm:p-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 shadow-lg shadow-blue-500/30">
              <span className="text-2xl">🎓</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Gabung ke Ruang Kelas
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Masukkan kode ruangan yang diberikan oleh gurumu untuk mulai belajar
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-950/50 p-4 text-sm text-red-300"
            >
              <svg
                className="mt-0.5 h-5 w-5 shrink-0 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <div>
                <p className="font-semibold text-red-200">Gagal Bergabung</p>
                <p className="mt-0.5 text-xs text-red-300/90">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleJoin} className="space-y-4">
            {/* Room Code */}
            <div>
              <label
                htmlFor="room-code"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300"
              >
                Kode Ruangan (8 Karakter)
              </label>
              <input
                id="room-code"
                type="text"
                maxLength={8}
                autoFocus
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CONTOH: 8A4F92B1"
                className="w-full text-center font-mono text-xl tracking-widest uppercase rounded-xl border border-slate-700/80 bg-slate-800/60 py-3 px-4 text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Student Alias */}
            <div>
              <label
                htmlFor="student-alias"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-300"
              >
                Nama Panggilan Siswa
              </label>
              <input
                id="student-alias"
                type="text"
                maxLength={50}
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Nama Anda (contoh: Budi Santoso)"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-800/60 py-2.5 px-4 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-indigo-500 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Opsional. Jika dikosongkan, nama tamu otomatis akan dibuatkan.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Menghubungkan...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Kelas</span>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Quick Footer */}
          <div className="mt-8 border-t border-slate-800 pt-6 text-center text-xs text-slate-400">
            <span>Guru atau staf pengajar? </span>
            <Link
              to="/login"
              className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline"
            >
              Masuk dengan Akun Pengajar &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
