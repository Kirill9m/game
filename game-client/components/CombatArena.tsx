"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { combatApi } from "@/services/combatApi";
import { CombatSession } from "@/types/game";

interface CombatArenaProps {
  combatId: string;
  playerId: string;
  initialCombat: CombatSession;
  onCombatUpdate: (combat: CombatSession) => void;
  onCombatFinished: () => void;
}

type PlannedAction =
  | { type: "MOVE"; x: number; y: number }
  | { type: "ATTACK"; x: number; y: number }
  | { type: "POSTURE"; posture: "STANDING" | "CROUCHING" | "PRONE" };

type ShotAnimation = {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

type ReplayAction = ShotAnimation & { type: "MOVE" | "ATTACK"; actor: "p1" | "p2" };
type DamagePopup = { id: string; target: "p1" | "p2"; amount: number };
type Posture = "STANDING" | "CROUCHING" | "PRONE";

const WATER_CELLS = new Set(["1:6", "2:6", "1:7", "2:7", "1:8", "2:8"]);
const WALL_CELLS = new Set(["3:3", "3:4", "3:5", "6:6", "7:6"]);

const isMovementBlocked = (x: number, y: number) => WATER_CELLS.has(`${x}:${y}`) || WALL_CELLS.has(`${x}:${y}`);
const postureMovement = (posture: Posture) => posture === "STANDING" ? 3 : posture === "CROUCHING" ? 2 : 1;

const getReachableCells = (startX: number, startY: number, maxSteps: number) => {
  const reachable = new Set<string>();
  const queue = [{ x: startX, y: startY, steps: 0 }];
  const visited = new Set([`${startX}:${startY}`]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.steps >= maxSteps) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = `${x}:${y}`;
      if (x < 0 || x >= 10 || y < 0 || y >= 10 || visited.has(key) || isMovementBlocked(x, y)) continue;
      visited.add(key);
      reachable.add(key);
      queue.push({ x, y, steps: current.steps + 1 });
    }
  }
  return reachable;
};

