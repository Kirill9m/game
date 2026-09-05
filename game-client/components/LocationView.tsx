"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Location, LocationBuilding, LocationNpc } from "@/types/location";
import type { NpcInfo } from "@/types/npc";

interface LocationViewProps {
  locations: Location[];
  positionX: number;
  positionY: number;
  onTalk: (npc: NpcInfo) => void;
  /** Called when the player enters/leaves a building so the parent can lock movement. */
  onInsideChange: (inside: boolean) => void;
  /** Teleports the player to the given location's world coordinates. */
  onEnterLocation: (locationId: string) => Promise<void>;
}

export default function LocationView({
  locations,
  positionX,
  positionY,
  onTalk,
  onInsideChange,
  onEnterLocation,
}: LocationViewProps) {
  // The location the player is standing on (their feet on the world map).
  const rootId =
    locations.find((l) => l.positionX === positionX && l.positionY === positionY)?.id ?? null;

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [inside, setInside] = useState(false);
  // The location we entered from, used to teleport back on the final "Exit".
  const entryRef = useRef<string | null>(null);

  const current = useMemo(
    () =>
      locations.find((l) => l.id === currentId) ??
      locations.find((l) => l.id === rootId) ??
      null,
    [locations, currentId, rootId],
  );

  // Report the "inside" state so the parent can lock world movement.
  useEffect(() => {
    onInsideChange(inside);
    return () => onInsideChange(false);
  }, [inside, onInsideChange]);

  // While not inside, the shown location always follows the player's feet.
  useEffect(() => {
    if (!inside) setCurrentId(null);
  }, [inside]);

  const isEnterable = (building: LocationBuilding) =>
    Boolean(building.targetLocationId);

  const enterBuilding = async (building: LocationBuilding) => {
    if (!building.targetLocationId) return;
    const parentId = currentId ?? rootId ?? "";
    try {
      await onEnterLocation(building.targetLocationId);
      if (history.length === 0) entryRef.current = parentId;
      setHistory((h) => [...h, parentId]);
      setCurrentId(building.targetLocationId);
      setInside(true);
    } catch {
      // Teleport failed (e.g. cooldown) — stay where we are.
    }
  };

  const goBack = async () => {
    if (history.length > 1) {
      // Go back one level, still inside the location system.
      const prev = history[history.length - 1];
      try {
        await onEnterLocation(prev);
        setCurrentId(prev);
        setHistory((h) => h.slice(0, -1));
      } catch {
        // ignore — keep current location on failure
      }
    } else {
      // Last level — exit back to the location we entered from.
      const entry = entryRef.current ?? history[0] ?? rootId ?? "";
      try {
        await onEnterLocation(entry);
        setCurrentId(null);
        setHistory([]);
        setInside(false);
        entryRef.current = null;
      } catch {
        // ignore — keep current location on failure
      }
    }
  };

  const talkTo = (npc: LocationNpc) =>
    onTalk({
      id: npc.id,
      code: npc.code,
      name: npc.name,
      positionX: 0,
      positionY: 0,
    });

  if (!current) {
    return (
      <div className="text-center text-gray-500 text-sm py-10">
        No location here. Walk to a 🏛️ marker on the map to enter a location.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-wide text-emerald-200">
            📍 {current.name}{" "}
            <span className="text-emerald-400/70 font-mono">[{current.positionX}:{current.positionY}]</span>
          </h2>
          <p className="text-[10px] text-gray-500 font-mono">
            {inside ? "🔒 Inside — movement locked" : current.code}
          </p>
        </div>
        <button
          type="button"
          onClick={goBack}
          disabled={!inside}
          className="rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-gray-700 disabled:opacity-40 transition"
        >
          {history.length > 1 ? "← Back" : "🚪 Exit"}
        </button>
      </div>

      {/* The location image (or a placeholder) with buildings & NPCs */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-emerald-700/60 bg-emerald-950/40">
        {current.backgroundImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.backgroundImageUrl}
            alt={current.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/80 via-teal-900/60 to-slate-900/80" />
        )}

        {/* Buildings */}
        {current.buildings.map((building) => (
          <button
            key={building.id}
            type="button"
            onClick={() => enterBuilding(building)}
            disabled={!isEnterable(building)}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-0.5 rounded-lg border border-amber-300/50 bg-amber-900/70 text-amber-100 backdrop-blur-sm transition hover:scale-105 hover:bg-amber-800/80 disabled:cursor-default disabled:opacity-60"
            style={{
              left: `${building.x}%`,
              top: `${building.y}%`,
              width: `${building.width}%`,
              height: `${building.height}%`,
            }}
            title={building.targetLocationId ? `Enter ${building.name}` : building.name}
          >
            <span className="text-xl leading-none drop-shadow-md">
              {building.emoji || "🏠"}
            </span>
            <span className="text-[9px] font-bold uppercase tracking-wide leading-tight text-center px-1">
              {building.name}
            </span>
          </button>
        ))}

        {/* NPCs */}
        {current.npcs.map((npc) => (
          <button
            key={npc.id}
            type="button"
            onClick={() => talkTo(npc)}
            className="absolute z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sky-200 bg-sky-700 text-base shadow-[0_0_10px_rgba(56,189,248,0.85)] transition hover:scale-110 hover:bg-sky-500"
            style={{ left: `${npc.locationX}%`, top: `${npc.locationY}%` }}
            title={`Talk to ${npc.name}`}
            aria-label={`Talk to ${npc.name}`}
          >
            👤
          </button>
        ))}
      </div>

      {/* Legend / hints */}
      <p className="text-[10px] text-gray-500">
        {inside
          ? "You are inside a building. Leave to move around the world again."
          : "Buildings take you into a named location. 👤 marks a character you can talk to."}
      </p>
    </div>
  );
}
