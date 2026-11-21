import { useTranslation } from "react-i18next";

export default function RoomPage() {
  const { t } = useTranslation();
  return (
    <div className="flex h-screen flex-col bg-slate-900 text-white">
      <header className="flex items-center gap-4 border-b border-slate-700 px-4 py-2">
        <span className="font-semibold">{t("room.live")}</span>
      </header>
      <main className="flex flex-1 overflow-hidden">
        {/* TODO P04-T07: Teacher/Presentation/Student views */}
        <p className="m-auto text-slate-400">Room views diimplementasikan di P04-T07</p>
      </main>
    </div>
  );
}
