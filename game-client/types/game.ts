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