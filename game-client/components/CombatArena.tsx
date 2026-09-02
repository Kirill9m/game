"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { combatApi } from "@/services/combatApi";

interface CombatArenaProps {
  combatId: string;
  playerId: string;
  initialCombat: any;
  onCombatUpdate: (combat: any) => void;
}

export default function CombatArena({
  combatId,
  playerId,
  initialCombat,
  onCombatUpdate,
}: CombatArenaProps) {
  const combat = initialCombat;
  const [error, setError] = useState("");
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [isEndingTurn, setIsEndingTurn] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const tileClickRef = useRef<(targetX: number, targetY: number) => void>(() => undefined);

  const isPlayer1 = playerId === combat.player1Id;
  const myX = isPlayer1 ? combat.p1X : combat.p2X;
  const myY = isPlayer1 ? combat.p1Y : combat.p2Y;
  const isMyTurn = combat.currentTurnPlayerId === playerId;

  const gridSize = 10; // 10x10 grid

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const latestCombat = await combatApi.getCombat(combatId);
        onCombatUpdate(latestCombat);
      } catch {
        // Polling is best effort; local combat remains usable during a network blip.
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [combatId, onCombatUpdate]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const gridFeatures: Array<{
      type: "Feature";
      properties: Record<string, never>;
      geometry: { type: "LineString"; coordinates: number[][] };
    }> = [];
    for (let x = 0; x <= gridSize; x += 1) {
      gridFeatures.push({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [[x - 0.5, 0.5], [x - 0.5, -9.5]] },
      });
    }
    for (let y = 0; y <= gridSize; y += 1) {
      gridFeatures.push({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates: [[-0.5, -y + 0.5], [9.5, -y + 0.5]] },
      });
    }

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      attributionControl: false,
      center: [4.5, -4.5],
      zoom: 4.8,
      minZoom: 4.2,
      maxZoom: 6.5,
      maxBounds: [[-1, -10], [10, 1]],
      style: {
        version: 8,
        sources: {},
        layers: [{ id: "background", type: "background", paint: { "background-color": "#111827" } }],
      },
    });

    map.on("load", () => {
      map.addSource("grid", {
        type: "geojson",
        data: { type: "FeatureCollection", features: gridFeatures },
      });
      map.addLayer({
        id: "grid-lines",
        type: "line",
        source: "grid",
        paint: { "line-color": "#374151", "line-width": 1 },
      });
    });
    map.on("click", (event) => {
      const targetX = Math.floor(event.lngLat.lng + 0.5);
      const targetY = Math.floor(-event.lngLat.lat + 0.5);
      if (targetX >= 0 && targetX < gridSize && targetY >= 0 && targetY < gridSize) {
        tileClickRef.current(targetX, targetY);
      }
    });
    mapRef.current = map;

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      markerRefs.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [combatId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRefs.current.forEach((marker) => marker.remove());
    const players = [
      { x: combat.p1X, y: combat.p1Y, label: combat.player1Id === playerId ? "You" : "Foe", color: "#2563eb" },
      { x: combat.p2X, y: combat.p2Y, label: combat.player2Id === playerId ? "You" : "Foe", color: "#dc2626" },
    ];
    markerRefs.current = players.map(({ x, y, label, color }) => {
      const element = document.createElement("div");
      element.className = "combat-marker";
      element.textContent = label;
      element.style.backgroundColor = color;
      return new Marker({ element }).setLngLat([x, -y]).addTo(map);
    });
  }, [combat, playerId]);

  const handleTileClick = async (targetX: number, targetY: number) => {
    if (!isMyTurn) {
      setError("Not your turn!");
      return;
    }
    try {
      setError("");
      // Calculate delta from current position to clicked tile
      const dx = targetX - myX;
      const dy = targetY - myY;

      // Restrict movement to adjacent tiles (Manhattan distance = 1) if desired,
      // or allow direct stepping depending on your AP rules.
      if (Math.abs(dx) + Math.abs(dy) !== 1) {
        setError("You can only move 1 tile at a time!");
        return;
      }

      const updated = await combatApi.moveInCombat(combatId, playerId, dx, dy);
      onCombatUpdate(updated);
      setCombatLog((prev) => [`Moved to (${targetX}, ${targetY})`, ...prev]);
    } catch (err: any) {
      setError(err.message || "Move failed");
    }
  };

  useEffect(() => {
    tileClickRef.current = (targetX, targetY) => {
      void handleTileClick(targetX, targetY);
    };
  }, [handleTileClick]);

  const handleEndTurn = async () => {
    if (isEndingTurn) return;
    try {
      setError("");
      setIsEndingTurn(true);
      const updated = await combatApi.endTurn(combatId, playerId);
      onCombatUpdate(updated);
      setCombatLog((prev) => [`Ended turn. Action points refilled.`, ...prev]);
    } catch (err: any) {
      setError(err.message || "Failed to end turn");
    } finally {
      setIsEndingTurn(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-lg">
      <div className="flex justify-between w-full bg-gray-900 p-3 rounded-lg border border-gray-700 text-sm">
        <div>
          <span className="text-gray-400">AP Left: </span>
          <span className="font-bold text-yellow-400">
            {combat.actionPoints}
          </span>
        </div>
        <div>
          <span
            className={
              isMyTurn
                ? "text-green-400 font-bold animate-pulse"
                : "text-red-400"
            }
          >
            {isMyTurn ? "Your Turn" : "Enemy Turn"}
          </span>
        </div>
      </div>

      {error && (
        <div className="text-red-400 text-xs bg-red-950 p-2 rounded w-full text-center">
          {error}
        </div>
      )}

      <div
        ref={mapContainerRef}
        className="h-[min(70vw,420px)] min-h-75 w-full overflow-hidden rounded-xl border border-gray-700"
      />

      <button
        onClick={handleEndTurn}
        disabled={!isMyTurn || isEndingTurn}
        className={`w-full py-2.5 rounded-lg font-semibold transition ${
          isMyTurn
            ? "bg-yellow-600 hover:bg-yellow-500 text-white"
            : "bg-gray-700 text-gray-400 cursor-not-allowed"
        }`}
      >
        End Turn
      </button>

      {/* Combat Activity Log */}
      <div className="w-full bg-gray-900 p-3 rounded-lg border border-gray-700 h-28 overflow-y-auto text-xs space-y-1">
        <p className="text-gray-500 font-semibold">Combat Log:</p>
        {combatLog.map((log, i) => (
          <p key={i} className="text-gray-300">
            [{new Date().toLocaleTimeString()}] {log}
          </p>
        ))}
      </div>
    </div>
  );
}
