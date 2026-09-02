import { CombatSession } from "@/types/game";

export type Posture = "STANDING" | "CROUCHING" | "PRONE";

export type PlannedAction =
  | { type: "MOVE"; x: number; y: number }
  | { type: "ATTACK"; x: number; y: number }
  | { type: "POSTURE"; posture: Posture };

export type ShotAnimation = {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

export type ReplayAction = ShotAnimation & {
  type: "MOVE" | "ATTACK";
  actor: "p1" | "p2";
};

export type DamagePopup = { id: string; target: "p1" | "p2"; amount: number };
export type Position = { x: number; y: number };
export type DisplayPositions = { p1: Position; p2: Position };
export type DisplayHealth = { p1: number; p2: number };
export type DisplayPostures = { p1: Posture; p2: Posture };

export interface CombatArenaProps {
  combatId: string;
  playerId: string;
  initialCombat: CombatSession;
  onCombatUpdate: (combat: CombatSession) => void;
  onCombatFinished: () => void;
}
