import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { School, Classroom } from "@ai-classroom/shared-types";
import CreateClassroomModal from "@/components/CreateClassroomModal";

function SchoolCard({ school }: { school: School }) {
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["classrooms", school.id],
    queryFn: async () => {
      const res = await api.get<{ data: Classroom[] }>(
        `/api/v1/schools/${school.id}/classrooms`
      );
      return res.data.data;
    },
  });

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">{school.name}</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
        >
          + {t("dashboard.createClassroom")}
        </button>
      </div>
      {showCreate && (
        <CreateClassroomModal schoolId={school.id} onClose={() => setShowCreate(false)} />
      )}
      {isLoading ? (
        <p className="text-sm text-slate-400">{t("common.loading")}</p>
      ) : !data?.length ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
          {t("dashboard.noClassrooms")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((cls) => (
            <div
              key={cls.id}
              className="rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <h3 className="font-semibold text-slate-800">{cls.name}</h3>
              {cls.subject && (
                <p className="mt-1 text-xs text-slate-500">{cls.subject}</p>
              )}
              {cls.grade_level && (
                <span className="mt-2 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {cls.grade_level}
                </span>
              )}
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
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              AI
            </div>
            <span className="font-semibold text-slate-800">
              AI Interactive Classroom
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              {t("auth.logout")}
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            {t("dashboard.title")}
          </h1>
          <button
            onClick={() => navigate("/room/new")}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            {t("dashboard.createRoom")}
          </button>
        </div>

        {isLoading ? (
          <p className="text-slate-400">{t("common.loading")}</p>
        ) : !schools?.length ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
            {t("dashboard.noClassrooms")}
          </p>
        ) : (
          schools.map((school) => (
            <SchoolCard key={school.id} school={school} />
          ))
        )}
      </main>
    </div>
  );
}
