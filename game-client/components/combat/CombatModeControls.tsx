import { InventoryItem } from "@/types/game";
import { PlannedAction, Posture } from "./types";

type CombatMode = "move" | "shoot";

interface CombatModeControlsProps {
  mode: CombatMode;
  plannedActions: PlannedAction[];
  plannedPosture: Posture;
  actionPoints: number;
  isMyTurn: boolean;
  isReplaying: boolean;
  onModeChange: (mode: CombatMode) => void;
  onPostureChange: (posture: Posture) => void;
  inventory: InventoryItem[];
  equippedItemCode: string;
  onEquip: (itemCode: string) => void;
}

export function CombatModeControls({
  mode,
  plannedActions,
  plannedPosture,
  actionPoints,
  isMyTurn,
  isReplaying,
  onModeChange,
  onPostureChange,
  inventory,
  equippedItemCode,
  onEquip,
}: CombatModeControlsProps) {
  return (
    <>
      <div className="flex w-full gap-2">
        <button
          onClick={() => onModeChange("move")}
          className={`flex-1 rounded-lg py-2 font-semibold ${mode === "move" ? "bg-teal-600" : "bg-gray-700 text-gray-300"}`}
        >
          Walk
        </button>
        <button
          onClick={() => onModeChange("shoot")}
          className={`flex-1 rounded-lg py-2 font-semibold ${mode === "shoot" ? "bg-red-600" : "bg-gray-700 text-gray-300"}`}
        >
          Shoot
        </button>
      </div>
      <div className="flex w-full gap-1">
        {(["STANDING", "CROUCHING", "PRONE"] as const).map((posture) => (
          <button
            key={posture}
            type="button"
            disabled={
              !isMyTurn ||
              isReplaying ||
              plannedActions.length >= actionPoints ||
              posture === plannedPosture
            }
            onClick={() => onPostureChange(posture)}
            title={posture.toLowerCase()}
            className={`flex items-center justify-center flex-1 rounded-lg border p-2 ${posture === plannedPosture ? "border-yellow-300 bg-yellow-700 text-white" : "border-gray-600 bg-gray-700 text-gray-300"} disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <span className="text-xs font-bold">
              {posture === "STANDING"
                ? "STAND"
                : posture === "CROUCHING"
                  ? "CROUCH"
                  : "PRONE"}
            </span>
          </button>
        ))}
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        {inventory.map((item) => (
          <button
            key={item.code}
            type="button"
            disabled={!isMyTurn || isReplaying || item.code === equippedItemCode || plannedActions.length >= actionPoints}
            onClick={() => onEquip(item.code)}
            className={`rounded-lg border p-2 text-left ${item.code === equippedItemCode ? "border-cyan-300 bg-cyan-900/70" : "border-gray-600 bg-gray-700 text-gray-300"} disabled:cursor-not-allowed disabled:opacity-45`}
          >
            <span className="block text-sm font-semibold">{item.name}</span>
            <span className="block text-xs opacity-75">{item.damage} damage | range {item.attackRange}</span>
          </button>
        ))}
      </div>
    </>
  );
}
