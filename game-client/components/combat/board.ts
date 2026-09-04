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

/**
 * Все клетки в квадрате дальности (Chebyshev) вокруг точки — зона обстрела.
 * Включая саму точку; не исключает стены/воду — это чисто визуальная зона.
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

/**
 * Зона обстрела с учётом препятствий: только те клетки квадрата дальности,
 * до которых линия огня не перекрыта стеной. Используется для подсветки,
 * чтобы враг за стеной не выглядел «в радиусе» оружия.
 */
export const getShootableCells = (
  originX: number,
  originY: number,
  range: number,
) => {
  const shootable = new Set<string>();
  for (const key of getAttackRangeCells(originX, originY, range)) {
    const separator = key.indexOf(":");
    const x = Number(key.slice(0, separator));
    const y = Number(key.slice(separator + 1));
    if (!isLineOfSightBlocked(originX, originY, x, y)) {
      shootable.add(key);
    }
  }
  return shootable;
};

/**
 * Точная копия серверного raycast: линию обстрела блокируют только стены,
 * точка попадания - интерполяция по шагам max(|dx|, |dy|).
 */
export const isLineOfSightBlocked = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) => {
  const steps = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));
  for (let step = 1; step < steps; step++) {
    const x = fromX + Math.round(((toX - fromX) * step) / steps);
    const y = fromY + Math.round(((toY - fromY) * step) / steps);
    if (WALL_CELLS.has(cellKey(x, y))) return true;
  }
  return false;
};
