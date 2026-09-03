import {
  InventoryItem,
  MoveResponse,
  PlayerStateResponse,
  WorldBounds,
  WorldCell,
  WorldZone,
} from "@/types/game";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const playerApi = {
  async loginPlayer(
    githubId: string,
    username: string,
    avatarUrl: string,
  ): Promise<PlayerStateResponse> {
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
      let message = "Movement failed";
      try {
        const body = await response.json();
        if (body?.error) message = body.error;
      } catch {
        // ignore body parse errors
      }
      throw new Error(message);
    }

    return response.json();
  },
  async getPlayerState(playerId: string): Promise<PlayerStateResponse> {
    const response = await fetch(
      `${API_URL}/api/v1/players/${encodeURIComponent(playerId)}/state`,
    );
    if (!response.ok) throw new Error("Failed to load player state");
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

  async equipItem(playerId: string, itemCode: string): Promise<InventoryItem[]> {
    const response = await fetch(
      `${API_URL}/api/v1/players/${encodeURIComponent(playerId)}/inventory/${encodeURIComponent(itemCode)}/equip`,
      { method: "PATCH" },
    );
    if (!response.ok) throw new Error("Failed to equip item");
    return response.json();
  },

  async moveInventoryItem(
    playerId: string,
    itemCode: string,
    gridX: number,
    gridY: number,
  ): Promise<InventoryItem[]> {
    const response = await fetch(
      `${API_URL}/api/v1/players/${encodeURIComponent(playerId)}/inventory/${encodeURIComponent(itemCode)}/position?gridX=${gridX}&gridY=${gridY}`,
      { method: "PATCH" },
    );
    if (!response.ok) throw new Error("Failed to move item");
    return response.json();
  },

  async getSafeZone(): Promise<WorldZone> {
    const response = await fetch(`${API_URL}/api/v1/world/safe-zone`);
    if (!response.ok) throw new Error("Failed to load safe zone");
    return response.json();
  },

  async getWorldCells(): Promise<WorldCell[]> {
    const response = await fetch(`${API_URL}/api/v1/world/cells`);
    if (!response.ok) throw new Error("Failed to load world cells");
    return response.json();
  },

  async getWorldBounds(): Promise<WorldBounds> {
    const response = await fetch(`${API_URL}/api/v1/world/bounds`);
    if (!response.ok) throw new Error("Failed to load world bounds");
    return response.json();
  },
};
