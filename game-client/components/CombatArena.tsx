"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { combatApi } from "@/services/combatApi";
import { CombatActions } from "./combat/CombatActions";
import { CombatGrid } from "./combat/CombatGrid";
import { CombatLog } from "./combat/CombatLog";
import { CombatModeControls } from "./combat/CombatModeControls";
import { CombatStatus } from "./combat/CombatStatus";
import { GRID_SIZE, getLatestMove, getLatestPosture, getReachableCells, isMovementBlocked, postureMovement, WALL_CELLS } from "./combat/board";
import { CombatArenaProps, DamagePopup, DisplayHealth, DisplayPositions, DisplayPostures, PlannedAction, Posture, ReplayAction } from "./combat/types";

export default function CombatArena({ combatId, playerId, initialCombat, onCombatUpdate, onCombatFinished }: CombatArenaProps) {
  const [combat, setCombat] = useState(initialCombat);
  const [mode, setMode] = useState<"move" | "shoot">("move");
  const [error, setError] = useState("");
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [plannedActions, setPlannedActions] = useState<PlannedAction[]>([]);
  const [isEndingTurn, setIsEndingTurn] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [animationTarget, setAnimationTarget] = useState<"p1" | "p2" | null>(null);
  const [displayPositions, setDisplayPositions] = useState<DisplayPositions>({ p1: { x: initialCombat.p1X, y: initialCombat.p1Y }, p2: { x: initialCombat.p2X, y: initialCombat.p2Y } });
  const [replayAction, setReplayAction] = useState<ReplayAction | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [displayHealth, setDisplayHealth] = useState<DisplayHealth>({ p1: initialCombat.p1Health, p2: initialCombat.p2Health });
  const [damagePopup, setDamagePopup] = useState<DamagePopup | null>(null);
  const [displayPostures, setDisplayPostures] = useState<DisplayPostures>({ p1: initialCombat.p1Posture || "STANDING", p2: initialCombat.p2Posture || "STANDING" });
  const isReplayingRef = useRef(false);
  const replayedRoundRef = useRef<string | null>(null);
  const replayTimersRef = useRef<number[]>([]);
  const previousCombatRef = useRef(initialCombat);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const tileClickRef = useRef<(x: number, y: number) => void>(() => undefined);

  const isPlayer1 = playerId === combat.player1Id;
  const myX = isPlayer1 ? combat.p1X : combat.p2X;
  const myY = isPlayer1 ? combat.p1Y : combat.p2Y;
  const isMyTurn = isPlayer1 ? !combat.p1Ready : !combat.p2Ready;
  const enemyX = isPlayer1 ? combat.p2X : combat.p1X;
  const enemyY = isPlayer1 ? combat.p2Y : combat.p1Y;
  const myHealth = isPlayer1 ? displayHealth.p1 : displayHealth.p2;
  const enemyHealth = isPlayer1 ? displayHealth.p2 : displayHealth.p1;
  const myPosture: Posture = isPlayer1 ? combat.p1Posture || "STANDING" : combat.p2Posture || "STANDING";
  const plannedPosture = getLatestPosture(plannedActions, myPosture);
  const movementRemaining = plannedActions.length < combat.actionPoints ? postureMovement(plannedPosture) : 0;
  const plannedEnd = getLatestMove(plannedActions);
  const reachableCells = getReachableCells(plannedEnd?.x ?? myX, plannedEnd?.y ?? myY, movementRemaining);

  useEffect(() => {
    const previous = previousCombatRef.current;
    const movedP1 = previous.p1X !== combat.p1X || previous.p1Y !== combat.p1Y;
    const movedP2 = previous.p2X !== combat.p2X || previous.p2Y !== combat.p2Y;
    const damagedP1 = previous.p1Health > combat.p1Health;
    const damagedP2 = previous.p2Health > combat.p2Health;
    const roundActions = combat.lastRoundActions;
    const roundKey = roundActions?.length ? `${roundActions.join("|")}:${combat.p1X}:${combat.p1Y}:${combat.p2X}:${combat.p2Y}:${combat.p1Health}:${combat.p2Health}` : null;
    if (roundKey && roundActions && roundKey !== replayedRoundRef.current) {
      replayedRoundRef.current = roundKey;
      replayTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      let positions: DisplayPositions = { p1: { x: previous.p1X, y: previous.p1Y }, p2: { x: previous.p2X, y: previous.p2Y } };
      setDisplayPositions(positions); setIsReplaying(true); isReplayingRef.current = true; setReplayAction(null); setDamagePopup(null);
      roundActions.forEach((encodedAction, index) => {
        const timer = window.setTimeout(() => {
          const [actor, type, first, second] = encodedAction.split(":");
          const actorKey = actor === "P1" ? "p1" : "p2";
          const current = positions[actorKey];
          if (type === "M") {
            const next = { x: current.x + Number(first), y: current.y + Number(second) };
            setReplayAction({ id: `${encodedAction}-${index}`, type: "MOVE", actor: actorKey, fromX: current.x, fromY: current.y, toX: next.x, toY: next.y });
            positions = { ...positions, [actorKey]: next }; setDisplayPositions(positions); setAnimationTarget(actorKey);
          } else if (type === "P") {
            setDisplayPostures((postures) => ({ ...postures, [actorKey]: first as Posture })); setAnimationTarget(actorKey);
          } else if (type === "A") {
            const targetKey = actorKey === "p1" ? "p2" : "p1"; const damage = Number(encodedAction.split(":")[4] || 0);
            setReplayAction({ id: `${encodedAction}-${index}`, type: "ATTACK", actor: actorKey, fromX: current.x, fromY: current.y, toX: Number(first), toY: Number(second) }); setAnimationTarget(targetKey);
            if (damage > 0) replayTimersRef.current.push(window.setTimeout(() => { setDisplayHealth((health) => ({ ...health, [targetKey]: Math.max(0, health[targetKey] - damage) })); setDamagePopup({ id: `${encodedAction}-${index}-damage`, target: targetKey, amount: damage }); }, 420));
          }
        }, index * 700);
        replayTimersRef.current.push(timer);
      });
      replayTimersRef.current.push(window.setTimeout(() => {
        setDisplayPositions({ p1: { x: combat.p1X, y: combat.p1Y }, p2: { x: combat.p2X, y: combat.p2Y } }); setDisplayHealth({ p1: combat.p1Health, p2: combat.p2Health }); setDisplayPostures({ p1: combat.p1Posture || "STANDING", p2: combat.p2Posture || "STANDING" }); setReplayAction(null); setDamagePopup(null); setAnimationTarget(damagedP1 ? "p1" : damagedP2 ? "p2" : null); setIsReplaying(false); isReplayingRef.current = false; replayTimersRef.current = [];
      }, roundActions.length * 700 + 500));
      const roundEvents = [...(movedP1 ? ["Player 1 moved"] : []), ...(movedP2 ? ["Player 2 moved"] : []), ...(damagedP1 ? [`Player 1 took ${previous.p1Health - combat.p1Health} damage`] : []), ...(damagedP2 ? [`Player 2 took ${previous.p2Health - combat.p2Health} damage`] : [])];
      setCombatLog((logs) => [...roundEvents.reverse(), ...logs].slice(0, 20)); previousCombatRef.current = combat;
    }
    if (isReplayingRef.current) return;
    setDisplayPositions({ p1: { x: combat.p1X, y: combat.p1Y }, p2: { x: combat.p2X, y: combat.p2Y } }); setDisplayHealth({ p1: combat.p1Health, p2: combat.p2Health }); setDisplayPostures({ p1: combat.p1Posture || "STANDING", p2: combat.p2Posture || "STANDING" });
    if (previous.p1Ready !== combat.p1Ready || previous.p2Ready !== combat.p2Ready) setCombatLog((logs) => [(combat.p1Ready && combat.p2Ready) ? "Round resolved" : "Plan submitted. Waiting for the enemy.", ...logs].slice(0, 20));
    previousCombatRef.current = combat;
  }, [combat]);

  useEffect(() => () => replayTimersRef.current.forEach((timer) => window.clearTimeout(timer)), []);
  useEffect(() => {
    const interval = window.setInterval(async () => { try { const latestCombat = await combatApi.getCombat(combatId); setCombat(latestCombat); onCombatUpdate(latestCombat); } catch { /* Polling is best effort. */ } }, 2000);
    return () => window.clearInterval(interval);
  }, [combatId, onCombatUpdate]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const gridFeatures = Array.from({ length: (GRID_SIZE + 1) * 2 }, (_, index) => { const isVertical = index < GRID_SIZE + 1; const coordinate = isVertical ? index : index - GRID_SIZE - 1; return { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: isVertical ? [[coordinate - 0.5, 0.5], [coordinate - 0.5, -9.5]] : [[-0.5, -coordinate + 0.5], [9.5, -coordinate + 0.5]] } }; });
    const map = new MapLibreMap({ container: mapContainerRef.current, attributionControl: {}, center: [4.5, -4.5], zoom: 4.8, minZoom: 4.2, maxZoom: 6.5, maxBounds: [[-1, -10], [10, 1]], style: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#111827" } }] } });
    map.on("load", () => { map.fitBounds([[-0.5, -9.5], [9.5, 0.5]], { padding: 0, duration: 0 }); map.addSource("terrain", { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" }); map.addLayer({ id: "terrain", type: "raster", source: "terrain", paint: { "raster-opacity": 0.82, "raster-saturation": -0.15, "raster-contrast": 0.08 } }); map.addSource("grid", { type: "geojson", data: { type: "FeatureCollection", features: gridFeatures } }); map.addSource("reachable", { type: "geojson", data: { type: "FeatureCollection", features: [] } }); map.addLayer({ id: "reachable-cells", type: "fill", source: "reachable", paint: { "fill-color": mode === "shoot" ? "#ef4444" : "#14b8a6", "fill-opacity": 0.28 } }); map.addSource("planned", { type: "geojson", data: { type: "FeatureCollection", features: [] } }); map.addLayer({ id: "planned-cells", type: "fill", source: "planned", paint: { "fill-color": "#facc15", "fill-opacity": 0.5 } }); map.addLayer({ id: "grid-lines", type: "line", source: "grid", paint: { "line-color": "#f8fafc", "line-opacity": 0.72, "line-width": 1.4 } }); setMapReady(true); });
    map.on("click", (event) => { const x = Math.floor(event.lngLat.lng + 0.5); const y = Math.floor(-event.lngLat.lat + 0.5); if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) tileClickRef.current(x, y); }); mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; setMapReady(false); };
  }, [mode]);

  useEffect(() => {
    const source = mapRef.current?.getSource("reachable") as import("maplibre-gl").GeoJSONSource | undefined;
    if (!mapReady || !source || !isMyTurn || combat.status !== "IN_PROGRESS") return;
    const movementEnd = getLatestMove(plannedActions) ?? { x: myX, y: myY }; const features = [];
    for (let x = 0; x < GRID_SIZE; x += 1) for (let y = 0; y < GRID_SIZE; y += 1) { const distance = Math.max(Math.abs(x - movementEnd.x), Math.abs(y - movementEnd.y)); const available = mode === "move" ? reachableCells.has(`${x}:${y}`) : distance <= 3 && distance > 0; if (available && !(mode === "move" ? isMovementBlocked(x, y) : WALL_CELLS.has(`${x}:${y}`))) features.push({ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [[[x - 0.5, -y + 0.5], [x + 0.5, -y + 0.5], [x + 0.5, -y - 0.5], [x - 0.5, -y - 0.5], [x - 0.5, -y + 0.5]]] } }); }
    source.setData({ type: "FeatureCollection", features });
  }, [combat, isMyTurn, mapReady, mode, myX, myY, plannedActions, reachableCells]);
  useEffect(() => {
    const source = mapRef.current?.getSource("planned") as import("maplibre-gl").GeoJSONSource | undefined; if (!mapReady || !source) return;
    source.setData({ type: "FeatureCollection", features: plannedActions.filter((action): action is Extract<PlannedAction, { type: "MOVE" }> => action.type === "MOVE").map(({ x, y }, index) => ({ type: "Feature" as const, properties: { step: index + 1 }, geometry: { type: "Polygon" as const, coordinates: [[[x - 0.5, -y + 0.5], [x + 0.5, -y + 0.5], [x + 0.5, -y - 0.5], [x - 0.5, -y - 0.5], [x - 0.5, -y + 0.5]]] } })) });
  }, [mapReady, plannedActions]);

  const handleTileClick = useCallback(async (targetX: number, targetY: number) => {
    if (!isMyTurn || isActing || combat.status !== "IN_PROGRESS") { setError("Not your turn!"); return; }
    try {
      setError(""); if (mode === "move" && isMovementBlocked(targetX, targetY)) { setError("This cell is blocked by terrain"); return; } if (mode === "move" && movementRemaining <= 0) { setError(`${plannedPosture.toLowerCase()} allows ${postureMovement(plannedPosture)} movement cells`); return; }
      if (mode === "shoot") { if (targetX !== enemyX || targetY !== enemyY) { setError("Select the enemy cell to shoot"); return; } if (plannedActions.length + 1 > combat.actionPoints) { setError(`You have ${combat.actionPoints} action point${combat.actionPoints === 1 ? "" : "s"} left`); return; } setPlannedActions((actions) => [...actions, { type: "ATTACK", x: targetX, y: targetY }]); return; }
      if (!reachableCells.has(`${targetX}:${targetY}`)) { setError(`Choose a reachable cell within ${postureMovement(plannedPosture)} cells`); return; } if (plannedActions.length >= combat.actionPoints) { setError(`You have ${combat.actionPoints} action point${combat.actionPoints === 1 ? "" : "s"} left`); return; } setPlannedActions((actions) => [...actions, { type: "MOVE", x: targetX, y: targetY }]);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Action failed"); } finally { setIsActing(false); }
  }, [combat, enemyX, enemyY, isActing, isMyTurn, mode, movementRemaining, plannedActions.length, plannedPosture, reachableCells]);
  useEffect(() => { tileClickRef.current = (x, y) => void handleTileClick(x, y); }, [handleTileClick]);
  const handleEndTurn = async () => {
    if (isEndingTurn) return;
    try { setError(""); setIsEndingTurn(true); let previousMove = { x: myX, y: myY }; const actions = plannedActions.reduce<Array<Record<string, number | string>>>((result, action) => { if (action.type === "POSTURE") result.push({ type: "POSTURE", posture: action.posture }); else if (action.type === "MOVE") { result.push({ type: "MOVE", dx: action.x - previousMove.x, dy: action.y - previousMove.y }); previousMove = action; } else result.push({ type: "ATTACK", targetX: action.x, targetY: action.y }); return result; }, []); const updated = await combatApi.endTurn(combatId, playerId, actions); setCombat(updated); onCombatUpdate(updated); setPlannedActions([]); setCombatLog((prev) => ["Plan submitted. Waiting for the enemy.", ...prev]); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to end turn"); } finally { setIsEndingTurn(false); }
  };
  const handleFinishCombat = async () => { if (!isMyTurn || combat.status !== "IN_PROGRESS") return; try { setIsActing(true); const updated = await combatApi.finishCombat(combatId, playerId); setCombat(updated); onCombatUpdate(updated); } catch (err: unknown) { setError(err instanceof Error ? err.message : "Failed to finish combat"); } finally { setIsActing(false); } };

  return <div className="flex flex-col items-center space-y-4 w-full max-w-lg">
    <CombatStatus actionPoints={combat.actionPoints} movementRemaining={movementRemaining} myHealth={myHealth} enemyHealth={enemyHealth} isMyTurn={isMyTurn} isReplaying={isReplaying} roundResolved={Boolean(combat.p1Ready && combat.p2Ready)} replayAction={replayAction} isPlayer1={isPlayer1} />
    {error && <div className="text-red-400 text-xs bg-red-950 p-2 rounded w-full text-center">{error}</div>}
    <CombatModeControls mode={mode} plannedActions={plannedActions} plannedPosture={plannedPosture} actionPoints={combat.actionPoints} isMyTurn={isMyTurn} isReplaying={isReplaying} onModeChange={setMode} onPostureChange={(posture) => setPlannedActions((actions) => [...actions, { type: "POSTURE", posture }])} />
    <CombatGrid combat={combat} playerId={playerId} mode={mode} isMyTurn={isMyTurn} plannedActions={plannedActions} reachableCells={reachableCells} displayPositions={displayPositions} displayPostures={displayPostures} replayAction={replayAction} animationTarget={animationTarget} damagePopup={damagePopup} mapContainerRef={mapContainerRef} onTileClick={(x, y) => void handleTileClick(x, y)} />
    <CombatActions combat={combat} plannedActions={plannedActions} isMyTurn={isMyTurn} isActing={isActing} isEndingTurn={isEndingTurn} playerId={playerId} onClear={() => setPlannedActions([])} onEndTurn={handleEndTurn} onFinishCombat={handleFinishCombat} onCombatFinished={onCombatFinished} />
    <CombatLog entries={combatLog} />
  </div>;
}
