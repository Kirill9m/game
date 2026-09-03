import { WorldCell, WorldZone } from "@/types/game";
import { NpcInfo } from "@/types/npc";

interface WorldMapProps {
  positionX: number;
  positionY: number;
  zone: WorldZone;
  npcs: NpcInfo[];
  /** Admin-configured per-cell dangers (blocked / radiation / ambush). */
  cells?: WorldCell[];
  onTalk: (npc: NpcInfo) => void;
}

const MAP_SIZE = 10;

export default function WorldMap({
  positionX,
  positionY,
  zone,
  npcs,
  cells,
  onTalk,
}: WorldMapProps) {
  const isInsideZone = (x: number, y: number) => {
    const distanceX = x - zone.centerX;
    const distanceY = y - zone.centerY;
    return (
      distanceX * distanceX + distanceY * distanceY <= zone.radius * zone.radius
    );
  };

  const cellSettings = new Map(
    (cells ?? []).map((cell) => [`${cell.positionX}:${cell.positionY}`, cell]),
  );

  return (
    <section className="space-y-3 rounded-lg border border-red-500/60 bg-red-950/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-blue-200">
            {zone.name}
          </h2>
          <p className="text-xs text-red-200/80">
            Blue dome: safe | Red land: dangerous | ☢️ radiation | 🚫 blocked |
            👹 ambush
          </p>
        </div>
        <span className="rounded-full border border-blue-300/60 bg-blue-500/20 px-2 py-1 text-xs text-blue-100">
          Radius {zone.radius}
        </span>
      </div>

      <div className="aspect-square w-full overflow-hidden rounded-md border border-red-300/40 bg-red-700/50 p-1">
        {/* Внутренний relative-контейнер без p-1 для точного позиционирования оверлея */}
        <div className="relative h-full w-full">
          <div className="grid h-full w-full grid-cols-10 grid-rows-10 gap-px bg-red-950/70">
            {Array.from({ length: MAP_SIZE * MAP_SIZE }, (_, index) => {
              const x = index % MAP_SIZE;
              // Y=0 внизу, Y=9 вверху (Декартова система координат)
              const y = MAP_SIZE - 1 - Math.floor(index / MAP_SIZE);
              const safe = isInsideZone(x, y);
              const current = positionX === x && positionY === y;
              const npcsAtPosition = npcs.filter(
                (npc) => npc.positionX === x && npc.positionY === y,
              );
              const settings = cellSettings.get(`${x}:${y}`);

              let bg = safe ? "bg-blue-500/55" : "bg-red-600/65";
              let icon = "";
              const details: string[] = [];
              if (settings?.blocked) {
                bg = "bg-gray-950";
                icon = "🚫";
                details.push("blocked");
              } else if ((settings?.radiation ?? 0) > 0) {
                bg = "bg-lime-700/75";
                icon = "☢️";
                details.push(`☢ ${settings?.radiation} HP`);
              }
              if ((settings?.ambushChance ?? 0) > 0) {
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
                  title={`[${x}/${y}]${details.length ? ` — ${details.join(" | ")}` : ""}`}
                >
                  {icon && (
                    <span className="z-10 select-none text-[10px] leading-none opacity-90">
                      {icon}
                    </span>
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

          <div
            className="pointer-events-none absolute rounded-full border-2 border-blue-200/80 bg-blue-300/15 shadow-[0_0_28px_rgba(96,165,250,0.8)]"
            style={{
              left: `${((zone.centerX - zone.radius) / MAP_SIZE) * 100}%`,
              bottom: `${((zone.centerY - zone.radius) / MAP_SIZE) * 100}%`,
              width: `${((zone.radius * 2 + 1) / MAP_SIZE) * 100}%`,
              aspectRatio: "1",
            }}
          />
        </div>
      </div>
    </section>
  );
}