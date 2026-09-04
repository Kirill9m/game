"use client";

import { motion } from "framer-motion";
import { InventoryItem } from "@/types/game";
import { PlannedAction, Posture } from "./types";

interface CombatModeControlsProps {
  plannedActions: PlannedAction[];
  plannedPosture: Posture;
  actionPoints: number;
  isMyTurn: boolean;
  isReplaying: boolean;
  onPostureChange: (posture: Posture) => void;
  inventory: InventoryItem[];
  equippedItemCode: string;
  onEquip: (itemCode: string) => void;
  onUse: (itemCode: string) => void;
}

const POSTURES: { value: Posture; short: string; title: string }[] = [
  { value: "STANDING", short: "STAND", title: "Stand — 3 cells" },
  { value: "CROUCHING", short: "CROUCH", title: "Crouch — 2 cells" },
  { value: "PRONE", short: "PRONE", title: "Prone — 1 cell" },
];

export function CombatModeControls({
  plannedActions,
  plannedPosture,
  actionPoints,
  isMyTurn,
  isReplaying,
  onPostureChange,
  inventory,
  equippedItemCode,
  onEquip,
  onUse,
}: CombatModeControlsProps) {
  const locked = !isMyTurn || isReplaying || plannedActions.length >= actionPoints;
  const postureIndex = POSTURES.findIndex((p) => p.value === plannedPosture);
  // Only weapons can be switched mid-combat; armor is equipped in the inventory.
  const weapons = inventory.filter((item) => item.type === "WEAPON");
  // Consumables that restore health (usable in combat, one action point each).
  const consumables = inventory.filter(
    (item) => item.type === "CONSUMABLE" && (item.heal ?? 0) > 0,
  );

  return (
    <motion.div
      className="w-full shrink-0 flex flex-col gap-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.05 }}
    >
      {/* Posture + equipment: на широких экранах в один ряд, иначе стопкой */}
      <div className="lg:flex lg:items-stretch lg:gap-2">
        {/* Posture switch */}
        <div className="relative flex w-full overflow-hidden rounded-xl border border-gray-700/70 bg-gray-900/70 p-0.5 lg:w-56 lg:shrink-0">
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
        {weapons.length > 0 && (
          <div className="min-h-0 lg:flex-1 lg:min-w-0 lg:flex lg:items-center lg:gap-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 lg:mb-0 lg:shrink-0">
              Active weapon
            </p>
            <div className="flex w-full gap-1.5 overflow-x-auto pb-0.5 lg:pb-0">
              {weapons.map((item, index) => {
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
                    className={`relative shrink-0 w-40 rounded-lg border p-2 text-left transition-colors disabled:cursor-not-allowed ${
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
      </div>

      {/* Consumables: use one to heal, costs one action point each */}
      {consumables.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Heal (1 AP each)
          </p>
          <div className="flex w-full gap-1.5 overflow-x-auto pb-0.5">
            {consumables.map((item, index) => (
              <motion.button
                key={item.code}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.06 + index * 0.05 }}
                disabled={locked}
                onClick={() => onUse(item.code)}
                className="relative shrink-0 w-36 rounded-lg border p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 border-green-500/50 bg-green-900/30 text-green-100 hover:border-green-400 hover:bg-green-900/50"
              >
                <span className="block text-xs font-bold leading-tight">{item.name}</span>
                <span className="block text-[10px] opacity-75">
                  ❤️ +{item.heal} · x{item.quantity}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
