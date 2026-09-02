import { NpcDialogue, NpcInfo } from "@/types/npc";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const npcApi = {
  async getNpcsAt(x: number, y: number): Promise<NpcInfo[]> {
    const response = await fetch(`${API_URL}/api/v1/npcs?x=${x}&y=${y}`);
    if (!response.ok) throw new Error("Failed to load NPCs");
    return response.json();
  },

  async talk(playerId: string, npcCode: string): Promise<NpcDialogue> {
    const response = await fetch(
      `${API_URL}/api/v1/npcs/${encodeURIComponent(npcCode)}/talk?playerId=${encodeURIComponent(playerId)}`,
      { method: "POST" },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Conversation failed");
    }
    return response.json();
  },
};
