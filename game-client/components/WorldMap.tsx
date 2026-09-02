import { WorldZone } from "@/types/game";

interface WorldMapProps {
  positionX: number;
  positionY: number;
  zone: WorldZone;
}

const MAP_SIZE = 10;

export default function WorldMap({ positionX, positionY, zone }: WorldMapProps) {
  const isInsideZone = (x: number, y: number) => {
    const distanceX = x - zone.centerX;
    const distanceY = y - zone.centerY;
    return distanceX * distanceX + distanceY * distanceY <= zone.radius * zone.radius;
  };

  return (
    <section className="space-y-3 rounded-lg border border-red-500/60 bg-red-950/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-blue-200">
            {zone.name}
          </h2>
          <p className="text-xs text-red-200/80">
            Blue dome: safe | Red land: dangerous
          </p>
        </div>
        <span className="rounded-full border border-blue-300/60 bg-blue-500/20 px-2 py-1 text-xs text-blue-100">
          Radius {zone.radius}
        </span>
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-md border border-red-300/40 bg-red-700/50 p-1">
        <div className="grid h-full w-full grid-cols-10 grid-rows-10 gap-px bg-red-950/70">
          {Array.from({ length: MAP_SIZE * MAP_SIZE }, (_, index) => {
            const x = index % MAP_SIZE;
            const y = MAP_SIZE - 1 - Math.floor(index / MAP_SIZE);
            const safe = isInsideZone(x, y);
            const current = positionX === x && positionY === y;
            return (
              <div
                key={`${x}:${y}`}
                className={`relative flex items-center justify-center ${
                  safe ? "bg-blue-500/55" : "bg-red-600/65"
                }`}
                title={`[${x}/${y}]`}
              >
                {current && (
                  <span className="z-10 h-3 w-3 rounded-full border-2 border-white bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.9)]" />
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
    </section>
  );
}
