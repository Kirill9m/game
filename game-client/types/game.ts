import { NpcInfo } from "@/types/npc";

export interface PlayerInfo {
  playerId: string;
  userId: string;
  username?: string;
}

export interface InventoryItem {
  code: string;
  name: string;
  type: string;
  weaponTypeCode?: string | null;
  damage: number;
  attackRange: number;
  quantity: number;
  width: number;
  height: number;
  gridX: number;
  gridY: number;
  equipped: boolean;
}

export interface MoveResponse {
  positionX: number;
  positionY: number;
  playersOnTile: PlayerInfo[];
  npcs: NpcInfo[];
  cooldown: string;
  /** Player health after the move (radiation may have reduced it). */
  health?: number;
  /** Health lost to radiation on this step (0 when the cell is clean). */
  radiationDamage?: number;
  /** True when an enemy ambush triggered and a combat session was started. */
  combatStarted?: boolean;
  combatId?: string | null;
  enemyName?: string | null;
}

export interface WorldCell {
  positionX: number;
  positionY: number;
  blocked: boolean;
  radiation: number;
  ambushChance: number;
  enemyName: string | null;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  size: number;
}

export interface WorldZone {
  name: string;
  centerX: number;
  centerY: number;
  radius: number;
}

/**
 * A player-viewable map. Each map is bound to an inventory item (by item
 * code) and shows a circular area of the world centered at (centerX, centerY).
 */
export interface GameMap {
  id: string;
  code: string;
  name: string;
  description: string | null;
  centerX: number;
  centerY: number;
  radius: number;
  itemCode: string;
}

/**
 * A destructible obstacle on the combat board. Bullets pass through it but
 * damage it; at currentHealth <= 0 the obstacle is destroyed and the cell
 * becomes passable.
 */
export interface CombatObstacle {
  x: number;
  y: number;
  code: string;
  name: string;
  maxHealth: number;
  currentHealth: number;
}

export interface PlayerStats {
  questPoints: number;
  health: number;
  level: number;
  strength: number;
  energy: number;
  agility: number;
  stamina: number;
}

export interface PlayerStateResponse {
  positionX: number;
  positionY: number;
  role?: string;
  gold?: number;
  questPoints?: number;
  health?: number;
  level?: number;
  strength?: number;
  energy?: number;
  agility?: number;
  stamina?: number;
  playersOnTile: PlayerInfo[];
  npcs: NpcInfo[];
}

export interface PlayerEntity {
  id: string;
  userId: string;
  positionX: number;
  positionY: number;
}

export interface CombatSession {
  id: string;
  player1Id: string;
  player2Id: string;
  currentTurnPlayerId: string;
  actionPoints: number;
  p1Plan?: string | null;
  p2Plan?: string | null;
  p1Ready?: boolean;
  p2Ready?: boolean;
  p1X: number;
  p1Y: number;
  p2X: number;
  p2Y: number;
  p1Health: number;
  p2Health: number;
  p1Posture?: "STANDING" | "CROUCHING" | "PRONE";
  p2Posture?: "STANDING" | "CROUCHING" | "PRONE";
  winnerId?: string | null;
  status: "IN_PROGRESS" | "FINISHED";
  lastRoundActions?: string[];
  enemyTypeCode?: string | null;
  enemyName?: string | null;
  p1EquippedItemCode?: string | null;
  p2EquippedItemCode?: string | null;
  /** Destructible obstacles on this combat board (re-generated every combat). */
  obstacles?: CombatObstacle[];
}

export interface EnemyType {
  code: string;
  name: string;
  maxHealth: number;
  damage: number;
  attackRange: number;
  actionPoints: number;
  movementRange: number;
}

export interface QuestLogEntry {
  message: string;
  timestamp: string;
}

export interface AvailableQuest {
  questId: string;
  code: string;
  title: string;
  rewardGold: number;
  rewardExp: number;
  requiredNpcCount: number;
}

export interface QuestProgress {
  playerQuestId: string;
  questId: string;
  questCode: string;
  title: string;
  status: "ACTIVE" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
  talkedNpcsCount: number;
  totalNpcsCount: number;
  isCompleted: boolean;
  rewardClaimed: boolean;
  rewardGold: number;
  rewardExp: number;
  rewardItemName: string | null;
  logEntries: QuestLogEntry[];
}
