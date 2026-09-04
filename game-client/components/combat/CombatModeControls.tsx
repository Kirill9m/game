"use client";

import { motion } from "framer-motion";
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

const POSTURES: { value: Posture; short: string; title: string }[] = [
  { value: "STANDING", short: "STAND", title: "Stand — 3 cells" },
  { value: "CROUCHING", short: "CROUCH", title: "Crouch — 2 cells" },
  { value: "PRONE", short: "PRONE", title: "Prone — 1 cell" },
];

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
  const locked = !isMyTurn || isReplaying || plannedActions.length >= actionPoints;
  const postureIndex = POSTURES.findIndex((p) => p.value === plannedPosture);

  return (
    <motion.div
      className="w-full flex flex-col gap-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.05 }}
    >
      {/* Mode switch — animate / attack */}
      <div className="relative flex w-full overflow-hidden rounded-xl border border-gray-700/70 bg-gray-900/70 p-0.5">
        <motion.span
          className={`seg-highlight ${mode === "move" ? "seg-highlight-move" : "seg-highlight-shoot"}`}
          style={{ width: "50%" }}
          initial={false}
          animate={{ left: mode === "move" ? "0.6%" : "50%" }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
        />
        {(["move", "shoot"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            className={`relative z-10 flex-1 rounded-[10px] py-2 text-xs font-bold uppercase tracking-widest transition-colors ${
              mode === value
                ? "text-white"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {value === "move" ? "🚶 Walk" : "🎯 Shoot"}
          </button>
        ))}
      </div>

      {/* Posture switch */}
      <div className="relative flex w-full overflow-hidden rounded-xl border border-gray-700/70 bg-gray-900/70 p-0.5">
        <motion.span
          className="seg-highlight seg-highlight-posture"
          style={{ width: "33.333%" }}
          initial={false}
          animate={{ left: `${postureIndex * 33.333}%` }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
        />
        {POSTURES.map((posture) => (
          <button
            key={posture.value}
            type="button"
            title={posture.title}
            disabled={locked || posture.value === plannedPosture}
            onClick={() => onPostureChange(posture.value)}
            className={`relative z-10 flex-1 rounded-[10px] py-1.5 text-[11px] font-bold tracking-wider transition-colors disabled:cursor-not-allowed ${
              posture.value === plannedPosture
                ? "text-white"
                : "text-gray-400 hover:text-gray-200 disabled:opacity-50"
            }`}
          >
            {posture.short}
          </button>
        ))}
      </div>

      {/* Equipment */}
      {inventory.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Active weapon
          </p>
          <div className="grid w-full grid-cols-2 gap-1.5">
            {inventory.map((item, index) => {
              const selected = item.code === equippedItemCode;
              return (
                <motion.button
                  key={item.code}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.06 + index * 0.05 }}
                  disabled={locked || selected}
                  onClick={() => onEquip(item.code)}
                  className={`relative rounded-lg border p-2 text-left transition-colors disabled:cursor-not-allowed ${
                    selected
                      ? "border-cyan-300/80 bg-cyan-900/50"
                      : "border-gray-700/70 bg-gray-800/60 text-gray-300 hover:border-gray-500 hover:bg-gray-700/60 disabled:opacity-50"
                  }`}
                >
                  {selected && (
                    <span className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-cyan-300/80 shadow-[0_0_12px_rgba(34,211,238,0.45)]" />
                  )}
                  <span className="block text-xs font-bold leading-tight">{item.name}</span>
                  <span className="block text-[10px] opacity-75">
                    {item.damage} dmg · range {item.attackRange}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}