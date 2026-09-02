import { playerApi } from "@/services/playerApi";
import { InventoryItem } from "@/types/game";
import type { DragEvent } from "react";

interface InventoryPanelProps {
  items: InventoryItem[];
  playerId: string;
  onItemsChange: (items: InventoryItem[]) => void;
  onOpenMap: () => void;
}

export default function InventoryPanel({
  items,
  playerId,
  onItemsChange,
  onOpenMap,
}: InventoryPanelProps) {
  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const itemCode = event.dataTransfer.getData("text/plain");
    if (!itemCode) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const gridX = Math.floor(((event.clientX - bounds.left) / bounds.width) * 8);
    const gridY = Math.floor(((event.clientY - bounds.top) / bounds.height) * 6);
    try {
      onItemsChange(await playerApi.moveInventoryItem(playerId, itemCode, gridX, gridY));
    } catch {
      // Keep the item in its previous position when the server rejects the drop.
    }
  };

  const handleEquip = async (itemCode: string) => {
    try {
      onItemsChange(await playerApi.equipItem(playerId, itemCode));
    } catch {
      // The page displays the inventory state returned by the server.
    }
  };

  return (
    <section className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">Inventory</h2>
        <span className="text-xs text-gray-500">8 x 6 stash</span>
      </div>
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => void handleDrop(event)}
        className="relative aspect-4/3 w-full overflow-hidden rounded-md border border-gray-700 bg-gray-950 p-1"
      >
        <div className="pointer-events-none absolute inset-1 grid grid-cols-8 grid-rows-6 gap-1">
        {Array.from({ length: 48 }, (_, index) => {
          const cellX = index % 8;
          const cellY = Math.floor(index / 8);
          return (
            <div
              key={`${cellX}:${cellY}`}
              className="rounded-sm border border-gray-800 bg-gray-800/60"
            />
          );
        })}
        </div>
        {items.map((item) => (
          <div
            key={item.code}
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/plain", item.code)}
            className={`group absolute z-10 flex cursor-grab flex-col justify-between overflow-hidden rounded border p-1.5 active:cursor-grabbing ${item.code === "WORLD_MAP" ? "border-blue-300 bg-blue-700/70" : "border-amber-300/70 bg-amber-700/70"}`}
            style={{
              left: `calc(${item.gridX * 12.5}% + 0.25rem)`,
              top: `calc(${item.gridY * 16.6667}% + 0.25rem)`,
              width: `calc(${item.width * 12.5}% - 0.25rem)`,
              height: `calc(${item.height * 16.6667}% - 0.25rem)`,
            }}
          >
            <div className="flex items-start justify-between gap-1">
              <span className="truncate text-xs font-bold text-white">{item.name}</span>
              <span className="text-[10px] text-white/80">x{item.quantity}</span>
            </div>
            <span className="text-[10px] uppercase text-white/70">{item.width}x{item.height}</span>
            {item.code === "WORLD_MAP" && (
              <div className="flex gap-1">
                <button type="button" onClick={() => void handleEquip(item.code)} className="rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white">
                  {item.equipped ? "Unequip" : "Equip"}
                </button>
                {item.equipped && (
                  <button type="button" onClick={onOpenMap} className="rounded bg-blue-950/80 px-1.5 py-0.5 text-[10px] text-white">
                    Open
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}