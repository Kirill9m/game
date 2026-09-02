const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
import { CombatSession } from "@/types/game";

export const combatApi = {
  async startCombat(attackerId: string, targetId: string): Promise<CombatSession> {
    const res = await fetch(
      `${API_URL}/api/v1/combat/start?attackerId=${encodeURIComponent(attackerId)}&targetId=${encodeURIComponent(targetId)}`,
      { method: "POST" },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to start combat");
    }
    return res.json();
  },

  async getCombat(combatId: string): Promise<CombatSession> {
    const res = await fetch(`${API_URL}/api/v1/combat/${combatId}`);
    if (!res.ok) throw new Error("Failed to load combat");
    return res.json();
  },

  async moveInCombat(
    combatId: string,
    playerId: string,
    dx: number,
    dy: number,
  ): Promise<CombatSession> {
    const res = await fetch(
      `${API_URL}/api/v1/combat/${combatId}/move?playerId=${encodeURIComponent(playerId)}&dx=${dx}&dy=${dy}`,
      { method: "POST" },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Action failed");
    }
    return res.json();
  },

  async endTurn(combatId: string, playerId: string, actions: Array<Record<string, number | string>>): Promise<CombatSession> {
    const res = await fetch(
      `${API_URL}/api/v1/combat/${combatId}/end-turn?playerId=${encodeURIComponent(playerId)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actions }) },
    );
    if (!res.ok) throw new Error("Failed to end turn");
    return res.json();
  },

  async attack(combatId: string, playerId: string): Promise<CombatSession> {
    const res = await fetch(
      `${API_URL}/api/v1/combat/${combatId}/attack?playerId=${encodeURIComponent(playerId)}`,
      { method: "POST" },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Shot failed");
    }
    return res.json();
  },

  async finishCombat(combatId: string, playerId: string): Promise<CombatSession> {
    const res = await fetch(
      `${API_URL}/api/v1/combat/${combatId}/finish?playerId=${encodeURIComponent(playerId)}`,
      { method: "POST" },
    );
    if (!res.ok) throw new Error("Failed to finish combat");
    return res.json();
  },

  async getActiveCombatForPlayer(playerId: string) {
    const res = await fetch(
      `${API_URL}/api/v1/combat/active?playerId=${encodeURIComponent(playerId)}`,
    );
    if (res.status === 204 || !res.ok) return null;
    return res.json();
  },
};
