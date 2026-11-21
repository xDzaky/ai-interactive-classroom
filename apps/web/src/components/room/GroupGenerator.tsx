/**
 * GroupGenerator — P06-T05
 * Host tool: set N groups → distributes participants evenly → creates groups via API.
 * Uses the existing createGroup + addGroupMember from groups API.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGroup, addGroupMember } from "@/lib/api/groups";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GroupGeneratorProps {
  roomId: string;
  participants: { id: string; alias: string }[];
}

// ---------------------------------------------------------------------------
// GroupGenerator
// ---------------------------------------------------------------------------

export function GroupGenerator({ roomId, participants }: GroupGeneratorProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [groupCount, setGroupCount] = useState(2);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (participants.length === 0) throw new Error("no participants");

      // Shuffle participants
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const count = Math.min(groupCount, shuffled.length);

      // Create groups, distribute participants round-robin
      const groups: Array<{ id: string }> = [];
      for (let i = 0; i < count; i++) {
        const group = await createGroup(roomId, `${t("generator.groupPrefix")} ${i + 1}`);
        groups.push(group);
      }

      for (let i = 0; i < shuffled.length; i++) {
        const groupIndex = i % count;
        const isLeader = Math.floor(i / count) === 0; // first assigned to each group = leader
        await addGroupMember(roomId, groups[groupIndex].id, shuffled[i].id, isLeader);
      }

      return groups;
    },
    onSuccess: () => {
      setGenerated(true);
      void qc.invalidateQueries({ queryKey: ["groups", roomId] });
    },
    onError: () => setError(t("generator.error")),
  });

  if (participants.length === 0) {
    return (
      <div className="p-3 text-xs text-slate-400">
        <p className="font-semibold text-white text-xs uppercase tracking-wide mb-1">
          {t("generator.title")}
        </p>
        {t("generator.noParticipants")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 text-sm">
      <p className="font-semibold text-white text-xs uppercase tracking-wide">
        {t("generator.title")}
      </p>

      {error && (
        <p className="text-xs text-red-400" role="alert">{error}</p>
      )}

      {generated && (
        <p className="text-xs text-green-400">✓ {t("generator.success", { count: groupCount })}</p>
      )}

      <div className="flex items-center gap-2">
        <label className="text-xs text-slate-300" htmlFor="group-count">
          {t("generator.groupCount")}
        </label>
        <input
          id="group-count"
          type="number"
          min={2}
          max={Math.max(2, participants.length)}
          value={groupCount}
          onChange={(e) => setGroupCount(Math.max(2, Number(e.target.value)))}
          className="w-16 rounded px-2 py-0.5 text-xs bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-indigo-500"
        />
      </div>

      <p className="text-xs text-slate-400">
        {t("generator.preview", {
          participants: participants.length,
          groups: Math.min(groupCount, participants.length),
          perGroup: Math.ceil(participants.length / Math.min(groupCount, participants.length)),
        })}
      </p>

      <button
        onClick={() => {
          setGenerated(false);
          setError(null);
          generateMutation.mutate();
        }}
        disabled={generateMutation.isPending || participants.length === 0}
        className="rounded px-3 py-1 bg-indigo-600 text-white text-xs hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        aria-label={t("generator.generate")}
      >
        {generateMutation.isPending ? "…" : t("generator.generate")}
      </button>
    </div>
  );
}
