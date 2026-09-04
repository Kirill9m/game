import { playerApi } from "@/services/playerApi";
import { InventoryItem } from "@/types/game";
import { useState, useRef, DragEvent, TouchEvent, MouseEvent } from "react";

interface InventoryPanelProps {
  items: InventoryItem[];
  playerId: string;
  onItemsChange: (items: InventoryItem[]) => void;
  /** Called when a map/utility item is opened, with the item's code. */
  onOpenMap?: (itemCode?: string) => void;
}

const COLUMNS = 8;
const MIN_ROWS = 6;

export default function InventoryPanel({
  items,
  playerId,
  onItemsChange,
  onOpenMap,
}: InventoryPanelProps) {
  const [selectedItemCode, setSelectedItemCode] = useState<string | null>(null);
  const [touchDraggingCode, setTouchDraggingCode] = useState<string | null>(
    null,
  );
  const gridRef = useRef<HTMLDivElement>(null);

  // Динамический расчет рядов (если вещей больше, чем на 6 рядов — сетка растет вниз)
  const maxItemRow = items.reduce(
    (max, item) => Math.max(max, item.gridY + item.height),
    0,
  );
  const totalRows = Math.max(MIN_ROWS, maxItemRow);

  // Вспомогательная функция расчета ячейки по координатам экрана
  const getGridCoordinates = (clientX: number, clientY: number) => {
    if (!gridRef.current) return { gridX: 0, gridY: 0 };
    const bounds = gridRef.current.getBoundingClientRect();

    const relativeX = clientX - bounds.left;
    const relativeY = clientY - bounds.top;

    const gridX = Math.max(
      0,
      Math.min(COLUMNS - 1, Math.floor((relativeX / bounds.width) * COLUMNS)),
    );
    const gridY = Math.max(
      0,
      Math.min(
        totalRows - 1,
        Math.floor((relativeY / bounds.height) * totalRows),
      ),
    );

    return { gridX, gridY };
  };

  // Метод перемещения
  const moveItemTo = async (itemCode: string, gridX: number, gridY: number) => {
    try {
      onItemsChange(
        await playerApi.moveInventoryItem(playerId, itemCode, gridX, gridY),
      );
    } catch {
      // Игнорируем ошибку, сервер вернет прежнее состояние
    } finally {
      setSelectedItemCode(null);
      setTouchDraggingCode(null);
    }
  };

  // --- HTML5 Mouse Drag & Drop ---
  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const itemCode = event.dataTransfer.getData("text/plain");
    if (!itemCode) return;
    const { gridX, gridY } = getGridCoordinates(event.clientX, event.clientY);
    await moveItemTo(itemCode, gridX, gridY);
  };

  // --- Touch Screen Drag & Drop ---
  const handleTouchStart = (itemCode: string) => {
    setTouchDraggingCode(itemCode);
  };

  const handleTouchEnd = async (event: TouchEvent<HTMLDivElement>) => {
    if (!touchDraggingCode) return;
    const touch = event.changedTouches[0];
    if (!touch) return;

    const { gridX, gridY } = getGridCoordinates(touch.clientX, touch.clientY);
    await moveItemTo(touchDraggingCode, gridX, gridY);
  };

  // --- Tap-to-Move (Клик по предмету -> Клик по ячейке) ---
  const handleGridClick = async (event: MouseEvent<HTMLDivElement>) => {
    if (!selectedItemCode) return;
    const { gridX, gridY } = getGridCoordinates(event.clientX, event.clientY);
    await moveItemTo(selectedItemCode, gridX, gridY);
  };

  const handleEquip = async (itemCode: string) => {
    try {
      onItemsChange(await playerApi.equipItem(playerId, itemCode));
    } catch {}
  };

  return (
    <section className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300">
          Inventory{" "}
          {selectedItemCode && (
            <span className="text-xs text-amber-400">
              (Item selected, tap cell to place)
            </span>
          )}
        </h2>
        <span className="text-xs text-gray-500">8 x {totalRows} stash</span>
      </div>

      {/* Обертка со скроллом для переполнения */}
      <div className="max-h-[420px] overflow-y-auto overflow-x-hidden rounded-md border border-gray-700 bg-gray-950 p-1">
        <div
          ref={gridRef}
          onClick={handleGridClick}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => void handleDrop(event)}
          onTouchEnd={(event) => void handleTouchEnd(event)}
          className="relative w-full"
          style={{
            // Фиксируем пропорциональную высоту сетки в зависимости от кол-ва рядов
            aspectRatio: `${COLUMNS} / ${totalRows}`,
          }}
        >
          {/* Сетка ячеек */}
          <div
            className="pointer-events-none absolute inset-0 grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${totalRows}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: COLUMNS * totalRows }, (_, index) => {
              const cellX = index % COLUMNS;
              const cellY = Math.floor(index / COLUMNS);
              return (
                <div
                  key={`${cellX}:${cellY}`}
                  className="rounded-sm border border-gray-800 bg-gray-800/60"
                />
              );
            })}
          </div>

          {/* Предметы */}
          {items.map((item) => {
            const isSelected = selectedItemCode === item.code;
            const isTouchDragging = touchDraggingCode === item.code;

            return (
              <div
                key={item.code}
                draggable
                onDragStart={(event) =>
                  event.dataTransfer.setData("text/plain", item.code)
                }
                onTouchStart={() => handleTouchStart(item.code)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItemCode(isSelected ? null : item.code);
                }}
                className={`group absolute z-10 flex cursor-grab flex-col justify-between overflow-hidden rounded border p-1.5 transition-all active:cursor-grabbing ${
                  isSelected
                    ? "ring-2 ring-amber-400 border-white bg-amber-600/90"
                    : isTouchDragging
                      ? "opacity-50 scale-95"
                      : item.code === "WORLD_MAP"
                        ? "border-blue-300 bg-blue-700/70"
                        : "border-amber-300/70 bg-amber-700/70"
                }`}
                style={{
                  left: `calc(${(item.gridX / COLUMNS) * 100}% + 2px)`,
                  top: `calc(${(item.gridY / totalRows) * 100}% + 2px)`,
                  width: `calc(${(item.width / COLUMNS) * 100}% - 4px)`,
                  height: `calc(${(item.height / totalRows) * 100}% - 4px)`,
                }}
              >
                <div className="flex items-start justify-between gap-1 pointer-events-none">
                  <span className="truncate text-xs font-bold text-white">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-white/80">
                    x{item.quantity}
                  </span>
                </div>

                <span className="text-[10px] uppercase text-white/70 pointer-events-none">
                  {item.width}x{item.height}
                </span>

                {(item.type === "WEAPON" || item.type === "UTILITY") && (
                  <div className="flex gap-1 z-20">
                    {item.type === "WEAPON" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleEquip(item.code);
                        }}
                        className="rounded bg-black/50 hover:bg-black/80 px-1.5 py-0.5 text-[10px] text-white"
                      >
                        {item.equipped ? "Unequip" : "Equip"}
                      </button>
                    )}
                    {item.type === "UTILITY" && onOpenMap && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMap(item.code);
                        }}
                        className="rounded bg-blue-950/80 hover:bg-blue-900 px-1.5 py-0.5 text-[10px] text-white"
                      >
                        Open
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
