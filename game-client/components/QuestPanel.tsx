"use client";

import { QuestProgress } from "@/types/game";

interface Props {
  quests: QuestProgress[];
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Активный",
  AVAILABLE: "Доступен",
  IN_PROGRESS: "В процессе",
  COMPLETED: "Завершён",
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "text-blue-400 bg-blue-900/40 border-blue-700",
  AVAILABLE: "text-gray-400 bg-gray-800/40 border-gray-700",
  IN_PROGRESS: "text-yellow-400 bg-yellow-900/30 border-yellow-700",
  COMPLETED: "text-green-400 bg-green-900/30 border-green-700",
};

export default function QuestPanel({ quests }: Props) {
  if (quests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-sm gap-2">
        <span className="text-2xl">📜</span>
        <p>Квестов пока нет.</p>
        <p className="text-xs text-gray-700">Поговорите с NPC, чтобы начать.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-1">
      {quests.map((quest) => {
        const progress =
          quest.totalNpcsCount > 0
            ? Math.round((quest.talkedNpcsCount / quest.totalNpcsCount) * 100)
            : 0;

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
                    Поговорил с NPC: {quest.talkedNpcsCount} / {quest.totalNpcsCount}
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
                <span>Квест выполнен! Награда получена.</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
