import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

export default function JoinPage() {
  const { t } = useTranslation();
  const { code } = useParams<{ code?: string }>();
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold">{t("room.joinRoom")}</h1>
        {code && <p className="mb-4 font-mono text-lg font-bold text-blue-600">{code}</p>}
        {/* TODO P04-T06: join flow — guest + account, lobby, QR */}
        <p className="text-sm text-slate-400">Join flow diimplementasikan di P04-T06</p>
      </div>
    </div>
  );
}
