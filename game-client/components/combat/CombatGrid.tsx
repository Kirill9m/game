import type { RefObject } from "react";
import { CombatSession } from "@/types/game";
import { GRID_SIZE, cellKey, WALL_CELLS, WATER_CELLS } from "./board";
import {
  DamagePopup,
  DisplayPositions,
  DisplayPostures,
  PlannedAction,
  ReplayAction,
} from "./types";

type CombatMode = "move" | "shoot";

interface CombatGridProps {
  combat: CombatSession;
  playerId: string;
  mode: CombatMode;
  isMyTurn: boolean;
  plannedActions: PlannedAction[];
  reachableCells: Set<string>;
  displayPositions: DisplayPositions;
  displayPostures: DisplayPostures;
  replayAction: ReplayAction | null;
  animationTarget: "p1" | "p2" | null;
  damagePopup: DamagePopup | null;
  mapContainerRef: RefObject<HTMLDivElement | null>;
  onTileClick: (x: number, y: number) => void;
}

export function CombatGrid({
  combat,
  playerId,
  mode,
  isMyTurn,
  plannedActions,
  reachableCells,
  displayPositions,
  displayPostures,
  replayAction,
  animationTarget,
  damagePopup,
  mapContainerRef,
  onTileClick,
}: CombatGridProps) {
  const moveActions = plannedActions.filter(
    (action): action is Extract<PlannedAction, { type: "MOVE" }> =>
      action.type === "MOVE",
  );

  return (
    <div className="relative aspect-square w-[min(90vw,420px)] overflow-hidden rounded-xl border border-gray-700">
      <div ref={mapContainerRef} className="h-full w-full" />
      <div className="absolute inset-0 z-10 grid grid-cols-10 grid-rows-10">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
          const x = index % GRID_SIZE;
          const y = Math.floor(index / GRID_SIZE);
          const step = moveActions.findIndex(
            (cell) => cell.x === x && cell.y === y,
          );
          const key = cellKey(x, y);
          return (
            <button
              key={key}
              type="button"
              aria-label={`Cell ${x}, ${y}`}
              onClick={() => onTileClick(x, y)}
              className={`combat-cell relative border border-slate-300/45 bg-transparent p-0 ${mode === "move" && isMyTurn && reachableCells.has(key) ? "combat-cell-reachable" : ""}`}
            >
              {WATER_CELLS.has(key) && <TerrainTile variant="water" />}
              {WALL_CELLS.has(key) && <TerrainTile variant="wall" />}
              {step >= 0 && (
                <span className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-yellow-200 bg-yellow-500 text-sm font-extrabold text-gray-950 shadow-lg">
                  {step + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div
        className="pointer-events-none absolute inset-0 z-20"
        aria-hidden="true"
      >
        {(["p1", "p2"] as const).map((player) => {
          const position = displayPositions[player];
          const isYou =
            (player === "p1" ? combat.player1Id : combat.player2Id) ===
            playerId;
          const isWolf = combat.player2Id === "bot_wolf" && player === "p2";
          return (
            <div
              key={player}
              className={`combat-marker ${isYou ? "combat-marker-you" : "combat-marker-foe"} posture-${displayPostures[player].toLowerCase()} ${animationTarget === player ? "combat-marker-active" : ""} ${replayAction?.type === "MOVE" && replayAction.actor === player ? "combat-marker-moving" : ""}`}
              style={{
                left: `${(position.x + 0.5) * 10}%`,
                top: `${(position.y + 0.5) * 10}%`,
              }}
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
              <span className="character-label">
                {isYou ? "YOU" : isWolf ? "WOLF" : "FOE"}
              </span>
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
            style={
              {
                left: `${(replayAction.fromX + 0.5) * 10}%`,
                top: `${(replayAction.fromY + 0.5) * 10}%`,
                "--shot-distance": `${Math.min(Math.hypot(replayAction.toX - replayAction.fromX, replayAction.toY - replayAction.fromY), 3) * 10}%`,
                "--shot-angle": `${Math.atan2(replayAction.toY - replayAction.fromY, replayAction.toX - replayAction.fromX) * (180 / Math.PI)}deg`,
              } as React.CSSProperties
            }
          />
        )}
      </div>
    </div>
  );
}

function TerrainTile({ variant }: { variant: "water" | "wall" }) {
  return (
    <span
      className={`terrain-tile terrain-${variant}`}
      aria-label={variant === "water" ? "Water" : "Wall"}
    >
      <span className="terrain-rock rock-one" />
      <span className="terrain-rock rock-two" />
      <span className="terrain-rock rock-three" />
    </span>
  );
}
