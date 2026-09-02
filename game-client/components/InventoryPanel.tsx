import { InventoryItem } from "@/types/game";

interface InventoryPanelProps {
  items: InventoryItem[];
}

export default function InventoryPanel({ items }: InventoryPanelProps) {
  return (
    <section className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">Inventory</h2>
        <span className="text-xs text-gray-500">{items.length} items</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.code} className="rounded-lg border border-gray-700 bg-gray-800 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white">{item.name}</span>
              <span className="text-xs text-gray-400">x{item.quantity}</span>
            </div>
            <div className="mt-1 text-xs text-gray-400">
              {item.type} | {item.damage} damage | range {item.attackRange}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}