import type {
  AdminDialogueNode,
  AdminItem,
  AdminNpc,
  AdminPlayer,
  AdminQuest,
  CreateDialogueNodePayload,
  CreateItemPayload,
  CreateNpcPayload,
  CreateQuestPayload,
} from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function withPlayerId(playerId: string): string {
  return `playerId=${encodeURIComponent(playerId)}`;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore body parse errors
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function jsonBody(payload: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

export const adminApi = {
  // --- Bootstrap (first admin) ---
  async bootstrapAdmin(playerId: string, code: string): Promise<AdminPlayer> {
    return request<AdminPlayer>(`${API_URL}/api/admin/bootstrap`, {
      ...jsonBody({ playerId, code }),
    });
  },

  // --- Players & roles ---
  async getPlayers(playerId: string): Promise<AdminPlayer[]> {
    return request<AdminPlayer[]>(
      `${API_URL}/api/admin/players?${withPlayerId(playerId)}`,
    );
  },

  async setPlayerRole(
    playerId: string,
    targetPlayerId: string,
    role: "ADMIN" | "PLAYER",
  ): Promise<AdminPlayer> {
    return request<AdminPlayer>(
      `${API_URL}/api/admin/players/${encodeURIComponent(targetPlayerId)}/role?${withPlayerId(playerId)}`,
      {
        ...jsonBody({ role }),
      },
    );
  },

  // --- NPCs ---
  async getNpcs(playerId: string): Promise<AdminNpc[]> {
    return request<AdminNpc[]>(
      `${API_URL}/api/admin/npcs?${withPlayerId(playerId)}`,
    );
  },

  async createNpc(playerId: string, payload: CreateNpcPayload): Promise<AdminNpc> {
    return request<AdminNpc>(
      `${API_URL}/api/admin/npcs?${withPlayerId(playerId)}`,
      jsonBody(payload),
    );
  },

  async updateNpc(
    playerId: string,
    npcId: string,
    payload: { name?: string; positionX?: number; positionY?: number },
  ): Promise<AdminNpc> {
    return request<AdminNpc>(
      `${API_URL}/api/admin/npcs/${encodeURIComponent(npcId)}?${withPlayerId(playerId)}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    );
  },

  async deleteNpc(playerId: string, npcId: string): Promise<void> {
    await request<void>(
      `${API_URL}/api/admin/npcs/${encodeURIComponent(npcId)}?${withPlayerId(playerId)}`,
      { method: "DELETE" },
    );
  },

  // --- Quests ---
  async getQuests(playerId: string): Promise<AdminQuest[]> {
    return request<AdminQuest[]>(
      `${API_URL}/api/admin/quests?${withPlayerId(playerId)}`,
    );
  },

  async createQuest(playerId: string, payload: CreateQuestPayload): Promise<AdminQuest> {
    return request<AdminQuest>(
      `${API_URL}/api/admin/quests?${withPlayerId(playerId)}`,
      jsonBody(payload),
    );
  },

  async updateQuest(
    playerId: string,
    questId: string,
    payload: {
      title?: string;
      rewardExp?: number;
      rewardGold?: number;
      rewardItemCode?: string;
      requiredNpcIds?: string[];
    },
  ): Promise<AdminQuest> {
    return request<AdminQuest>(
      `${API_URL}/api/admin/quests/${encodeURIComponent(questId)}?${withPlayerId(playerId)}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
    );
  },

  async deleteQuest(playerId: string, questId: string): Promise<void> {
    await request<void>(
      `${API_URL}/api/admin/quests/${encodeURIComponent(questId)}?${withPlayerId(playerId)}`,
      { method: "DELETE" },
    );
  },

  /** Random quest generator: creates a quest + starter dialogues in one call. */
  async generateQuest(playerId: string, createNewNpc = false): Promise<AdminQuest> {
    return request<AdminQuest>(
      `${API_URL}/api/admin/quests/generate?${withPlayerId(playerId)}&createNewNpc=${createNewNpc}`,
      { method: "POST" },
    );
  },

  // --- Dialogues ---
  async getDialogueNodes(playerId: string, npcId: string): Promise<AdminDialogueNode[]> {
    return request<AdminDialogueNode[]>(
      `${API_URL}/api/admin/dialogues?${withPlayerId(playerId)}&npcId=${encodeURIComponent(npcId)}`,
    );
  },

  async createDialogueNode(
    playerId: string,
    payload: CreateDialogueNodePayload,
  ): Promise<AdminDialogueNode> {
    return request<AdminDialogueNode>(
      `${API_URL}/api/admin/dialogues?${withPlayerId(playerId)}`,
      jsonBody(payload),
    );
  },

  async setStartNode(playerId: string, nodeId: string): Promise<AdminDialogueNode> {
    return request<AdminDialogueNode>(
      `${API_URL}/api/admin/dialogues/${encodeURIComponent(nodeId)}/start?${withPlayerId(playerId)}`,
      { method: "POST" },
    );
  },

  async deleteDialogueNode(playerId: string, nodeId: string): Promise<void> {
    await request<void>(
      `${API_URL}/api/admin/dialogues/${encodeURIComponent(nodeId)}?${withPlayerId(playerId)}`,
      { method: "DELETE" },
    );
  },

  // --- Items ---
  async getItems(playerId: string): Promise<AdminItem[]> {
    return request<AdminItem[]>(
      `${API_URL}/api/admin/items?${withPlayerId(playerId)}`,
    );
  },

  async createItem(playerId: string, payload: CreateItemPayload): Promise<AdminItem> {
    return request<AdminItem>(
      `${API_URL}/api/admin/items?${withPlayerId(playerId)}`,
      jsonBody(payload),
    );
  },
};