export default function CombatArena({
  combatId,
  playerId,
  initialCombat,
  onCombatUpdate,
  onCombatFinished,
}: CombatArenaProps) {
  const [combat, setCombat] = useState(initialCombat);
  const [mode, setMode] = useState<"move" | "shoot">("move");
  const [error, setError] = useState("");
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [plannedActions, setPlannedActions] = useState<PlannedAction[]>([]);
  const [isEndingTurn, setIsEndingTurn] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [animationTarget, setAnimationTarget] = useState<"p1" | "p2" | null>(null);
  const [displayPositions, setDisplayPositions] = useState({
    p1: { x: initialCombat.p1X, y: initialCombat.p1Y },
    p2: { x: initialCombat.p2X, y: initialCombat.p2Y },
  });
  const [replayAction, setReplayAction] = useState<ReplayAction | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [displayHealth, setDisplayHealth] = useState({ p1: initialCombat.p1Health, p2: initialCombat.p2Health });
  const [damagePopup, setDamagePopup] = useState<DamagePopup | null>(null);
  const [displayPostures, setDisplayPostures] = useState<{ p1: Posture; p2: Posture }>({
    p1: initialCombat.p1Posture || "STANDING",
    p2: initialCombat.p2Posture || "STANDING",
  });
  const isReplayingRef = useRef(false);
  const replayedRoundRef = useRef<string | null>(null);
  const replayTimersRef = useRef<number[]>([]);
  const previousCombatRef = useRef(initialCombat);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const tileClickRef = useRef<(targetX: number, targetY: number) => void>(() => undefined);

  const isPlayer1 = playerId === combat.player1Id;
  const myX = isPlayer1 ? combat.p1X : combat.p2X;
  const myY = isPlayer1 ? combat.p1Y : combat.p2Y;
  const isMyTurn = isPlayer1 ? !combat.p1Ready : !combat.p2Ready;
  const enemyX = isPlayer1 ? combat.p2X : combat.p1X;
  const enemyY = isPlayer1 ? combat.p2Y : combat.p1Y;
  const myHealth = isPlayer1 ? displayHealth.p1 : displayHealth.p2;
  const enemyHealth = isPlayer1 ? displayHealth.p2 : displayHealth.p1;
  const myPosture = isPlayer1 ? (combat.p1Posture || "STANDING") : (combat.p2Posture || "STANDING");
  const plannedPosture = [...plannedActions].reverse().find((action): action is Extract<PlannedAction, { type: "POSTURE" }> => action.type === "POSTURE")?.posture || myPosture;
  const movementRemaining = plannedActions.length < combat.actionPoints ? postureMovement(plannedPosture) : 0;
  const plannedEnd = [...plannedActions].reverse().find((action): action is Extract<PlannedAction, { type: "MOVE" }> => action.type === "MOVE");
  const reachableCells = getReachableCells(plannedEnd?.x ?? myX, plannedEnd?.y ?? myY, movementRemaining);

  const gridSize = 10; // 10x10 grid

  useEffect(() => {
    const previous = previousCombatRef.current;
    const movedP1 = previous.p1X !== combat.p1X || previous.p1Y !== combat.p1Y;
    const movedP2 = previous.p2X !== combat.p2X || previous.p2Y !== combat.p2Y;
    const damagedP1 = previous.p1Health > combat.p1Health;
    const damagedP2 = previous.p2Health > combat.p2Health;
    const roundActions = combat.lastRoundActions;

    const roundKey = roundActions?.length
      ? `${roundActions.join("|")}:${combat.p1X}:${combat.p1Y}:${combat.p2X}:${combat.p2Y}:${combat.p1Health}:${combat.p2Health}`
      : null;

    if (roundKey && roundActions && roundKey !== replayedRoundRef.current) {
      replayedRoundRef.current = roundKey;
      replayTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      let positions = {
        p1: { x: previous.p1X, y: previous.p1Y },
        p2: { x: previous.p2X, y: previous.p2Y },
      };
      setDisplayPositions(positions);
      setIsReplaying(true);
      isReplayingRef.current = true;
      setReplayAction(null);
      setDamagePopup(null);

      roundActions.forEach((encodedAction, index) => {
        const timer = window.setTimeout(() => {
          const [actor, type, first, second] = encodedAction.split(":");
          const actorKey = actor === "P1" ? "p1" : "p2";
          const current = positions[actorKey];
          if (type === "M") {
            const next = { x: current.x + Number(first), y: current.y + Number(second) };
            setReplayAction({ id: `${encodedAction}-${index}`, type: "MOVE", actor: actorKey, fromX: current.x, fromY: current.y, toX: next.x, toY: next.y });
            positions = { ...positions, [actorKey]: next };
            setDisplayPositions(positions);
            setAnimationTarget(actorKey);
          } else if (type === "P") {
            setDisplayPostures((postures) => ({ ...postures, [actorKey]: first as Posture }));
            setAnimationTarget(actorKey);
          } else if (type === "A") {
            const targetKey = actorKey === "p1" ? "p2" : "p1";
            const damage = Number(encodedAction.split(":")[4] || 0);
            setReplayAction({ id: `${encodedAction}-${index}`, type: "ATTACK", actor: actorKey, fromX: current.x, fromY: current.y, toX: Number(first), toY: Number(second) });
            setAnimationTarget(targetKey);
            if (damage > 0) {
              const damageTimer = window.setTimeout(() => {
                setDisplayHealth((health) => ({ ...health, [targetKey]: Math.max(0, health[targetKey] - damage) }));
                setDamagePopup({ id: `${encodedAction}-${index}-damage`, target: targetKey, amount: damage });
              }, 420);
              replayTimersRef.current.push(damageTimer);
            }
          }
        }, index * 700);
        replayTimersRef.current.push(timer);
      });
      replayTimersRef.current.push(window.setTimeout(() => {
        setDisplayPositions({ p1: { x: combat.p1X, y: combat.p1Y }, p2: { x: combat.p2X, y: combat.p2Y } });
        setDisplayHealth({ p1: combat.p1Health, p2: combat.p2Health });
        setDisplayPostures({ p1: combat.p1Posture || "STANDING", p2: combat.p2Posture || "STANDING" });
        setReplayAction(null);
        setDamagePopup(null);
        setAnimationTarget(damagedP1 ? "p1" : damagedP2 ? "p2" : null);
        setIsReplaying(false);
        isReplayingRef.current = false;
        replayTimersRef.current = [];
      }, roundActions.length * 700 + 500));
      const roundEvents = [
        ...(movedP1 ? ["Player 1 moved"] : []),
        ...(movedP2 ? ["Player 2 moved"] : []),
        ...(damagedP1 ? [`Player 1 took ${previous.p1Health - combat.p1Health} damage`] : []),
        ...(damagedP2 ? [`Player 2 took ${previous.p2Health - combat.p2Health} damage`] : []),
      ];
      setCombatLog((logs) => [...roundEvents.reverse(), ...logs].slice(0, 20));
      previousCombatRef.current = combat;
    }

    if (isReplayingRef.current) return;
    setDisplayPositions({ p1: { x: combat.p1X, y: combat.p1Y }, p2: { x: combat.p2X, y: combat.p2Y } });
    setDisplayHealth({ p1: combat.p1Health, p2: combat.p2Health });
    setDisplayPostures({ p1: combat.p1Posture || "STANDING", p2: combat.p2Posture || "STANDING" });

    if (previous.p1Ready !== combat.p1Ready || previous.p2Ready !== combat.p2Ready) {
      setCombatLog((logs) => [
        combat.p1Ready && combat.p2Ready ? "Round resolved" : "Plan submitted. Waiting for the enemy.",
        ...logs,
      ].slice(0, 20));
    }
    previousCombatRef.current = combat;
  }, [combat]);

  useEffect(() => () => {
    replayTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const latestCombat = await combatApi.getCombat(combatId);
        setCombat(latestCombat);
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
      attributionControl: {},
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
      map.fitBounds([[-0.5, -9.5], [9.5, 0.5]], { padding: 0, duration: 0 });
      map.addSource("terrain", {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      });
      map.addLayer({
        id: "terrain",
        type: "raster",
        source: "terrain",
        paint: { "raster-opacity": 0.82, "raster-saturation": -0.15, "raster-contrast": 0.08 },
      });
      map.addSource("grid", {
        type: "geojson",
        data: { type: "FeatureCollection", features: gridFeatures },
      });
      map.addSource("reachable", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "reachable-cells",
        type: "fill",
        source: "reachable",
        paint: { "fill-color": mode === "shoot" ? "#ef4444" : "#14b8a6", "fill-opacity": 0.28 },
      });
      map.addSource("planned", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "planned-cells",
        type: "fill",
        source: "planned",
        paint: { "fill-color": "#facc15", "fill-opacity": 0.5 },
      });
      map.addLayer({
        id: "grid-lines",
        type: "line",
        source: "grid",
        paint: { "line-color": "#f8fafc", "line-opacity": 0.72, "line-width": 1.4 },
      });
      setMapReady(true);
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
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [combatId, mode]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("reachable") as import("maplibre-gl").GeoJSONSource | undefined;
    if (!mapReady || !source || !isMyTurn || combat.status !== "IN_PROGRESS") return;

    const features = [];
    const plannedMoves = plannedActions.filter((action): action is Extract<PlannedAction, { type: "MOVE" }> => action.type === "MOVE");
    const movementEnd = plannedMoves.at(-1) ?? { x: myX, y: myY };
    for (let x = 0; x < gridSize; x += 1) {
      for (let y = 0; y < gridSize; y += 1) {
        const distance = Math.max(Math.abs(x - movementEnd.x), Math.abs(y - movementEnd.y));
        const available = mode === "move"
          ? reachableCells.has(`${x}:${y}`)
          : distance <= 3 && distance > 0;
        if (available) {
          if (mode === "move" && isMovementBlocked(x, y)) continue;
          if (mode === "shoot" && WALL_CELLS.has(`${x}:${y}`)) continue;
          features.push({
            type: "Feature" as const,
            properties: {},
            geometry: { type: "Polygon" as const, coordinates: [[[x - 0.5, -y + 0.5], [x + 0.5, -y + 0.5], [x + 0.5, -y - 0.5], [x - 0.5, -y - 0.5], [x - 0.5, -y + 0.5]]] },
          });
        }
      }
    }
    source.setData({ type: "FeatureCollection", features });
  }, [combat, isMyTurn, mapReady, mode, myX, myY, plannedActions]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("planned") as import("maplibre-gl").GeoJSONSource | undefined;
    if (!mapReady || !source) return;

    source.setData({
      type: "FeatureCollection",
      features: plannedActions
        .filter((action): action is Extract<PlannedAction, { type: "MOVE" }> => action.type === "MOVE")
        .map(({ x, y }, index) => ({
        type: "Feature" as const,
        properties: { step: index + 1 },
        geometry: {
          type: "Polygon" as const,
          coordinates: [[[x - 0.5, -y + 0.5], [x + 0.5, -y + 0.5], [x + 0.5, -y - 0.5], [x - 0.5, -y - 0.5], [x - 0.5, -y + 0.5]]],
        },
        })),
    });
  }, [mapReady, plannedActions]);

  const handleTileClick = async (targetX: number, targetY: number) => {
    if (!isMyTurn || isActing || combat.status !== "IN_PROGRESS") {
      setError("Not your turn!");
      return;
    }
    try {
      setError("");
      const dx = targetX - myX;
      const dy = targetY - myY;

      if (mode === "move" && isMovementBlocked(targetX, targetY)) {
        setError("This cell is blocked by terrain");
        return;
      }

      if (mode === "move" && movementRemaining <= 0) {
        setError(`${plannedPosture.toLowerCase()} allows ${postureMovement(plannedPosture)} movement cells`);
        return;
      }

      if (mode === "shoot") {
        if (targetX !== enemyX || targetY !== enemyY) {
          setError("Select the enemy cell to shoot");
          return;
        }
        if (plannedActions.length + 1 > combat.actionPoints) {
          setError(`You have ${combat.actionPoints} action point${combat.actionPoints === 1 ? "" : "s"} left`);
          return;
        }
        setPlannedActions((actions) => [...actions, { type: "ATTACK", x: targetX, y: targetY }]);
        return;
      }

      if (!reachableCells.has(`${targetX}:${targetY}`)) {
        setError(`Choose a reachable cell within ${postureMovement(plannedPosture)} cells`);
        return;
      }
      if (plannedActions.length >= combat.actionPoints) {
        setError(`You have ${combat.actionPoints} action point${combat.actionPoints === 1 ? "" : "s"} left`);
        return;
      }
      setError("");
      setPlannedActions((actions) => [...actions, { type: "MOVE", x: targetX, y: targetY }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsActing(false);
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
      let previousMove = { x: myX, y: myY };
      const actions = plannedActions.reduce<Array<Record<string, number | string>>>((result, action) => {
        if (action.type === "POSTURE") {
          result.push({ type: "POSTURE", posture: action.posture });
          return result;
        }
        if (action.type === "MOVE") {
          const move = { type: "MOVE", dx: action.x - previousMove.x, dy: action.y - previousMove.y };
          previousMove = action;
          result.push(move);
          return result;
        }
        result.push({ type: "ATTACK", targetX: action.x, targetY: action.y });
        return result;
      }, []);
      const updated = await combatApi.endTurn(combatId, playerId, actions);
      setCombat(updated);
      onCombatUpdate(updated);
      setPlannedActions([]);
      setCombatLog((prev) => [`Plan submitted. Waiting for the enemy.`, ...prev]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to end turn");
    } finally {
      setIsEndingTurn(false);
    }
  };

  const handleFinishCombat = async () => {
    if (!isMyTurn || combat.status !== "IN_PROGRESS") return;
    try {
      setIsActing(true);
      const updated = await combatApi.finishCombat(combatId, playerId);
      setCombat(updated);
      onCombatUpdate(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to finish combat");
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 w-full max-w-lg">
      <div className="flex justify-between w-full bg-gray-900 p-3 rounded-lg border border-gray-700 text-sm">
        <div>
          <span className="text-gray-400">AP: </span>
          <span className="font-bold text-yellow-400">
            {combat.actionPoints}
          </span>
          <span className="ml-3 text-gray-400">Move: </span>
          <span className="font-bold text-teal-300">
            {movementRemaining}
          </span>
          <span className="ml-1 text-gray-500">cells</span>
        </div>
        <div className="text-right">
          <div className="text-green-300">You: {myHealth} HP</div>
          <div className="text-red-300">Enemy: {enemyHealth} HP</div>
          <span
            className={
              isMyTurn
                ? "text-green-400 font-bold animate-pulse"
                : "text-red-400"
            }
          >
            {isMyTurn ? "Plan your actions" : "Waiting for the enemy"}
          </span>
        </div>
      </div>

      <div className="flex w-full items-center gap-2 text-xs text-gray-400" aria-live="polite">
        <span className={`h-2 w-2 rounded-full ${isMyTurn ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
        <span>{isReplaying || (combat.p1Ready && combat.p2Ready) ? "Resolving round..." : isMyTurn ? "Your phase" : "Enemy phase"}</span>
        {replayAction?.type === "ATTACK" ? (
          <span className="ml-auto font-semibold text-yellow-300">
            {replayAction.actor === (isPlayer1 ? "p1" : "p2") ? "YOU" : "FOE"} fires
          </span>
        ) : (
          <span className="ml-auto text-gray-500">Round actions play automatically</span>
        )}
      </div>

      {error && (
        <div className="text-red-400 text-xs bg-red-950 p-2 rounded w-full text-center">
          {error}
        </div>
      )}

      <div className="flex w-full gap-2">
        <button onClick={() => setMode("move")} className={`flex-1 rounded-lg py-2 font-semibold ${mode === "move" ? "bg-teal-600" : "bg-gray-700 text-gray-300"}`}>
          Walk
        </button>
        <button onClick={() => setMode("shoot")} className={`flex-1 rounded-lg py-2 font-semibold ${mode === "shoot" ? "bg-red-600" : "bg-gray-700 text-gray-300"}`}>
          Shoot
        </button>
      </div>

      <div className="flex w-full gap-2">
        {(["STANDING", "CROUCHING", "PRONE"] as const).map((posture) => (
          <button
            key={posture}
            type="button"
            disabled={!isMyTurn || isReplaying || plannedActions.length >= combat.actionPoints || posture === plannedPosture}
            onClick={() => setPlannedActions((actions) => [...actions, { type: "POSTURE", posture }])}
            className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold ${posture === plannedPosture ? "border-yellow-300 bg-yellow-700 text-white" : "border-gray-600 bg-gray-700 text-gray-300"} disabled:cursor-not-allowed disabled:opacity-45`}
          >
            {posture === "STANDING" ? "Standing" : posture === "CROUCHING" ? "Crouching" : "Prone"}
          </button>
        ))}
      </div>

      <div className="relative aspect-square w-[min(90vw,420px)] overflow-hidden rounded-xl border border-gray-700">
        <div ref={mapContainerRef} className="h-full w-full" />
        <div className="absolute inset-0 z-10 grid grid-cols-10 grid-rows-10">
          {Array.from({ length: gridSize * gridSize }, (_, index) => {
            const x = index % gridSize;
            const y = Math.floor(index / gridSize);
            const step = plannedActions
              .filter((action): action is Extract<PlannedAction, { type: "MOVE" }> => action.type === "MOVE")
              .findIndex((cell) => cell.x === x && cell.y === y);

            return (
              <button
                key={`${x}-${y}`}
                type="button"
                aria-label={`Cell ${x}, ${y}`}
                onClick={() => void handleTileClick(x, y)}
                className={`combat-cell relative border border-slate-300/45 bg-transparent p-0 ${mode === "move" && isMyTurn && reachableCells.has(`${x}:${y}`) ? "combat-cell-reachable" : ""}`}
              >
                {WATER_CELLS.has(`${x}:${y}`) && (
                  <span className="terrain-tile terrain-water" aria-label="Water">
                    <span className="terrain-rock rock-one" />
                    <span className="terrain-rock rock-two" />
                    <span className="terrain-rock rock-three" />
                  </span>
                )}
                {WALL_CELLS.has(`${x}:${y}`) && (
                  <span className="terrain-tile terrain-wall" aria-label="Wall">
                    <span className="terrain-rock rock-one" />
                    <span className="terrain-rock rock-two" />
                    <span className="terrain-rock rock-three" />
                  </span>
                )}
                {step >= 0 && (
                  <span className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-yellow-200 bg-yellow-500 text-sm font-extrabold text-gray-950 shadow-lg">
                    {step + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
          {(["p1", "p2"] as const).map((player) => {
            const position = displayPositions[player];
            const isYou = (player === "p1" ? combat.player1Id : combat.player2Id) === playerId;
            return (
              <div
                key={player}
                className={`combat-marker ${isYou ? "combat-marker-you" : "combat-marker-foe"} posture-${displayPostures[player].toLowerCase()} ${animationTarget === player ? "combat-marker-active" : ""} ${replayAction?.type === "MOVE" && replayAction.actor === player ? "combat-marker-moving" : ""}`}
                style={{ left: `${(position.x + 0.5) * 10}%`, top: `${(position.y + 0.5) * 10}%` }}
                title={isYou ? "You" : "Enemy"}
              >
                <span className="character-sprite" aria-hidden="true">
                  <span className="character-head" />
                  <span className="character-body" />
                  <span className="character-arm character-arm-left" />
                  <span className="character-arm character-arm-right" />
                  <span className="character-leg character-leg-left" />
                  <span className="character-leg character-leg-right" />
                </span>
                <span className="character-label">{isYou ? "YOU" : "FOE"}</span>
              </div>
            );
          })}
          {damagePopup && (
            <span
              key={damagePopup.id}
              className="damage-popup"
              style={{
                left: `${(displayPositions[damagePopup.target].x + 0.5) * 10}%`,
                top: `${(displayPositions[damagePopup.target].y + 0.5) * 10}%`,
              }}
            >
              -{damagePopup.amount}
            </span>
          )}
          {replayAction?.type === "ATTACK" && (
            <span
              key={replayAction.id}
              className="combat-shot"
              style={{
                left: `${(replayAction.fromX + 0.5) * 10}%`,
                top: `${(replayAction.fromY + 0.5) * 10}%`,
                "--shot-distance": `${Math.min(Math.hypot(replayAction.toX - replayAction.fromX, replayAction.toY - replayAction.fromY), 3) * 10}%`,
                "--shot-angle": `${Math.atan2(replayAction.toY - replayAction.fromY, replayAction.toX - replayAction.fromX) * (180 / Math.PI)}deg`,
              } as React.CSSProperties}
            />
          )}
        </div>
      </div>

      {mode === "move" && (
        <div className="flex w-full items-center gap-2">
          <div className="flex-1 rounded-lg border border-yellow-700/60 bg-yellow-950/30 px-3 py-2 text-sm text-yellow-200">
            Plan: {plannedActions.length} / {combat.actionPoints} actions
          </div>
          <button
            onClick={() => setPlannedActions([])}
            disabled={isActing || plannedActions.length === 0}
            className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      )}

      {plannedActions.some((action) => action.type === "ATTACK") && (
        <div className="w-full rounded-lg border border-red-700/60 bg-red-950/30 px-3 py-2 text-sm text-red-200">
          Shots planned: {plannedActions.filter((action) => action.type === "ATTACK").map(({ x, y }) => `(${x}, ${y})`).join(", ")}
        </div>
      )}

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
      <button
        onClick={handleFinishCombat}
        disabled={!isMyTurn || isActing || combat.status !== "IN_PROGRESS"}
        className="w-full rounded-lg border border-red-700 py-2 text-sm text-red-300 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Surrender and finish combat
      </button>

      {combat.status === "FINISHED" && (
        <div className="w-full rounded-lg border border-yellow-700 bg-yellow-950/50 p-3 text-center">
          {combat.winnerId === playerId ? "You won!" : "You lost this combat."}
          <button onClick={onCombatFinished} className="mt-2 block w-full rounded bg-yellow-600 py-2 font-semibold">
            Return to world
          </button>
        </div>
      )}

      {/* Combat Activity Log */}
      <div className="w-full bg-gray-900 p-3 rounded-lg border border-gray-700 h-28 overflow-y-auto text-xs space-y-1">
        <p className="text-gray-500 font-semibold">Combat Log:</p>
        {combatLog.map((log, i) => (
          <p key={`${log}-${i}`} className="animate-[fade-in_300ms_ease-out] text-gray-300">
            {log}
          </p>
        ))}
      </div>
    </div>
  );
}
