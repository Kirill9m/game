"use client";

import { motion } from "framer-motion";
import { CombatLoot, CombatObstacle, CombatSession } from "@/types/game";
import { GRID_SIZE, cellKey } from "./board";
import { CharacterToken } from "./CharacterToken";
import {
  DamagePopup,
  DisplayPositions,
  DisplayPostures,
  PlannedAction,
  ReplayAction,
} from "./types";

interface CombatGridProps {
  combat: CombatSession;
  playerId: string;
  canAttack: boolean;
  /** Клетки зоны обстрела (визуальная подсветка); null — не показывать. */
  attackRangeCells?: Set<string> | null;
  isMyTurn: boolean;
  plannedActions: PlannedAction[];
  reachableCells: Set<string>;
  displayPositions: DisplayPositions;
  displayPostures: DisplayPostures;
  replayAction: ReplayAction | null;
  animationTarget: "p1" | "p2" | null;
  damagePopup: DamagePopup | null;
  /** Размер квадратного поля в px (адаптация под экран). */
  boardSize?: number;
  onTileClick: (x: number, y: number) => void;
}

const CENTER = (coord: number) => `${(coord + 0.5) * 10}%`;

export function CombatGrid({
  combat,
  playerId,
  canAttack,
  attackRangeCells,
  isMyTurn,
  plannedActions,
  reachableCells,
  displayPositions,
  displayPostures,
  replayAction,
  animationTarget,
  damagePopup,
  boardSize,
  onTileClick,
}: CombatGridProps) {
  const moveActions = plannedActions.filter(
    (action): action is Extract<PlannedAction, { type: "MOVE" }> =>
      action.type === "MOVE",
  );

  const isPlayer1 = playerId === combat.player1Id;
  const enemyCell =
    isPlayer1 ? `${combat.p2X}:${combat.p2Y}` : `${combat.p1X}:${combat.p1Y}`;
  // Клик по врагу = выстрел по умолчанию, поэтому подсвечиваем его клетку.
  const attackableCell = canAttack ? enemyCell : null;

  // The player's current footprint on the board — used to highlight loot
  // piles they are standing on (available for the Take button).
  const myDisplay = isPlayer1 ? displayPositions.p1 : displayPositions.p2;
  const myDisplayKey = cellKey(myDisplay.x, myDisplay.y);
  const lootCellKeys = new Set(
    (combat.loot ?? [])
      .filter((pile) => pile.quantity > 0)
      .map((pile) => cellKey(pile.x, pile.y)),
  );
  const lootUnderMe = lootCellKeys.has(myDisplayKey);

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
    <div
      className="combat-board-inner"
      style={
        boardSize
          ? { width: boardSize, height: boardSize }
          : undefined
      }
    >
      <div className="combat-grid">
        {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => {
          const x = index % GRID_SIZE;
          const y = Math.floor(index / GRID_SIZE);
          const key = cellKey(x, y);
          const obstacle = combat.obstacles?.find(
            (candidate) =>
              candidate.x === x &&
              candidate.y === y &&
              candidate.currentHealth > 0,
          );
          const stepIndex = moveActions.findIndex(
            (cell) => cell.x === x && cell.y === y,
          );
          const reachable = isMyTurn && reachableCells.has(key);
          const attackable = attackableCell === key;
          const planned = stepIndex >= 0;
          const lootPile = combat.loot?.find(
            (pile) => pile.x === x && pile.y === y && pile.quantity > 0,
          );
          // Зона обстрела — тонкая подсветка на нейтральных клетках,
          // чтобы не перебивать более важные состояния (маршрут/атака).
          const inRange =
            !reachable && !attackable && !planned && attackRangeCells?.has(key);
          return (
            <button
              key={key}
              type="button"
              aria-label={`Cell ${x}, ${y}`}
              onClick={() => onTileClick(x, y)}
              className={`combat-cell ${(x + y) % 2 === 0 ? "combat-cell-checker" : ""} ${reachable ? "combat-cell-reachable" : ""} ${attackable ? "combat-cell-attackable" : ""} ${planned ? "combat-cell-planned" : ""} ${inRange ? "combat-cell-in-range" : ""}`}
            >
              {obstacle && <ObstacleTile obstacle={obstacle} />}
              {lootPile && <LootTile loot={lootPile} />}
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
        {lootUnderMe && (
          <motion.span
            className="combat-loot-ring"
            style={{ left: CENTER(myDisplay.x), top: CENTER(myDisplay.y) }}
            animate={{ scale: [1, 1.35, 1], opacity: [0.85, 0.25, 0.85] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
          />
        )}
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

function ObstacleTile({ obstacle }: { obstacle: CombatObstacle }) {
  const healthPercent = Math.max(
    0,
    Math.min(
      100,
      Math.round((obstacle.currentHealth / Math.max(1, obstacle.maxHealth)) * 100),
    ),
  );
  const variant = obstacle.code.toLowerCase();
  return (
    <motion.span
      className={`combat-obstacle combat-obstacle-${variant}`}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 22 }}
      aria-label={`${obstacle.name} (${obstacle.currentHealth}/${obstacle.maxHealth} HP)`}
    >
      <span className="combat-obstacle-icon">▦</span>
      <span className="combat-obstacle-label">{obstacle.name}</span>
      <span className="combat-obstacle-hp">
        <span
          className="combat-obstacle-hp-fill"
          style={{ width: `${healthPercent}%` }}
        />
      </span>
    </motion.span>
  );
}

/** A small loot pile rendered on a combat board cell. */
function LootTile({ loot }: { loot: CombatLoot }) {
  return (
    <motion.span
      className="absolute inset-[8%] z-10 flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border border-emerald-300/70 bg-emerald-900/70 shadow-[0_0_12px_rgba(52,211,153,0.45)]"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 20 }}
      aria-label={`${loot.itemName} × ${loot.quantity}`}
      title={`${loot.itemName} × ${loot.quantity}`}
    >
      <span className="text-[13px] leading-none">💰</span>
      <span className="combat-loot-label">{loot.itemName}</span>
      <span className="combat-loot-qty">×{loot.quantity}</span>
    </motion.span>
  );
}