import { CombatSession } from "@/types/game";
import { PlannedAction } from "./types";

interface CombatActionsProps {
  combat: CombatSession;
  plannedActions: PlannedAction[];
  isMyTurn: boolean;
  isActing: boolean;
  isEndingTurn: boolean;
  playerId: string;
  onClear: () => void;
  onEndTurn: () => void;
  onFinishCombat: () => void;
  onCombatFinished: () => void;
}

export function CombatActions({
  combat,
  plannedActions,
  isMyTurn,
  isActing,
  isEndingTurn,
  playerId,
  onClear,
  onEndTurn,
  onFinishCombat,
  onCombatFinished,
}: CombatActionsProps) {
  const attacks = plannedActions.filter((action) => action.type === "ATTACK");
  return (
    <>
      <div className="flex w-full items-center gap-2">
        <div className="flex-1 rounded-lg border border-yellow-700/60 bg-yellow-950/30 px-3 py-2 text-sm text-yellow-200">
          Plan: {plannedActions.length} / {combat.actionPoints} actions
        </div>
        <button
          onClick={onClear}
          disabled={isActing || plannedActions.length === 0}
          className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>
      {attacks.length > 0 && (
        <div className="w-full rounded-lg border border-red-700/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          Shots planned: {attacks.map(({ x, y }) => `(${x}, ${y})`).join(", ")}
        </div>
      )}
      <button
        onClick={onEndTurn}
        disabled={!isMyTurn || isEndingTurn}
        className={`w-full py-2.5 rounded-lg font-semibold transition ${isMyTurn ? "bg-yellow-600 hover:bg-yellow-500 text-white" : "bg-gray-700 text-gray-400 cursor-not-allowed"}`}
      >
        End Turn
      </button>
      <button
        onClick={onFinishCombat}
        disabled={!isMyTurn || isActing || combat.status !== "IN_PROGRESS"}
        className="w-full rounded-lg border border-red-700 py-2 text-sm text-red-300 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Surrender and finish combat
      </button>
      {combat.status === "FINISHED" && (
        <div className="w-full rounded-lg border border-yellow-700 bg-yellow-950/50 p-3 text-center">
          {combat.winnerId === playerId ? "You won!" : "You lost this combat."}
          <button
            onClick={onCombatFinished}
            className="mt-2 block w-full rounded bg-yellow-600 py-2 font-semibold"
          >
            Return to world
          </button>
        </div>
      )}
    </>
  );
}
