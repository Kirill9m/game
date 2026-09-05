"use client";

import { WorldLoot } from "@/types/game";

interface LootPanelProps {
  /** Loot piles lying on the player's current tile. */
  fieldLoot: WorldLoot[];
  /** True when the player is inside the city (safe zone). */
  inSafeZone: boolean;
  playerId: string;
  onPickup: (lootId: string) => void | Promise<void>;
  /** Mobile compact mode — status + ground loot only. */
  compact?: boolean;
}

export default function LootPanel({
  fieldLoot,
  inSafeZone,
  playerId,
  onPickup,
  compact = false,
}: LootPanelProps) {

  if (compact) {
    return (
      <section className="w-full flex flex-col gap-2 rounded-xl border border-gray-800 bg-gray-950/60 p-2 text-left">
        {/* Location status */}
        {inSafeZone ? (
          <div className="flex items-center gap-2 rounded-lg border border-teal-500/40 bg-teal-950/30 px-2 py-1.5 text-[10px] text-teal-200">
            <span className="text-sm leading-none">🏙️</span>
            <div className="min-w-0">
              <span className="block font-bold uppercase tracking-wider text-teal-300">
                In the city
              </span>
              <span className="block truncate text-teal-200/70">
                Loot deposits into your inventory automatically.
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/30 px-2 py-1.5 text-[10px] text-amber-200">
            <span className="text-sm leading-none">⚠️</span>
            <div className="min-w-0">
              <span className="block font-bold uppercase tracking-wider text-amber-300">
                Outside the city
              </span>
              <span className="block truncate text-amber-200/70">
                Loot is marked in your inventory — lost if you die, dropped in PvP!
              </span>
            </div>
          </div>
        )}

        {/* Loot piles on the ground */}
        {fieldLoot.length > 0 && (
          <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/25 px-2 py-1.5">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-emerald-300">
              🎒 Loot on the ground · {fieldLoot.length}
            </span>
            <ul className="max-h-28 space-y-1 overflow-y-auto pr-0.5">
              {fieldLoot.map((pile) => {
                const isMine = pile.ownerId === playerId;
                return (
                  <li
                    key={pile.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-emerald-800/60 bg-black/30 px-2 py-1"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold text-emerald-100">
                        {pile.itemName}{" "}
                        <span className="text-emerald-300">× {pile.quantity}</span>
                      </span>
                      <span className="block text-[9px] text-emerald-200/60">
                        {isMine
                          ? "Dropped by you"
                          : pile.ownerName
                            ? `Dropped by ${pile.ownerName}`
                            : "Dropped loot"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onPickup(pile.id)}
                      className="shrink-0 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-emerald-500 active:scale-95"
                    >
                      Take
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="w-full flex flex-col gap-2 rounded-xl border border-gray-800 bg-gray-950/60 p-2.5 text-left">
      {/* Location status */}
      {inSafeZone ? (
        <div className="flex items-start gap-2 rounded-lg border border-teal-500/40 bg-teal-950/30 px-2.5 py-2 text-[11px] text-teal-200">
          <span className="text-base leading-none">🏙️</span>
          <div>
            <span className="block font-bold uppercase tracking-wider text-teal-300">
              In the city
            </span>
            <span className="text-teal-200/70">
              Collected loot is deposited into your inventory automatically.
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-950/30 px-2.5 py-2 text-[11px] text-amber-200">
          <span className="text-base leading-none">⚠️</span>
          <div>
            <span className="block font-bold uppercase tracking-wider text-amber-300">
              Outside the city
            </span>
            <span className="text-amber-200/70">
              Loot is marked in your inventory. Die outside the city and it&apos;s
              lost — killed by a player and it drops for them.
            </span>
          </div>
        </div>
      )}

      {/* Loot piles on the ground */}
      {fieldLoot.length > 0 && (
        <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/25 px-2.5 py-2">
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            🎒 Loot on the ground · {fieldLoot.length}
          </span>
          <ul className="max-h-32 space-y-1 overflow-y-auto pr-0.5">
            {fieldLoot.map((pile) => {
              const isMine = pile.ownerId === playerId;
              return (
                <li
                  key={pile.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-emerald-800/60 bg-black/30 px-2 py-1.5"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-emerald-100">
                      {pile.itemName}{" "}
                      <span className="text-emerald-300">× {pile.quantity}</span>
                    </span>
                    <span className="block text-[10px] text-emerald-200/60">
                      {isMine
                        ? "Dropped by you"
                        : pile.ownerName
                          ? `Dropped by ${pile.ownerName}`
                          : "Dropped loot"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void onPickup(pile.id)}
                    className="shrink-0 rounded-md bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-emerald-500 active:scale-95"
                  >
                    Take
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}