import type {
  AdminDialogueNode,
  AdminEnemyType,
  AdminGameMap,
  AdminItem,
  AdminNpc,
  AdminObstacleType,
  AdminPlayer,
  AdminProficiency,
  AdminQuest,
  AdminWeaponType,
  AdminWorldCell,
  CreateDialogueNodePayload,
  CreateEnemyTypePayload,
  CreateGameMapPayload,
  CreateItemPayload,
  CreateNpcPayload,
  CreateObstacleTypePayload,
  CreateQuestPayload,
  CreateWeaponTypePayload,
  GiveItemPayload,
  SetProficiencyPayload,
  UpdateEnemyTypePayload,
  UpdateGameMapPayload,
  UpdateObstacleTypePayload,
  UpdatePlayerPayload,
  UpdateWeaponTypePayload,
  UpdateWorldZonePayload,
  UpsertWorldCellPayload,
} from "@/types/admin";
import type { WorldZone } from "@/types/game";

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

  async updatePlayer(
    playerId: string,
    targetPlayerId: string,
    payload: UpdatePlayerPayload,
  ): Promise<AdminPlayer> {
    return request<AdminPlayer>(
      `${API_URL}/api/admin/players/${encodeURIComponent(targetPlayerId)}?${withPlayerId(playerId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  async deletePlayer(playerId: string, targetPlayerId: string): Promise<void> {
    await request<void>(
      `${API_URL}/api/admin/players/${encodeURIComponent(targetPlayerId)}?${withPlayerId(playerId)}`,
      { method: "DELETE" },
    );
  },

  async giveItem(
    playerId: string,
    targetPlayerId: string,
    payload: GiveItemPayload,
  ): Promise<AdminItem> {
    return request<AdminItem>(
      `${API_URL}/api/admin/players/${encodeURIComponent(targetPlayerId)}/items?${withPlayerId(playerId)}`,
      jsonBody(payload),
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

  /** Random item generator: random type (WEAPON/ARMOR/UTILITY), name and stats. */
  async generateItem(playerId: string): Promise<AdminItem> {
    return request<AdminItem>(
      `${API_URL}/api/admin/items/generate?${withPlayerId(playerId)}`,
      { method: "POST" },
    );
  },

  async deleteItem(playerId: string, itemId: string): Promise<void> {
    await request<void>(
      `${API_URL}/api/admin/items/${encodeURIComponent(itemId)}?${withPlayerId(playerId)}`,
      { method: "DELETE" },
    );
  },

  // --- Weapon types (configurable accuracy / proficiency system) ---
  async getWeaponTypes(playerId: string): Promise<AdminWeaponType[]> {
    return request<AdminWeaponType[]>(
      `${API_URL}/api/admin/weapon-types?${withPlayerId(playerId)}`,
    );
  },

  async createWeaponType(playerId: string, payload: CreateWeaponTypePayload): Promise<AdminWeaponType> {
    return request<AdminWeaponType>(
      `${API_URL}/api/admin/weapon-types?${withPlayerId(playerId)}`,
      jsonBody(payload),
    );
  },

  async updateWeaponType(
    playerId: string,
    weaponTypeId: string,
    payload: UpdateWeaponTypePayload,
  ): Promise<AdminWeaponType> {
    return request<AdminWeaponType>(
      `${API_URL}/api/admin/weapon-types/${encodeURIComponent(weaponTypeId)}?${withPlayerId(playerId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  async deleteWeaponType(playerId: string, weaponTypeId: string): Promise<void> {
    await request<void>(
      `${API_URL}/api/admin/weapon-types/${encodeURIComponent(weaponTypeId)}?${withPlayerId(playerId)}`,
      { method: "DELETE" },
    );
  },

  // --- Player weapon proficiency (affects combat accuracy) ---
  async getPlayerProficiencies(
    playerId: string,
    targetPlayerId: string,
  ): Promise<AdminProficiency[]> {
    return request<AdminProficiency[]>(
      `${API_URL}/api/admin/players/${encodeURIComponent(targetPlayerId)}/proficiencies?${withPlayerId(playerId)}`,
    );
  },

  async setPlayerProficiency(
    playerId: string,
    targetPlayerId: string,
    payload: SetProficiencyPayload,
  ): Promise<AdminProficiency[]> {
    return request<AdminProficiency[]>(
      `${API_URL}/api/admin/players/${encodeURIComponent(targetPlayerId)}/proficiencies?${withPlayerId(playerId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  // --- Enemy types ---
  async getEnemyTypes(playerId: string): Promise<AdminEnemyType[]> {
    return request<AdminEnemyType[]>(
      `${API_URL}/api/admin/enemies?${withPlayerId(playerId)}`,
    );
  },

  async createEnemyType(
    playerId: string,
    payload: CreateEnemyTypePayload,
  ): Promise<AdminEnemyType> {
    return request<AdminEnemyType>(
      `${API_URL}/api/admin/enemies?${withPlayerId(playerId)}`,
      jsonBody(payload),
    );
  },

  async updateEnemyType(
    playerId: string,
    enemyId: string,
    payload: UpdateEnemyTypePayload,
  ): Promise<AdminEnemyType> {
    return request<AdminEnemyType>(
      `${API_URL}/api/admin/enemies/${encodeURIComponent(enemyId)}?${withPlayerId(playerId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  async deleteEnemyType(playerId: string, enemyId: string): Promise<void> {
    await request<void>(
      `${API_URL}/api/admin/enemies/${encodeURIComponent(enemyId)}?${withPlayerId(playerId)}`,
      { method: "DELETE" },
    );
  },

  /** Random enemy generator: difficulty 1 (weak) .. 3 (boss-like). */
  async generateEnemy(playerId: string, difficulty: number): Promise<AdminEnemyType> {
    return request<AdminEnemyType>(
      `${API_URL}/api/admin/enemies/generate?${withPlayerId(playerId)}&difficulty=${difficulty}`,
      { method: "POST" },
    );
  },

  // --- World zone (single safe zone / village circle) ---
  async getSafeZone(playerId: string): Promise<WorldZone> {
    return request<WorldZone>(
      `${API_URL}/api/admin/world-zones?${withPlayerId(playerId)}`,
    );
  },

  async updateSafeZone(
    playerId: string,
    payload: UpdateWorldZonePayload,
  ): Promise<WorldZone> {
    return request<WorldZone>(
      `${API_URL}/api/admin/world-zones?${withPlayerId(playerId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  // --- World cells (per-cell settings: blocked / radiation / ambush) ---
  async getWorldCells(playerId: string): Promise<AdminWorldCell[]> {
    return request<AdminWorldCell[]>(
      `${API_URL}/api/admin/world-cells?${withPlayerId(playerId)}`,
    );
  },

  async upsertWorldCell(
    playerId: string,
    payload: UpsertWorldCellPayload,
  ): Promise<AdminWorldCell> {
    return request<AdminWorldCell>(
      `${API_URL}/api/admin/world-cells?${withPlayerId(playerId)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  async deleteWorldCell(playerId: string, cellId: string): Promise<void> {
    await request<void>(
      `${API_URL}/api/admin/world-cells/${encodeURIComponent(cellId)}?${withPlayerId(playerId)}`,
      { method: "DELETE" },
    );
  },

  // --- Game maps (world areas opened from the inventory) ---
  async getMaps(playerId: string): Promise<AdminGameMap[]> {
    return request<AdminGameMap[]>(
      `${API_URL}/api/admin/maps?${withPlayerId(playerId)}`,
    );
  },

  async createMap(playerId: string, payload: CreateGameMapPayload): Promise<AdminGameMap> {
    return request<AdminGameMap>(
      `${API_URL}/api/admin/maps?${withPlayerId(playerId)}`,
      jsonBody(payload),
    );
  },

  async updateMap(
    playerId: string,
    mapId: string,
    payload: UpdateGameMapPayload,
  ): Promise<AdminGameMap> {
    return request<AdminGameMap>(
      `${API_URL}/api/admin/maps/${encodeURIComponent(mapId)}?${withPlayerId(playerId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  async deleteMap(playerId: string, mapId: string): Promise<void> {
    await request<void>(
      `${API_URL}/api/admin/maps/${encodeURIComponent(mapId)}?${withPlayerId(playerId)}`,
      { method: "DELETE" },
    );
  },

  // --- Obstacle types (destructible combat obstacles) ---
  async getObstacleTypes(playerId: string): Promise<AdminObstacleType[]> {
    return request<AdminObstacleType[]>(
      `${API_URL}/api/admin/obstacle-types?${withPlayerId(playerId)}`,
    );
  },

  async createObstacleType(
    playerId: string,
    payload: CreateObstacleTypePayload,
  ): Promise<AdminObstacleType> {
    return request<AdminObstacleType>(
      `${API_URL}/api/admin/obstacle-types?${withPlayerId(playerId)}`,
      jsonBody(payload),
    );
  },

  async updateObstacleType(
    playerId: string,
    obstacleTypeId: string,
    payload: UpdateObstacleTypePayload,
  ): Promise<AdminObstacleType> {
    return request<AdminObstacleType>(
      `${API_URL}/api/admin/obstacle-types/${encodeURIComponent(obstacleTypeId)}?${withPlayerId(playerId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  },

  async deleteObstacleType(playerId: string, obstacleTypeId: string): Promise<void> {
    await request<void>(
      `${API_URL}/api/admin/obstacle-types/${encodeURIComponent(obstacleTypeId)}?${withPlayerId(playerId)}`,
      { method: "DELETE" },
    );
  },
};
