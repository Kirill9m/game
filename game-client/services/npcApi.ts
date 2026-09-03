import { DialogueNodeDto } from "@/components/NpcDialog";
import { NpcInfo } from "@/types/npc";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const npcApi = {
  async getNpcsAt(x: number, y: number): Promise<NpcInfo[]> {
    const response = await fetch(`${API_URL}/api/v1/npcs?x=${x}&y=${y}`);
    if (!response.ok) throw new Error("Failed to load NPCs");
    return response.json();
  },

  startDialogue: async (npcId: string): Promise<DialogueNodeDto> => {
    if (!npcId) throw new Error("NPC ID is required");

    // Добавлен ${API_URL}
    const res = await fetch(`${API_URL}/api/dialogues/start/${npcId}`);
    if (!res.ok) throw new Error("Не удалось загрузить диалог");
    return res.json();
  },

  selectChoice: async (
    playerId: string,
    choiceId: string,
    activeQuestId?: string,
  ): Promise<DialogueNodeDto | null> => {
    const params = new URLSearchParams({ playerId, choiceId });
    if (activeQuestId) params.append("activeQuestId", activeQuestId);

    // Добавлен ${API_URL}
    const res = await fetch(
      `${API_URL}/api/dialogues/choice?${params.toString()}`,
      {
        method: "POST",
      },
    );

    if (res.status === 204) return null; // Диалог окончен
    if (!res.ok) throw new Error("Ошибка отправки выбора");
    return res.json();
  },
};
