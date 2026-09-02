import { PlannedAction, Posture } from "./types";

export const GRID_SIZE = 10;
export const WATER_CELLS = new Set(["1:6", "2:6", "1:7", "2:7", "1:8", "2:8"]);
export const WALL_CELLS = new Set(["3:3", "3:4", "3:5", "6:6", "7:6"]);

export const cellKey = (x: number, y: number) => `${x}:${y}`;

export const isMovementBlocked = (x: number, y: number) =>
  WATER_CELLS.has(cellKey(x, y)) || WALL_CELLS.has(cellKey(x, y));

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
        isMovementBlocked(x, y)
      )
        continue;
      visited.add(key);
      reachable.add(key);
      queue.push({ x, y, steps: current.steps + 1 });
    }
  }
  return reachable;
};
