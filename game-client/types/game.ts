export interface PlayerInfo {
  playerId: string;
  userId: string;
  username?: string;
}

export interface MoveResponse {
  positionX: number;
  positionY: number;
  playersOnTile: PlayerInfo[];
  cooldown: string;
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
  p1X: number;
  p1Y: number;
  p2X: number;
  p2Y: number;
  p1Health: number;
  p2Health: number;
  winnerId?: string | null;
  status: "IN_PROGRESS" | "FINISHED";
}