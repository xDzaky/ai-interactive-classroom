import { useTranslation } from "react-i18next";

export default function DashboardPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
      {/* TODO P01-T06: teacher dashboard with classroom list */}
      <p className="mt-4 text-sm text-slate-400">Dashboard diimplementasikan di P01-T06</p>
    </div>
  );
}
