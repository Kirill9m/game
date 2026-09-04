"use client";

import { motion } from "framer-motion";
import { CombatSession } from "@/types/game";
import { GRID_SIZE, cellKey, WALL_CELLS, WATER_CELLS } from "./board";
import { CharacterToken } from "./CharacterToken";
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
  onTileClick: (x: number, y: number) => void;
}

const CENTER = (coord: number) => `${(coord + 0.5) * 10}%`;

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
  onTileClick,
}: CombatGridProps) {
  const moveActions = plannedActions.filter(
    (action): action is Extract<PlannedAction, { type: "MOVE" }> =>
      action.type === "MOVE",
  );

  const isPlayer1 = playerId === combat.player1Id;
  const enemyCell =
    isPlayer1 ? `${combat.p2X}:${combat.p2Y}` : `${combat.p1X}:${combat.p1Y}`;
  const attackableCell = mode === "shoot" && isMyTurn ? enemyCell : null;

  const tokenFor = (playerKey: "p1" | "p2") => {
    const isYou =
      (playerKey === "p1" ? combat.player1Id : combat.player2Id) === playerId;
    const isWolf = combat.player2Id === "bot_wolf" && playerKey === "p2";
    return (
      <CharacterToken
        playerKey={playerKey}
        position={displayPositions[playerKey]}
        posture={displayPostures[playerKey]}
        label={isYou ? "YOU" : isWolf ? "WOLF" : "FOE"}
        isYou={isYou}
        isActive={animationTarget === playerKey}
      />
    );
  };

  return (
    <div className="combat-board-inner w-[min(92vw,440px)]">
      <div className="combat-grid">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
          const x = index % GRID_SIZE;
          const y = Math.floor(index / GRID_SIZE);
          const key = cellKey(x, y);
          const stepIndex = moveActions.findIndex(
            (cell) => cell.x === x && cell.y === y,
          );
          const reachable =
            mode === "move" && isMyTurn && reachableCells.has(key);
          const attackable = attackableCell === key;
          const planned = stepIndex >= 0;
          return (
            <button
              key={key}
              type="button"
              aria-label={`Cell ${x}, ${y}`}
              onClick={() => onTileClick(x, y)}
              className={`combat-cell ${(x + y) % 2 === 0 ? "combat-cell-checker" : ""} ${reachable ? "combat-cell-reachable" : ""} ${attackable ? "combat-cell-attackable" : ""} ${planned ? "combat-cell-planned" : ""}`}
            >
              {WATER_CELLS.has(key) && <TerrainTile variant="water" />}
              {WALL_CELLS.has(key) && <TerrainTile variant="wall" />}
              {planned && (
                <motion.span
                  className="move-step-chip"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 20 }}
                >
                  {stepIndex + 1}
                </motion.span>
              )}
            </button>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-0 z-20">
        {(["p1", "p2"] as const).map(tokenFor)}
{replayAction?.type === "ATTACK" && (
          <>
            <motion.span
              key={`muzzle-${replayAction.id}`}
              className="combat-muzzle"
              style={{
                left: CENTER(replayAction.fromX),
                top: CENTER(replayAction.fromY),
              }}
              initial={{ scale: 0.4, opacity: 0.9 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            />
            <motion.span
              key={replayAction.id}
              className="combat-shot"
              style={{
                left: CENTER(replayAction.fromX),
                top: CENTER(replayAction.fromY),
                width: `${Math.min(Math.hypot(replayAction.toX - replayAction.fromX, replayAction.toY - replayAction.fromY), 3) * 10}%`,
              }}
              initial={{ scaleX: 0, opacity: 0, rotate: 0 }}
              animate={{
                scaleX: [0, 0.25, 1],
                opacity: [0, 1, 0.95, 0.6, 0],
                rotate: `${Math.atan2(
                  replayAction.toY - replayAction.fromY,
                  replayAction.toX - replayAction.fromX,
                ) * (180 / Math.PI)}deg`,
              }}
              transition={{
                duration: 0.5,
                times: [0, 0.4, 1],
                ease: "easeOut",
              }}
            />
          </>
        )}

        {damagePopup && (
          <>
            <motion.span
              key={`ring-${damagePopup.id}`}
              className="impact-ring"
              style={{
                left: CENTER(displayPositions[damagePopup.target].x),
                top: CENTER(displayPositions[damagePopup.target].y),
              }}
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 1.7, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            <motion.span
              key={`dmg-${damagePopup.id}`}
              className="damage-popup"
              style={{
                left: CENTER(displayPositions[damagePopup.target].x),
                top: CENTER(displayPositions[damagePopup.target].y),
              }}
              initial={{ y: 0, scale: 1.35, opacity: 0 }}
              animate={{ y: -120, scale: [1.35, 1.05, 1], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.85, times: [0, 0.2, 0.45, 1], ease: "easeOut" }}
            >
              −{damagePopup.amount}
            </motion.span>
          </>
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