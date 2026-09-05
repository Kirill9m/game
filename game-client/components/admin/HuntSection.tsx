"use client";

import { useState } from "react";
import type { AdminEnemyType } from "@/types/admin";
import type { SectionProps } from "./types";

interface Props extends SectionProps {
  enemies: AdminEnemyType[];
  onHunt: (enemyCode: string) => void;
}

/**
 * Lets an admin pick an enemy type from the nearby woods and start a bot
 * combat session ("wolf hunt"). Moved out of the main game navigation so it
 * is only reachable from the admin panel.
 */
export default function HuntSection({ enemies, onHunt, busy }: Props) {
  const [selectedCode, setSelectedCode] = useState("");

  return (
    <div className="w-full rounded-xl border border-amber-800/50 bg-amber-950/20 p-3">
      <div className="mb-3">
        <span className="block text-sm font-bold text-amber-200">
          🐺 Hunt
        </span>
        <span className="text-xs text-amber-200/60">
          Choose an enemy in the nearby woods to start a hunt.
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {enemies.map((enemy) => (
          <button
            key={enemy.code}
            type="button"
            disabled={busy}
            onClick={() => {
              setSelectedCode(enemy.code);
              onHunt(enemy.code);
            }}
            className={`rounded-xl border p-3 text-left transition disabled:opacity-50 ${
              selectedCode === enemy.code
                ? "border-amber-400 bg-amber-900/60 shadow-lg"
                : "border-amber-900/40 bg-black/30 hover:border-amber-600"
            }`}
          >
            <span className="block font-bold text-amber-100 text-sm mb-1">
              {enemy.name}
            </span>
            <span className="block text-[11px] text-amber-200/70">
              {enemy.maxHealth} HP | {enemy.damage} DMG | RNG {enemy.attackRange}
            </span>
          </button>
        ))}
      </div>
      {enemies.length === 0 && (
        <div className="text-center text-gray-500 text-xs py-4">
          No enemy types to hunt yet.
        </div>
      )}
    </div>
  );
}
