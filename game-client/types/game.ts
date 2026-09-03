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
}

export interface WorldZone {
  name: string;
  centerX: number;
  centerY: number;
  radius: number;
}

export interface PlayerStateResponse {
  positionX: number;
  positionY: number;
  gold?: number;
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