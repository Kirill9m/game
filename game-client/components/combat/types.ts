import { CombatSession, InventoryItem } from "@/types/game";

export type Posture = "STANDING" | "CROUCHING" | "PRONE";

export type PlannedAction =
  | { type: "MOVE"; x: number; y: number }
  | { type: "ATTACK"; x: number; y: number }
  | { type: "POSTURE"; posture: Posture }
  | { type: "EQUIP"; itemCode: string }
  | { type: "USE"; itemCode: string };

export type ShotAnimation = {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Weapon range (in cells) used to scale the shot tracer length. */
  range?: number;
};

export type ReplayAction = ShotAnimation & {
  type: "MOVE" | "ATTACK";
  /** The player id of the acting fighter. */
  actor: string;
};

export type DamagePopup = { id: string; target: string; amount: number };
export type HealPopup = { id: string; target: string; amount: number };
export type Position = { x: number; y: number };
/** Display positions/health/postures keyed by player id. */
export type DisplayPositions = Record<string, Position>;
export type DisplayHealth = Record<string, number>;
export type DisplayPostures = Record<string, Posture>;

export interface CombatArenaProps {
  combatId: string;
  playerId: string;
  initialCombat: CombatSession;
  inventory: InventoryItem[];
  onCombatUpdate: (combat: CombatSession) => void;
  onCombatFinished: () => void;
  /** Show the inventory (mobile bottom sheet). */
  onOpenInventory?: () => void;
  /** Called after a combat round resolves (inventory may have changed: used consumables). */
  onInventoryChanged?: () => void;
  /** Called when the player wants to leave/spectate (a spectator or dead fighter). */
  onLeaveCombat?: () => void;
}

