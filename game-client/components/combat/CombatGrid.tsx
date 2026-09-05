"use client";

import { motion } from "framer-motion";
import {
  CombatLoot,
  CombatObstacle,
  CombatParticipant,
  CombatSession,
} from "@/types/game";
import { GRID_SIZE, cellKey, distinctTeams, teamClassFor } from "./board";
import { CharacterToken } from "./CharacterToken";
import {
  DamagePopup,
  HealPopup,
  DisplayPositions,
  DisplayPostures,
  PlannedAction,
  ReplayAction,
} from "./types";

interface CombatGridProps {
  combat: CombatSession;
  playerId: string;
  canAttack: boolean;
  attackRangeCells?: Set<string> | null;
  isMyTurn: boolean;
  plannedActions: PlannedAction[];
  reachableCells: Set<string>;
  displayPositions: DisplayPositions;
  displayPostures: DisplayPostures;
  replayAction: ReplayAction | null;
  animationTarget: string | null;
  damagePopup: DamagePopup | null;
  healPopup: HealPopup | null;
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
  healPopup,
  boardSize,
  onTileClick,
}: CombatGridProps) {
  const moveActions = plannedActions.filter(
    (action): action is Extract<PlannedAction, { type: "MOVE" }> =>
      action.type === "MOVE",
  );

  const fighters = combat.participants.filter(
    (p): p is CombatParticipant => p.role === "FIGHTER",
  );
  const me = combat.participants.find((p) => p.playerId === playerId);
  const myTeam = me?.team ?? "";
  const teams = distinctTeams(fighters);

  const attackableCells = new Set<string>();
  if (canAttack) {
    for (const f of fighters) {
      if (f.health > 0 && f.team !== myTeam) {
        attackableCells.add(cellKey(f.x, f.y));
      }
    }
  }

  const myDisplay = displayPositions[playerId];
  const lootNearMe = (combat.loot ?? []).some(
    (pile) =>
      pile.quantity > 0 &&
      myDisplay &&
      Math.max(Math.abs(pile.x - myDisplay.x), Math.abs(pile.y - myDisplay.y)) <=
        1,
  );

  const labelFor = (f: CombatParticipant): string => {
    if (f.playerId === playerId) return "YOU";
    if (f.team === myTeam) return "ALLY";
    return f.team === "A" || f.team === "B" ? f.team : "FOE";
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
          const attackable = attackableCells.has(key);
          const planned = stepIndex >= 0;
          const lootPile = combat.loot?.find(
            (pile) => pile.x === x && pile.y === y && pile.quantity > 0,
          );
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
        {fighters.map((f) => {
          const pos = displayPositions[f.playerId] ?? { x: f.x, y: f.y };
          const posture = displayPostures[f.playerId] ?? f.posture ?? "STANDING";
          const isYou = f.playerId === playerId;
          const colorClass = isYou
            ? "combat-marker-you"
            : teamClassFor(f.team, teams, playerId);
          return (
            <CharacterToken
              key={f.playerId}
              position={pos}
              posture={posture}
              label={labelFor(f)}
              isActive={animationTarget === f.playerId}
              colorClass={colorClass}
              down={f.health <= 0}
            />
          );
        })}
        {lootNearMe && (
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
                width: `${(replayAction.range ?? 3) * 10}%`,
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

        {damagePopup && displayPositions[damagePopup.target] && (
          <PopupShell
            id={damagePopup.id}
            x={displayPositions[damagePopup.target].x}
            y={displayPositions[damagePopup.target].y}
            kind="damage"
            amount={damagePopup.amount}
          />
        )}

        {healPopup && displayPositions[healPopup.target] && (
          <PopupShell
            id={healPopup.id}
            x={displayPositions[healPopup.target].x}
            y={displayPositions[healPopup.target].y}
            kind="heal"
            amount={healPopup.amount}
          />
        )}
      </div>
    </div>
  );
}

function PopupShell({
  id,
  x,
  y,
  kind,
  amount,
}: {
  id: string;
  x: number;
  y: number;
  kind: "damage" | "heal";
  amount: number;
}) {
  const ringClass = kind === "damage" ? "impact-ring" : "heal-ring";
  const textClass = kind === "damage" ? "damage-popup" : "heal-popup";
  const sign = kind === "damage" ? "−" : "+";
  const rise = kind === "damage" ? -120 : -60;
  return (
    <>
      <motion.span
        key={`ring-${id}`}
        className={ringClass}
        style={{ left: CENTER(x), top: CENTER(y) }}
        initial={{ scale: 0.2, opacity: 0.9 }}
        animate={{ scale: kind === "damage" ? 1.7 : 1.4, opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <motion.span
        key={`${kind}-${id}`}
        className={textClass}
        style={{ left: CENTER(x), top: CENTER(y) }}
        initial={{ y: 0, scale: 1.35, opacity: 0 }}
        animate={{ y: rise, scale: [1.35, 1.05, 1], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 0.85, times: [0, 0.2, 0.45, 1], ease: "easeOut" }}
      >
        {sign}
        {amount}
      </motion.span>
    </>
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
