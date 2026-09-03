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
  const usedAp = plannedActions.length;
  const maxAp = combat.actionPoints;

  return (
    <div className="w-full flex flex-col gap-2 shrink-0">
      {/* ПАНЕЛЬ СОСТОЯНИЯ ДЕЙСТВИЙ И КНОПКА СБРОСА */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center justify-between rounded-xl border border-yellow-700/60 bg-yellow-950/40 px-3 py-2">
          <span className="text-xs uppercase tracking-wider text-yellow-500 font-semibold">
            Action Points
          </span>
          <div className="flex items-center gap-1">
            <span className="font-mono text-base font-bold text-yellow-300">
              {usedAp}
            </span>
            <span className="text-xs text-yellow-600">/</span>
            <span className="font-mono text-sm text-yellow-500">
              {maxAp} AP
            </span>
          </div>
        </div>

        <button
          onClick={onClear}
          disabled={isActing || plannedActions.length === 0}
          className="h-full px-4 py-2 rounded-xl border border-gray-600 bg-gray-800 text-xs font-semibold uppercase tracking-wider text-gray-300 hover:bg-gray-700 active:scale-95 transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      {/* СПИСОК ЗАПЛАНИРОВАННЫХ АТАК */}
      {attacks.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-red-700/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          <span className="font-bold uppercase tracking-wider text-red-400 shrink-0">
            Attacks planned:
          </span>
          <div className="flex flex-wrap gap-1 overflow-x-auto">
            {attacks.map(({ x, y }, index) => (
              <span
                key={index}
                className="rounded bg-red-900/60 border border-red-700 px-1.5 py-0.5 font-mono text-[11px] text-red-100"
              >
                ({x}, {y})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ГЛАВНАЯ КНОПКА ЗАВЕРШЕНИЯ ХОДА */}
      <button
        onClick={onEndTurn}
        disabled={!isMyTurn || isEndingTurn}
        className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide uppercase transition-all shadow-md active:scale-[0.98] ${
          isMyTurn
            ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30"
            : "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
        }`}
      >
        {isEndingTurn
          ? "Ending Turn..."
          : isMyTurn
            ? "End Turn"
            : "Enemy Turn..."}
      </button>

      {/* ВТОРОСТЕПЕННАЯ КНОПКА СДАЧИ */}
      {combat.status === "IN_PROGRESS" && (
        <button
          onClick={onFinishCombat}
          disabled={!isMyTurn || isActing}
          className="w-full py-1.5 text-center text-xs text-red-400/80 hover:text-red-300 underline decoration-dotted transition disabled:cursor-not-allowed disabled:opacity-30"
        >
          Surrender and finish combat
        </button>
      )}

      {/* ЭКРАН ЗАВЕРШЕНИЯ БОЯ */}
      {combat.status === "FINISHED" && (
        <div className="w-full rounded-xl border border-amber-600/80 bg-amber-950/90 p-4 text-center shadow-2xl backdrop-blur-sm animate-fade-in">
          <h4 className="text-lg font-extrabold uppercase tracking-widest text-amber-200 mb-1">
            {combat.winnerId === playerId ? "Victory!" : "Defeat"}
          </h4>
          <p className="text-xs text-amber-100/70 mb-3">
            {combat.winnerId === playerId
              ? "You successfully defeated your opponent."
              : "You were defeated in this combat session."}
          </p>
          <button
            onClick={onCombatFinished}
            className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 text-white py-2.5 font-bold text-xs uppercase tracking-wider transition active:scale-[0.98]"
          >
            Return to world
          </button>
        </div>
      )}
    </div>
  );
}
