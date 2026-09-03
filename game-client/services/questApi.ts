import { QuestProgress } from "@/types/game";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const questApi = {
  async getPlayerQuests(playerId: string): Promise<QuestProgress[]> {
    const res = await fetch(
      `${API_URL}/api/quests/progress?playerId=${encodeURIComponent(playerId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("Failed to fetch quests");
    return res.json();
  },

  async startQuest(playerId: string, questCode: string): Promise<QuestProgress> {
    const res = await fetch(
      `${API_URL}/api/quests/start?playerId=${encodeURIComponent(playerId)}&questCode=${encodeURIComponent(questCode)}`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error("Failed to start quest");
    return res.json();
  },

  async claimReward(playerId: string, playerQuestId: string): Promise<QuestProgress> {
    const res = await fetch(
      `${API_URL}/api/quests/claim?playerId=${encodeURIComponent(playerId)}&playerQuestId=${encodeURIComponent(playerQuestId)}`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error("Failed to claim reward");
    return res.json();
  },
};