import { GameMap, WorldCell, WorldZone } from "@/types/game";
import { NpcInfo } from "@/types/npc";

interface WorldMapProps {
  positionX: number;
  positionY: number;
  /** The map being shown — its center can differ from the player's position. */
  map: GameMap;
  /** Village safe zone — cells inside it are drawn blue. */
  safeZone?: WorldZone | null;
  npcs: NpcInfo[];
  /** Admin-configured per-cell dangers (blocked / radiation / ambush). */
  cells?: WorldCell[];
  onTalk: (npc: NpcInfo) => void;
}

const MAP_SIZE = 20;
const HALF_MAP = Math.floor(MAP_SIZE / 2);

export default function WorldMap({
  positionX,
  positionY,
  map,
  safeZone,
  npcs,
  cells,
  onTalk,
}: WorldMapProps) {
  const isInsideSafe = (x: number, y: number) => {
    if (!safeZone) return false;
    const dx = x - safeZone.centerX;
    const dy = y - safeZone.centerY;
    return dx * dx + dy * dy <= safeZone.radius * safeZone.radius;
  };

  // Grid cell (gridX, gridY) → world coordinates. The grid shows cells
  // [centerX - 10 .. centerX + 9] × [centerY - 10 .. centerY + 9].
  const toWorldX = (gridX: number) => map.centerX + gridX - HALF_MAP;
  const toWorldY = (gridY: number) => map.centerY + gridY - HALF_MAP;

  const inMapArea = (x: number, y: number) => {
    const dx = x - map.centerX;
    const dy = y - map.centerY;
    return dx * dx + dy * dy <= map.radius * map.radius;
  };

  const cellSettings = new Map(
    (cells ?? []).map((cell) => [`${cell.positionX}:${cell.positionY}`, cell]),
  );

  return (
    <section className="space-y-3 rounded-lg border border-red-500/60 bg-red-950/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-blue-200">
            {map.name}
          </h2>
          {map.description && (
            <p className="text-xs text-red-200/80">{map.description}</p>
          )}
          <p className="text-xs text-red-200/70">
            Blue dome: safe | Red land: dangerous | ☢️ radiation | 🚫 blocked |
            👹 ambush
          </p>
        </div>
        <span className="rounded-full border border-blue-300/60 bg-blue-500/20 px-2 py-1 text-xs text-blue-100">
          Center [{map.centerX}:{map.centerY}] · R{map.radius}
        </span>
      </div>

      <div className="aspect-square w-full overflow-hidden rounded-md border border-red-300/40 bg-red-700/50 p-1">
        {/* Внутренний relative-контейнер без p-1 для точного позиционирования оверлея */}
        <div className="relative h-full w-full">
          <div className="grid h-full w-full grid-cols-20 grid-rows-20 gap-px bg-red-950/70">
            {Array.from({ length: MAP_SIZE * MAP_SIZE }, (_, index) => {
              const gridX = index % MAP_SIZE;
              const gridY = MAP_SIZE - 1 - Math.floor(index / MAP_SIZE);

              const x = toWorldX(gridX);
              const y = toWorldY(gridY);

              // Cells that fall outside the circular area this map covers are dimmed.
              const inMap = inMapArea(x, y);

              const safe = inMap && isInsideSafe(x, y);
              const current = positionX === x && positionY === y;
              const npcsAtPosition = npcs.filter(
                (npc) => npc.positionX === x && npc.positionY === y,
              );
              const settings = cellSettings.get(`${x}:${y}`);

              let bg = safe
                ? "bg-blue-500/55"
                : inMap
                  ? "bg-red-600/65"
                  : "bg-gray-900/70";
              let icon = "";
              const details: string[] = [];
              if (settings?.blocked) {
                bg = "bg-gray-950";
                icon = "🚫";
                details.push("blocked");
              } else if ((settings?.radiation ?? 0) > 0 && inMap) {
                bg = "bg-lime-700/75";
                icon = "☢️";
                details.push(`☢ ${settings?.radiation} HP`);
              }
              if ((settings?.ambushChance ?? 0) > 0 && inMap) {
                if (!settings?.blocked && !icon) {
                  bg = "bg-orange-600/70";
                }
                icon = icon || "👹";
                details.push(
                  `👹 ${settings?.ambushChance}%${settings?.enemyName ? ` ${settings.enemyName}` : ""}`,
                );
              }

              return (
                <div
                  key={`${x}:${y}`}
                  className={`relative flex items-center justify-center ${bg}`}
                  title={`[${x}/${y}]${!inMap ? " — outside this map" : ""}${details.length ? ` — ${details.join(" | ")}` : ""}`}
                >
                  {icon && (
                    <div className="z-10 flex items-center justify-center">
                      <span className="text-lg select-none leading-none opacity-90 drop-shadow-md">
                        {icon}
                      </span>
                    </div>
                  )}
                  {npcsAtPosition.map((npc) => (
                    <button
                      key={npc.code}
                      type="button"
                      onClick={() => onTalk(npc)}
                      className="z-20 flex h-7 w-7 items-center justify-center rounded-full border border-sky-200 bg-sky-700 text-base shadow-[0_0_10px_rgba(56,189,248,0.85)] transition hover:scale-110 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-white"
                      title={`Talk to ${npc.name}`}
                      aria-label={`Talk to ${npc.name}`}
                    >
                      👤
                    </button>
                  ))}
                  {current && (
                    <span className="absolute bottom-1 right-1 z-10 h-3 w-3 rounded-full border-2 border-white bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.9)]" />
                  )}
                </div>
              );
            })}
          </div>

          {/* The circular area this map actually covers */}
          <div
            className="pointer-events-none absolute rounded-full border-2 border-cyan-300/80 bg-cyan-300/10 shadow-[0_0_28px_rgba(103,232,249,0.55)]"
            style={{
              left: `${((HALF_MAP - map.radius) / MAP_SIZE) * 100}%`,
              top: `${((HALF_MAP - map.radius) / MAP_SIZE) * 100}%`,
              width: `${((map.radius * 2 + 1) / MAP_SIZE) * 100}%`,
              aspectRatio: "1",
            }}
          />

          {/* The village safe zone (may be outside the current map's viewport) */}
          {safeZone && (
            <div
              className="pointer-events-none absolute rounded-full border-2 border-blue-200/80 bg-blue-300/15 shadow-[0_0_28px_rgba(96,165,250,0.8)]"
              style={{
                left: `${((safeZone.centerX - (map.centerX - HALF_MAP) - safeZone.radius) / MAP_SIZE) * 100}%`,
                bottom: `${((safeZone.centerY - (map.centerY - HALF_MAP) - safeZone.radius) / MAP_SIZE) * 100}%`,
                width: `${((safeZone.radius * 2 + 1) / MAP_SIZE) * 100}%`,
                aspectRatio: "1",
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
