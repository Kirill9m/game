"use client";

import { playerApi } from "@/services/playerApi";
import { InventoryItem } from "@/types/game";

interface EquipmentPanelProps {
  items: InventoryItem[];
  playerId: string;
  onItemsChange: (items: InventoryItem[]) => void;
}

interface Slot {
  key: string;
  label: string;
  icon: string;
  matches: (item: InventoryItem) => boolean;
  stat: (item: InventoryItem) => string;
}

const SLOTS: Slot[] = [
  {
    key: "WEAPON",
    label: "Weapon",
    icon: "⚔️",
    matches: (item) => item.type === "WEAPON",
    stat: (item) => `${item.damage} dmg`,
  },
  {
    key: "HELMET",
    label: "Helmet",
    icon: "🪖",
    matches: (item) => item.equipmentSlot === "HELMET",
    stat: (item) => `🛡 ${item.defense ?? 0}`,
  },
  {
    key: "BODY",
    label: "Body armor",
    icon: "🛡️",
    matches: (item) => item.equipmentSlot === "BODY",
    stat: (item) => `🛡 ${item.defense ?? 0}`,
  },
  {
    key: "LEGS",
    label: "Legs",
    icon: "👖",
    matches: (item) => item.equipmentSlot === "LEGS",
    stat: (item) => `🛡 ${item.defense ?? 0}`,
  },
  {
    key: "FEET",
    label: "Feet",
    icon: "👢",
    matches: (item) => item.equipmentSlot === "FEET",
    stat: (item) => `🛡 ${item.defense ?? 0}`,
  },
];

/**
 * Character equipment screen: one slot per weapon + armor piece (helmet,
 * body, legs, feet). Shows what is currently equipped and lets the player
 * equip any owned item into a slot or unequip the current one.
 */
export default function EquipmentPanel({
  items,
  playerId,
  onItemsChange,
}: EquipmentPanelProps) {
  const totalDefense = items
    .filter((item) => item.equipped && item.type === "ARMOR")
    .reduce((sum, item) => sum + (item.defense ?? 0), 0);

  const toggle = async (itemCode: string) => {
    try {
      onItemsChange(await playerApi.equipItem(playerId, itemCode));
    } catch {
      // Ignore; the server returns the previous state on failure.
    }
  };

  return (
    <section className="w-full rounded-xl border border-gray-700 bg-gray-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">Equipment</h2>
        <span className="text-xs text-emerald-300">🛡 {totalDefense} armor</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SLOTS.map((slot) => {
          const equipped = items.find(
            (item) => item.equipped && slot.matches(item),
          );
          const available = items.filter(
            (item) => !item.equipped && slot.matches(item),
          );

          return (
            <div
              key={slot.key}
              className="rounded-lg border border-gray-800 bg-gray-950 p-2"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  {slot.icon} {slot.label}
                </span>
                {equipped && (
                  <button
                    type="button"
                    onClick={() => void toggle(equipped.code)}
                    className="shrink-0 rounded border border-red-900 px-1.5 py-0.5 text-[10px] text-red-300 hover:bg-red-900/30 hover:text-red-200 transition"
                  >
                    Unequip
                  </button>
                )}
              </div>

              {equipped ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-gray-100">
                    {equipped.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-emerald-300">
                    {slot.stat(equipped)}
                  </span>
                </div>
              ) : (
                <div className="text-xs italic text-gray-600">— Empty —</div>
              )}

              {available.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {available.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => void toggle(item.code)}
                      title={`Equip ${item.name}`}
                      className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-[10px] text-gray-300 hover:bg-gray-700 hover:text-white transition"
                    >
                      {item.name}{" "}
                      <span className="text-emerald-300">{slot.stat(item)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
