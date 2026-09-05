"use client";

import WorldMap from "./WorldMap";
import type { GameMap, WorldCell, WorldLoot, WorldZone } from "@/types/game";
import type { Location } from "@/types/location";
import type { NpcInfo } from "@/types/npc";

interface Props {
  activeMap: GameMap;
  ownedMaps: GameMap[];
  positionX: number;
  positionY: number;
  safeZone: WorldZone | null;
  npcs: NpcInfo[];
  worldCells: WorldCell[];
  mapLoot: WorldLoot[];
  locations: Location[];
  onClose: () => void;
  onSelectMap: (map: GameMap) => void;
  onTalk: (npc: NpcInfo) => void;
}

export default function WorldMapModal({
  activeMap,
  ownedMaps,
  positionX,
  positionY,
  safeZone,
  npcs,
  worldCells,
  mapLoot,
  locations,
  onClose,
  onSelectMap,
  onTalk,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-800">
          <div>
            <h3 className="font-bold text-gray-200 text-sm uppercase tracking-wider">
              🗺️ {activeMap.name} [{positionX}:{positionY}]
            </h3>
            <p className="text-[10px] text-gray-500">
              You are at [{positionX}:{positionY}] · map center [{activeMap.centerX}:{activeMap.centerY}]
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="bg-red-950 hover:bg-red-800 border border-red-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
          >
            ✕ Close
          </button>
        </div>

        {ownedMaps.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mr-1">
              Maps:
            </span>
            {ownedMaps.map((gm) => (
              <button
                key={gm.id}
                type="button"
                onClick={() => onSelectMap(gm)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                  activeMap.id === gm.id
                    ? "border-blue-500 bg-blue-950/60 text-blue-200"
                    : "border-gray-700 bg-gray-800/40 text-gray-400 hover:bg-gray-800"
                }`}
              >
                {gm.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-auto bg-black/50 rounded-xl p-2 flex justify-center items-center min-h-[300px]">
          <WorldMap
            positionX={positionX}
            positionY={positionY}
            map={activeMap}
            safeZone={safeZone}
            npcs={npcs}
            cells={worldCells}
            loot={mapLoot}
            locations={locations}
            onTalk={onTalk}
          />
        </div>
      </div>
    </div>
  );
}
