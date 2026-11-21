import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { School, Classroom } from "@ai-classroom/shared-types";
import CreateClassroomModal from "@/components/CreateClassroomModal";

function SchoolCard({ school }: { school: School }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["classrooms", school.id],
    queryFn: async () => {
      const res = await api.get<{ data: Classroom[] }>(
        `/api/v1/schools/${school.id}/classrooms`,
      );
      return res.data.data;
    },
  });

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{school.name}</h2>
            <p className="text-xs text-slate-500">
              Zona Waktu:{" "}
              {typeof school.settings?.timezone === "string"
                ? school.settings.timezone
                : "Asia/Jakarta"}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50 hover:border-indigo-300 active:scale-95"
        >
          <span>+</span>
          <span>{t("dashboard.createClassroom")}</span>
        </button>
      </div>

      {showCreate && (
        <CreateClassroomModal
          schoolId={school.id}
          onClose={() => setShowCreate(false)}
        />
      )}

      {isLoading ? (
        <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : !data?.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-sm font-medium text-slate-600">
            {t("dashboard.noClassrooms")}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Mulai dengan menambahkan kelas baru pada sekolah ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((cls) => (
            <div
              key={cls.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-500/5"
            >
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    {cls.grade_level || "Umum"}
                  </span>
                  <span className="text-xs font-medium text-slate-400">
                    {cls.subject || "Mata Pelajaran"}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {cls.name}
                </h3>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <button
                  onClick={() => navigate("/rooms/create")}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-50 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-600 hover:text-white"
                >
                  <span>Mulai Sesi Kelas</span>
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) navigate("/login", { replace: true });
  }, [isAuthenticated, navigate]);

  const { data: schools, isLoading } = useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const res = await api.get<{ data: School[] }>("/api/v1/schools");
      return res.data.data;
    },
    enabled: isAuthenticated,
  });

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Top Navbar */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md px-6 py-3.5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-xs font-bold text-white shadow-md shadow-indigo-500/20">
              AI
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight">
                AI Interactive Classroom
              </span>
              <span className="ml-2 hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 sm:inline-block">
                Online
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
              <p className="text-[11px] text-slate-400 capitalize">
                {user?.role ? user.role.replace("_", " ") : "Pengajar"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 active:scale-95"
            >
              {t("auth.logout")}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Hero Welcome Banner */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-8 text-white shadow-xl shadow-indigo-950/10">
          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200 backdrop-blur-sm">
                <span>✨ Ruang Kelas Cerdas</span>
                <span>•</span>
                <span>Whiteboard + 3D Math + AI</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Selamat Datang, {user?.name || "Pengajar"}! 👋
              </h1>
              <p className="mt-1 text-sm text-indigo-200">
                Mulai sesi mengajar interaktif, gunakan visualisasi 3D, atau bagikan remote smartphone.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate("/rooms/create")}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-indigo-900 shadow-md shadow-black/10 transition hover:bg-indigo-50 active:scale-95"
              >
                <svg
                  className="h-4 w-4 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                <span>Buat Sesi Ruangan</span>
              </button>
              <Link
                to="/controller"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
              >
                <span>📱 Remote HP</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Section Title */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Daftar Sekolah & Kelas</h2>
            <p className="text-xs text-slate-500">Kelola ruang kelas dan sesi pelajaran aktif</p>
          </div>
        </div>

        {/* Schools & Classrooms List */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : !schools?.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              🏫
            </div>
            <h3 className="font-semibold text-slate-800">{t("dashboard.noClassrooms")}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Belum ada data sekolah atau kelas yang terdaftar.
            </p>
          </div>
        ) : (
          schools.map((school) => <SchoolCard key={school.id} school={school} />)
        )}
      </main>
    </div>
  );
}
