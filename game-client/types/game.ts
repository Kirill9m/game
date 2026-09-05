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
  /** Flat damage reduction while equipped (armor). */
  defense?: number;
  /** Armor slot: HELMET / BODY / LEGS / FEET. */
  equipmentSlot?: string | null;
  /** How much health this consumable restores when used (0 for non-consumables). */
  heal?: number;
  /** True when collected outside the city and still at risk (field loot). */
  marked?: boolean;
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
  /** Loot piles lying on the tile the player moved to. */
  fieldLoot?: WorldLoot[];
  /** Main inventory after the move (marked field loot is secured on city entry). */
  inventory?: InventoryItem[];
  /** True when entering the city secured the player's marked field loot. */
  lootDeposited?: boolean;
  /** How many marked items were secured into the main inventory. */
  lootDepositedCount?: number;
  /** True when the player is inside the city (safe zone). */
  inSafeZone?: boolean;
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
  /** Loot piles lying on the player's current cell. */
  fieldLoot?: WorldLoot[];
  /** True when the player is inside the city (safe zone). */
  inSafeZone?: boolean;
}

/** A loot pile lying on a world cell, dropped by a defeated player. */
export interface WorldLoot {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  ownerId?: string | null;
  ownerName?: string | null;
  positionX?: number;
  positionY?: number;
}

/** Result of picking up a world loot pile. */
export interface PickupLootResponse {
  fieldLoot: WorldLoot[];
  inventory: InventoryItem[];
  notice?: string;
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
  /** Loot piles lying on the board — walk onto a cell, then press Take Loot. */
  loot?: CombatLoot[];
  /** Optimistic-lock counter; increases on each server save (stale-poll guard). */
  version?: number;
}

/** A loot pile lying on a combat board cell. */
export interface CombatLoot {
  x: number;
  y: number;
  itemCode: string;
  itemName: string;
  quantity: number;
}

export interface EnemyType {
  code: string;
  name: string;
  maxHealth: number;
  damage: number;
  attackRange: number;
  actionPoints: number;
  movementRange: number;
  /** Items this enemy may drop on the combat board when it dies. */
  lootDrops?: EnemyLootDrop[];
}

/** One configured loot drop entry of an enemy type. */
export interface EnemyLootDrop {
  itemCode: string;
  chance: number;
  minQuantity: number;
  maxQuantity: number;
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
