import { CombatObstacle } from "@/types/game";
import { PlannedAction, Posture } from "./types";

export const GRID_SIZE = 10;

export const cellKey = (x: number, y: number) => `${x}:${y}`;

const TEAM_CLASSES = [
  "combat-marker-team-a",
  "combat-marker-team-b",
  "combat-marker-team-c",
  "combat-marker-team-d",
  "combat-marker-team-e",
  "combat-marker-team-f",
  "combat-marker-team-g",
  "combat-marker-team-h",
];

/** Distinct teams of the given fighters, in a stable order. */
export const distinctTeams = (fighters: { team: string }[]): string[] =>
  Array.from(new Set(fighters.map((f) => f.team))).sort();

/** A stable palette class for a team, or the "you" palette for the local player. */
export const teamClassFor = (
  team: string,
  teams: string[],
  playerId?: string,
): string => {
  if (playerId && team === playerId) return "combat-marker-you";
  const index = teams.indexOf(team);
  return TEAM_CLASSES[Math.max(0, index) % TEAM_CLASSES.length];
};


/**
 * A cell is blocked for movement only when an alive destructible obstacle
 * stands on it. Destroyed obstacles free the cell.
 */
export const isMovementBlocked = (
  x: number,
  y: number,
  obstacles: CombatObstacle[],
) =>
  obstacles.some(
    (obstacle) =>
      obstacle.x === x && obstacle.y === y && obstacle.currentHealth > 0,
  );

export const postureMovement = (posture: Posture) =>
  posture === "STANDING" ? 3 : posture === "CROUCHING" ? 2 : 1;

export const getLatestMove = (actions: PlannedAction[]) =>
  [...actions]
    .reverse()
    .find(
      (action): action is Extract<PlannedAction, { type: "MOVE" }> =>
        action.type === "MOVE",
    );

export const getLatestPosture = (actions: PlannedAction[], fallback: Posture) =>
  [...actions]
    .reverse()
    .find(
      (action): action is Extract<PlannedAction, { type: "POSTURE" }> =>
        action.type === "POSTURE",
    )?.posture || fallback;

export const getReachableCells = (
  startX: number,
  startY: number,
  maxSteps: number,
  obstacles: CombatObstacle[],
  blockedCells?: Set<string>,
) => {
  const reachable = new Set<string>();
  const queue = [{ x: startX, y: startY, steps: 0 }];
  const visited = new Set([cellKey(startX, startY)]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || current.steps >= maxSteps) continue;
    for (const [deltaX, deltaY] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = current.x + deltaX;
      const y = current.y + deltaY;
      const key = cellKey(x, y);
      if (
        x < 0 ||
        x >= GRID_SIZE ||
        y < 0 ||
        y >= GRID_SIZE ||
        visited.has(key) ||
        isMovementBlocked(x, y, obstacles) ||
        blockedCells?.has(key)
      )
        continue;
      visited.add(key);
      reachable.add(key);
      queue.push({ x, y, steps: current.steps + 1 });
    }
  }
  return reachable;
};

/**
 * Every cell in the Chebyshev range square around a point is the firing zone.
 * Obstacles do not limit the zone: bullets pass through and destroy them.
 */
export const getAttackRangeCells = (
  originX: number,
  originY: number,
  range: number,
) => {
  const cells = new Set<string>();
  const minX = Math.max(0, originX - range);
  const maxX = Math.min(GRID_SIZE - 1, originX + range);
  const minY = Math.max(0, originY - range);
  const maxY = Math.min(GRID_SIZE - 1, originY + range);
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      if (Math.max(Math.abs(x - originX), Math.abs(y - originY)) <= range) {
        cells.add(cellKey(x, y));
      }
    }
  }
  return cells;
};
