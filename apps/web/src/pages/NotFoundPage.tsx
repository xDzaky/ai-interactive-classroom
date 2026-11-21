import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-slate-200">404</h1>
      <p className="text-lg text-slate-600">{t("errors.notFound")}</p>
      <Link to="/dashboard" className="text-blue-600 underline hover:text-blue-800">
        {t("common.back")} ke Dashboard
      </Link>
    </div>
  );
}
