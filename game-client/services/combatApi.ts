const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const combatApi = {
  async startCombat(attackerId: string, targetId: string) {
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

  async getCombat(combatId: string) {
    const res = await fetch(`${API_URL}/api/v1/combat/${combatId}`);
    if (!res.ok) throw new Error("Failed to load combat");
    return res.json();
  },

  async moveInCombat(
    combatId: string,
    playerId: string,
    dx: number,
    dy: number,
  ) {
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

  async endTurn(combatId: string, playerId: string) {
    const res = await fetch(
      `${API_URL}/api/v1/combat/${combatId}/end-turn?playerId=${encodeURIComponent(playerId)}`,
      { method: "POST" },
    );
    if (!res.ok) throw new Error("Failed to end turn");
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
