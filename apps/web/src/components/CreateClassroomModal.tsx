import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Classroom } from "@ai-classroom/shared-types";

interface Props {
  schoolId: string;
  onClose: () => void;
}

export default function CreateClassroomModal({ schoolId, onClose }: Props) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");

  const { mutate, isPending, error } = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: Classroom }>(
        `/api/v1/schools/${schoolId}/classrooms`,
        { name, subject: subject || undefined, grade_level: gradeLevel || undefined }
      );
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classrooms", schoolId] });
      onClose();
    },
  });

  const apiError = (error as { response?: { data?: { message?: string } } })
    ?.response?.data?.message;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="modal-title" className="mb-4 text-lg font-semibold text-slate-900">
          {t("dashboard.createClassroom")}
        </h2>

        {apiError && (
          <div role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {apiError}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutate();
          }}
        >
          <div className="mb-3">
            <label htmlFor="cls-name" className="mb-1 block text-sm font-medium text-slate-700">
              Nama Kelas *
            </label>
            <input
              id="cls-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Matematika Kelas 10A"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="cls-subject" className="mb-1 block text-sm font-medium text-slate-700">
              Mata Pelajaran
            </label>
            <input
              id="cls-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Matematika"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="mb-5">
            <label htmlFor="cls-grade" className="mb-1 block text-sm font-medium text-slate-700">
              Tingkat Kelas
            </label>
            <input
              id="cls-grade"
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              placeholder="Kelas 10"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isPending ? t("common.loading") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
