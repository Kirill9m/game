import { InventoryItem, MoveResponse } from "@/types/game";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const playerApi = {
  async loginPlayer(githubId: string, username: string, avatarUrl: string) {
    const response = await fetch(
      `${API_URL}/api/v1/players/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubId, username, avatarUrl }),
      },
    );
    if (!response.ok) throw new Error("Failed to login player");
    return response.json();
  },

  async movePlayer(
    playerId: string,
    targetX: number,
    targetY: number,
  ): Promise<MoveResponse> {
    const response = await fetch(`${API_URL}/api/v1/players/${playerId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetX, targetY }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Movement failed");
    }

    return response.json();
  },
  async attack(attackerId: string, targetId: string) {
    const response = await fetch(
      `${API_URL}/api/v1/players/attack?attackerId=${encodeURIComponent(attackerId)}&targetId=${encodeURIComponent(targetId)}`,
      { method: "POST" },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Attack failed");
    }
    return response.json();
  },

  async getInventory(playerId: string): Promise<InventoryItem[]> {
    const response = await fetch(
      `${API_URL}/api/v1/players/${encodeURIComponent(playerId)}/inventory`,
    );
    if (!response.ok) throw new Error("Failed to load inventory");
    return response.json();
  },
};
