/**
 * GroupWorkspace — P06-T04
 * Host panel: create/delete groups, assign members (from participant list), set leader.
 * Shows existing groups with member counts and submission status.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listGroups,
  createGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  getGroupSubmissions,
  type RoomGroup,
} from "@/lib/api/groups";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GroupWorkspaceProps {
  roomId: string;
  /** Available participants (id + alias) for adding to groups */
  participants?: { id: string; alias: string }[];
}

// ---------------------------------------------------------------------------
// GroupWorkspace (host panel)
// ---------------------------------------------------------------------------

export function GroupWorkspace({ roomId, participants = [] }: GroupWorkspaceProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [newGroupName, setNewGroupName] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups", roomId],
    queryFn: () => listGroups(roomId),
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createGroup(roomId, name),
    onSuccess: () => {
      setNewGroupName("");
      void qc.invalidateQueries({ queryKey: ["groups", roomId] });
    },
    onError: () => setError(t("group.errorCreate")),
  });

  const deleteMutation = useMutation({
    mutationFn: (groupId: string) => deleteGroup(roomId, groupId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["groups", roomId] }),
    onError: () => setError(t("group.errorDelete")),
  });

  const addMemberMutation = useMutation({
    mutationFn: ({
      groupId,
      participantId,
      isLeader,
    }: { groupId: string; participantId: string; isLeader: boolean }) =>
      addGroupMember(roomId, groupId, participantId, isLeader),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["groups", roomId] }),
    onError: () => setError(t("group.errorAddMember")),
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({
      groupId,
      participantId,
    }: { groupId: string; participantId: string }) =>
      removeGroupMember(roomId, groupId, participantId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["groups", roomId] }),
    onError: () => setError(t("group.errorRemoveMember")),
  });

  if (isLoading) {
    return <div className="p-3 text-xs text-slate-400">{t("group.loading")}</div>;
  }

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto text-sm">
      <p className="font-semibold text-white">{t("group.title")}</p>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* Create group */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder={t("group.namePlaceholder")}
          className="flex-1 rounded px-2 py-1 text-xs bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-indigo-500"
          aria-label={t("group.namePlaceholder")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newGroupName.trim()) {
              createMutation.mutate(newGroupName.trim());
            }
          }}
        />
        <button
          onClick={() => {
            if (newGroupName.trim()) createMutation.mutate(newGroupName.trim());
          }}
          disabled={createMutation.isPending || !newGroupName.trim()}
          className="rounded px-2 py-1 bg-indigo-600 text-white text-xs hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          aria-label={t("group.create")}
        >
          {t("group.create")}
        </button>
      </div>

      {/* Group list */}
      {groups.length === 0 && (
        <p className="text-xs text-slate-400">{t("group.noGroups")}</p>
      )}

      {groups.map((group: RoomGroup) => (
        <div key={group.id} className="rounded-lg bg-slate-700 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
              className="text-xs font-medium text-white hover:text-indigo-300 transition-colors"
              aria-expanded={expandedGroup === group.id}
            >
              {group.name} ({(group.members ?? []).length} {t("group.members")})
            </button>
            <button
              onClick={() => deleteMutation.mutate(group.id)}
              disabled={deleteMutation.isPending}
              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-60"
              aria-label={`${t("group.delete")} ${group.name}`}
            >
              ✕
            </button>
          </div>

          {expandedGroup === group.id && (
            <GroupDetail
              roomId={roomId}
              group={group}
              participants={participants}
              onAddMember={(participantId, isLeader) =>
                addMemberMutation.mutate({ groupId: group.id, participantId, isLeader })
              }
              onRemoveMember={(participantId) =>
                removeMemberMutation.mutate({ groupId: group.id, participantId })
              }
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GroupDetail (expanded group panel — member list + add member)
// ---------------------------------------------------------------------------

interface GroupDetailProps {
  roomId: string;
  group: RoomGroup;
  participants: { id: string; alias: string }[];
  onAddMember: (participantId: string, isLeader: boolean) => void;
  onRemoveMember: (participantId: string) => void;
}

function GroupDetail({ group, participants, onAddMember, onRemoveMember }: GroupDetailProps) {
  const { t } = useTranslation();
  const [selectedParticipant, setSelectedParticipant] = useState("");
  const [makeLeader, setMakeLeader] = useState(false);

  const memberIds = new Set((group.members ?? []).map((m) => m.participant_id));
  const available = participants.filter((p) => !memberIds.has(p.id));

  return (
    <div className="space-y-2">
      {/* Existing members */}
      {(group.members ?? []).map((member) => {
        const p = participants.find((x) => x.id === member.participant_id);
        return (
          <div key={member.participant_id} className="flex items-center justify-between text-xs text-slate-300">
            <span>
              {p?.alias ?? member.participant_id}
              {member.is_leader && (
                <span className="ml-1 text-yellow-400 font-semibold">★</span>
              )}
            </span>
            <button
              onClick={() => onRemoveMember(member.participant_id)}
              className="text-red-400 hover:text-red-300 text-xs"
              aria-label={`${t("group.removeMember")} ${p?.alias ?? ""}`}
            >
              ✕
            </button>
          </div>
        );
      })}

      {/* Add member */}
      {available.length > 0 && (
        <div className="flex gap-2 items-center">
          <select
            value={selectedParticipant}
            onChange={(e) => setSelectedParticipant(e.target.value)}
            className="flex-1 rounded px-1 py-0.5 text-xs bg-slate-600 text-white border border-slate-500 focus:outline-none"
            aria-label={t("group.selectParticipant")}
          >
            <option value="">{t("group.selectParticipant")}</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>{p.alias}</option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={makeLeader}
              onChange={(e) => setMakeLeader(e.target.checked)}
              className="accent-yellow-400"
            />
            {t("group.leader")}
          </label>
          <button
            onClick={() => {
              if (selectedParticipant) {
                onAddMember(selectedParticipant, makeLeader);
                setSelectedParticipant("");
                setMakeLeader(false);
              }
            }}
            disabled={!selectedParticipant}
            className="rounded px-2 py-0.5 bg-indigo-600 text-white text-xs hover:bg-indigo-700 disabled:opacity-60"
          >
            {t("group.add")}
          </button>
        </div>
      )}
    </div>
  );
}
