"use client";

import { motion } from "framer-motion";
import { CombatLoot } from "@/types/game";

/** A pile listed in the picker plus its index inside the combat's loot array. */
export interface CombatLootPickerPile {
  lootIndex: number;
  pile: CombatLoot;
}

interface CombatLootPickerProps {
  /** Piles lying on or next to the player's current cell. */
  piles: CombatLootPickerPile[];
  /** Indexes (into the combat's loot array) the player has selected. */
  selectedIndexes: Set<number>;
  busy: boolean;
  onToggle: (lootIndex: number) => void;
  onTake: () => void;
  onCancel: () => void;
}

/** A compact panel letting the player choose which loot piles to take. */
export function CombatLootPicker({
  piles,
  selectedIndexes,
  busy,
  onToggle,
  onTake,
  onCancel,
}: CombatLootPickerProps) {
  const selectedCount = piles.filter((entry) =>
    selectedIndexes.has(entry.lootIndex),
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="w-full flex flex-col gap-2 rounded-xl border border-emerald-500/50 bg-emerald-950/40 p-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300">
          🎒 Loot nearby — choose what to take
        </span>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="shrink-0 rounded-md border border-gray-700 bg-gray-800 px-2 py-0.5 text-[10px] text-gray-300 transition hover:bg-gray-700 disabled:opacity-40"
        >
          ✕
        </button>
      </div>

      {piles.length === 0 ? (
        <p className="text-[11px] text-emerald-200/70">
          The loot here is already gone.
        </p>
      ) : (
        <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-0.5">
          {piles.map(({ lootIndex, pile }) => {
            const selected = selectedIndexes.has(lootIndex);
            return (
              <li key={lootIndex}>
                <button
                  type="button"
                  onClick={() => onToggle(lootIndex)}
                  disabled={busy}
                  className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected
                      ? "border-emerald-400/80 bg-emerald-800/40"
                      : "border-gray-700 bg-black/30 hover:border-gray-500"
                  }`}
                >
                  <span className="text-sm leading-none">
                    {selected ? "☑" : "☐"}
                  </span>
                  <span className="min-w-0 truncate text-xs font-semibold text-emerald-100">
                    {pile.itemName}
                  </span>
                  <span className="ml-auto shrink-0 rounded bg-black/40 px-1.5 py-0.5 text-[11px] font-bold text-emerald-300">
                    × {pile.quantity}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onTake}
          disabled={busy || selectedCount === 0}
          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition hover:bg-emerald-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy
            ? "Taking…"
            : `Take selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="shrink-0 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-[11px] font-semibold text-gray-300 transition hover:bg-gray-700 active:scale-[0.98] disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}