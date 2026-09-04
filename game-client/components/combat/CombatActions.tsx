"use client";

import { motion } from "framer-motion";
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
    <motion.div
      className="w-full flex flex-col gap-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.1 }}
    >
      {/* Action points + clear */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center justify-between rounded-xl border border-amber-500/40 bg-amber-950/25 px-3 py-2 backdrop-blur-sm">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/90">
            Action Points
          </span>
          <div className="flex items-center gap-1">
            <span className="font-mono text-base font-black text-amber-300">{usedAp}</span>
            <span className="text-[11px] text-amber-500/70">/</span>
            <span className="font-mono text-sm text-amber-400/90">{maxAp} AP</span>
          </div>
        </div>

        <button
          onClick={onClear}
          disabled={isActing || plannedActions.length === 0}
          className="h-full px-4 py-2 rounded-xl border border-gray-600 bg-gray-800 text-[11px] font-semibold uppercase tracking-wider text-gray-300 hover:bg-gray-700 active:scale-95 transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear
        </button>
      </div>

      {/* Planned attacks */}
      {attacks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-950/25 px-3 py-2 text-xs text-red-200 backdrop-blur-sm"
        >
          <span className="font-bold uppercase tracking-wider text-red-400 shrink-0">
            Shots planned:
          </span>
          <div className="flex flex-wrap gap-1 overflow-x-auto">
            {attacks.map(({ x, y }, index) => (
              <motion.span
                key={`${x}-${y}-${index}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="rounded bg-red-900/60 border border-red-700 px-1.5 py-0.5 font-mono text-[11px] text-red-100"
              >
                ({x}, {y})
              </motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* End turn */}
      <motion.button
        onClick={onEndTurn}
        disabled={!isMyTurn || isEndingTurn}
        initial={{ scale: 1 }}
        animate={{ scale: isMyTurn && !isEndingTurn ? 1.02 : 1, opacity: isMyTurn ? 1 : 0.55 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        whileTap={{ scale: 0.97 }}
        className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide uppercase transition-shadow ${
          isMyTurn
            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_10px_24px_rgba(217,119,6,0.4)]"
            : "bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed"
        }`}
      >
        {isEndingTurn
          ? "Ending Turn…"
          : isMyTurn
            ? "End Turn"
            : "Enemy Turn…"}
      </motion.button>

      {/* Surrender */}
      {combat.status === "IN_PROGRESS" && (
        <button
          onClick={onFinishCombat}
          disabled={!isMyTurn || isActing}
          className="w-full py-1.5 text-center text-xs text-red-400/80 hover:text-red-300 underline decoration-dotted transition disabled:cursor-not-allowed disabled:opacity-30"
        >
          Surrender and finish combat
        </button>
      )}

      {/* Victory / defeat overlay */}
      {combat.status === "FINISHED" && (
        <motion.div
          key={combat.winnerId}
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
          className="relative w-full overflow-hidden rounded-xl border border-amber-500/80 bg-amber-950/90 p-4 text-center shadow-2xl backdrop-blur-md"
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-amber-400/40 to-transparent" />
          <h4
            className={`text-2xl font-black uppercase tracking-[0.2em] ${
              combat.winnerId === playerId ? "text-emerald-300" : "text-red-400"
            }`}
          >
            {combat.winnerId === playerId ? "🏆 Victory!" : "💀 Defeat"}
          </h4>
          <p className="text-xs text-amber-100/70 mt-1">
            {combat.winnerId === playerId
              ? "You successfully defeated your opponent."
              : "You were defeated in this combat session."}
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onCombatFinished}
            className="w-full rounded-lg bg-amber-600 hover:bg-amber-500 text-white py-2.5 font-bold text-xs uppercase tracking-wider transition active:scale-[0.98]"
          >
            Return to world
          </motion.button>
        </motion.div>
      )}
    </motion.div>
  );
}