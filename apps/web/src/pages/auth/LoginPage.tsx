import { useTranslation } from "react-i18next";

export default function LoginPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-bold">{t("auth.loginTitle")}</h1>
        <p className="mb-6 text-sm text-slate-500">{t("auth.loginSubtitle")}</p>
        {/* TODO P01-T05: implement login form with Sanctum SPA auth */}
        <p className="text-sm text-slate-400">
          Login form diimplementasikan di P01-T05
        </p>
      </div>
    </div>
  );
}
