import { PlayerEntity, MoveResponse } from "@/types/game";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const playerApi = {
  async getPlayer(playerId: string): Promise<PlayerEntity> {
    const res = await `${API_URL}/api/v1/players/${playerId}`;
    const response = await fetch(res);
    if (!response.ok) {
      throw new Error("Player not found");
    }
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
};
