"use client";

import { useEffect, useState } from "react";
import { AvailableQuest, QuestProgress } from "@/types/game";
import { questApi } from "@/services/questApi";

interface Props {
  quests: QuestProgress[];
  playerId: string;
  onQuestsChange: (quests: QuestProgress[]) => void;
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Active",
  AVAILABLE: "Available",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "text-blue-400 bg-blue-900/40 border-blue-700",
  AVAILABLE: "text-gray-400 bg-gray-800/40 border-gray-700",
  IN_PROGRESS: "text-yellow-400 bg-yellow-900/30 border-yellow-700",
  COMPLETED: "text-green-400 bg-green-900/30 border-green-700",
};

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function QuestPanel({ quests, playerId, onQuestsChange }: Props) {
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);
  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string>("");
  const [available, setAvailable] = useState<AvailableQuest[]>([]);
  const [acceptingCode, setAcceptingCode] = useState<string | null>(null);
  const [acceptError, setAcceptError] = useState<string>("");

  const handleClaimReward = async (quest: QuestProgress) => {
    try {
      setClaimError("");
      setClaimingQuestId(quest.questId);
      const updated = await questApi.claimReward(playerId, quest.playerQuestId);
      // Update the quest in the list
      onQuestsChange(
        quests.map((q) => (q.playerQuestId === updated.playerQuestId ? updated : q)),
      );
    } catch (err: unknown) {
      setClaimError(
        err instanceof Error ? err.message : "Failed to claim reward",
      );
    } finally {
      setClaimingQuestId(null);
    }
  };

  // Reload the list of available quests whenever the player's quests change
  useEffect(() => {
    if (!playerId) return;
    questApi
      .getAvailableQuests(playerId)
      .then(setAvailable)
      .catch(() => setAvailable([]));
  }, [playerId, quests]);

  const handleAcceptQuest = async (code: string) => {
    try {
      setAcceptError("");
      setAcceptingCode(code);
      await questApi.startQuest(playerId, code);
      const updated = await questApi.getPlayerQuests(playerId);
      onQuestsChange(updated);
    } catch (err: unknown) {
      setAcceptError(
        err instanceof Error ? err.message : "Failed to accept quest",
      );
    } finally {
      setAcceptingCode(null);
    }
  };

  if (quests.length === 0 && available.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-sm gap-2">
        <span className="text-2xl">📜</span>
        <p>No quests yet.</p>
        <p className="text-xs text-gray-700">Talk to NPCs to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-1">
      {claimError && (
        <div className="bg-red-950/80 border border-red-800 text-red-200 px-3 py-2 rounded-xl text-xs">
          {claimError}
        </div>
      )}

      {acceptError && (
        <div className="bg-red-950/80 border border-red-800 text-red-200 px-3 py-2 rounded-xl text-xs">
          {acceptError}
        </div>
      )}

      {available.length > 0 && (
        <div className="bg-gray-900 border border-blue-900/60 rounded-xl p-3">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-300 mb-2">
            📌 Available quests
          </div>
          <div className="flex flex-col gap-2">
            {available.map((quest) => (
              <div
                key={quest.code}
                className="flex items-center justify-between gap-2 bg-gray-800/50 rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-100 truncate">
                    {quest.title}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    💰 {quest.rewardGold} gold · ⭐ {quest.rewardExp} exp · 🎯{" "}
                    {quest.requiredNpcCount} NPC(s)
                  </div>
                </div>
                <button
                  type="button"
                  disabled={acceptingCode === quest.code}
                  onClick={() => handleAcceptQuest(quest.code)}
                  className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
                >
                  {acceptingCode === quest.code ? "..." : "Accept"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {quests.map((quest) => {
        const progress =
          quest.totalNpcsCount > 0
            ? Math.round((quest.talkedNpcsCount / quest.totalNpcsCount) * 100)
            : 0;

        const isExpanded = expandedQuestId === quest.questId;
        const canClaim = quest.isCompleted && !quest.rewardClaimed;

        return (
          <div
            key={quest.questId}
            className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2"
          >
            {/* Title + badge */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm text-gray-100 truncate">
                {quest.title}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLOR[quest.status] ?? "text-gray-400 border-gray-700"}`}
              >
                {STATUS_LABEL[quest.status] ?? quest.status}
              </span>
            </div>

            {/* Progress bar (only shown for NPC-talk quests) */}
            {quest.totalNpcsCount > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[10px] text-gray-500">
                  <span>
                    NPCs talked to: {quest.talkedNpcsCount} / {quest.totalNpcsCount}
                  </span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${quest.isCompleted ? "bg-green-500" : "bg-amber-500"}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Completion marker */}
            {quest.isCompleted && (
              <div className="flex items-center gap-1.5 text-xs text-green-400">
                <span>✅</span>
                <span>Quest completed!</span>
              </div>
            )}

            {/* Reward info + claim button */}
            {quest.isCompleted && (
              <div className="flex flex-col gap-2 border-t border-gray-800 pt-2">
                <div className="flex flex-wrap gap-2 text-[11px]">
                  <span className="bg-amber-900/40 border border-amber-800 text-amber-200 px-2 py-0.5 rounded-full">
                    💰 {quest.rewardGold} gold
                  </span>
                  <span className="bg-blue-900/40 border border-blue-800 text-blue-200 px-2 py-0.5 rounded-full">
                    ⭐ {quest.rewardExp} quest points
                  </span>
                  {quest.rewardItemName && (
                    <span className="bg-purple-900/40 border border-purple-800 text-purple-200 px-2 py-0.5 rounded-full">
                      🎒 {quest.rewardItemName}
                    </span>
                  )}
                </div>

                {canClaim ? (
                  <button
                    type="button"
                    disabled={claimingQuestId === quest.questId}
                    onClick={() => handleClaimReward(quest)}
                    className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg transition"
                  >
                    {claimingQuestId === quest.questId
                      ? "Claiming..."
                      : "🎁 Claim Reward"}
                  </button>
                ) : quest.rewardClaimed ? (
                  <div className="flex items-center gap-1.5 text-xs text-green-400">
                    <span>🎁</span>
                    <span>Reward claimed</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Quest journal */}
            {quest.logEntries.length > 0 && (
              <div className="mt-1 border-t border-gray-800 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedQuestId(isExpanded ? null : quest.questId)
                  }
                  className="w-full flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-400 hover:text-gray-200 transition"
                >
                  <span>📖 Quest Journal</span>
                  <span>{isExpanded ? "▲" : "▼"}</span>
                </button>

                {isExpanded && (
                  <div className="mt-2 flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {quest.logEntries.map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-gray-300 bg-gray-800/50 rounded-lg px-2.5 py-1.5"
                      >
                        <span className="text-gray-500 font-mono text-[10px] mt-0.5 shrink-0">
                          {formatTime(entry.timestamp)}
                        </span>
                        <span className="leading-snug">{entry.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}