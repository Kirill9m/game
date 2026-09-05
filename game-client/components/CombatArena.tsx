"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { combatApi } from "@/services/combatApi";
import { CombatParticipant, CombatSession } from "@/types/game";
import { CombatActions } from "./combat/CombatActions";
import { CombatGrid } from "./combat/CombatGrid";
import { CombatLog } from "./combat/CombatLog";
import { CombatModeControls } from "./combat/CombatModeControls";
import { CombatLootPicker, CombatLootPickerPile } from "./combat/CombatLootPicker";
import { CombatStatus } from "./combat/CombatStatus";
import {
  getAttackRangeCells,
  getLatestMove,
  getLatestPosture,
  getReachableCells,
  isMovementBlocked,
  postureMovement,
} from "./combat/board";
import {
  CombatArenaProps,
  DamagePopup,
  HealPopup,
  DisplayPositions,
  DisplayPostures,
  PlannedAction,
  Posture,
  ReplayAction,
} from "./combat/types";

type ReplayStep =
  | { type: "MOVE"; actor: string; dx: number; dy: number }
  | { type: "ATTACK"; actor: string; target: string; damage: number; range?: number }
  | { type: "POSTURE"; actor: string; posture: Posture }
  | { type: "HEAL"; actor: string; amount: number };

function buildDisplay(combat: CombatSession) {
  const positions: DisplayPositions = {};
  const postures: DisplayPostures = {};
  for (const p of combat.participants ?? []) {
    if (p.role !== "FIGHTER") continue;
    positions[p.playerId] = { x: p.x, y: p.y };
    postures[p.playerId] = p.posture || "STANDING";
  }
  return { positions, postures };
}

function parseReplay(actions: string[]): ReplayStep[] {
  const steps: ReplayStep[] = [];
  for (const encoded of actions) {
    const parts = encoded.split(":");
    const actor = parts[0];
    const type = parts[1];
    if (type === "M") {
      steps.push({
        type: "MOVE",
        actor,
        dx: Number(parts[2] || 0),
        dy: Number(parts[3] || 0),
      });
    } else if (type === "A") {
      steps.push({
        type: "ATTACK",
        actor,
        target: parts[2] || "",
        damage: Number(parts[3] || 0),
        range: parts.length > 4 ? Number(parts[4]) : undefined,
      });
    } else if (type === "P") {
      steps.push({
        type: "POSTURE",
        actor,
        posture: (parts[2] || "STANDING") as Posture,
      });
    } else if (type === "U") {
      steps.push({ type: "HEAL", actor, amount: Number(parts[3] || 0) });
    }
  }
  return steps;
}

export default function CombatArena({
  combatId,
  playerId,
  initialCombat,
  inventory,
  onCombatUpdate,
  onCombatFinished,
  onOpenInventory,
  onInventoryChanged,
  onLeaveCombat,
}: CombatArenaProps) {
  const [combat, setCombat] = useState(initialCombat);
  const [error, setError] = useState("");
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [plannedActions, setPlannedActions] = useState<PlannedAction[]>([]);
  const [isEndingTurn, setIsEndingTurn] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [isLootPickerOpen, setIsLootPickerOpen] = useState(false);
  const [selectedPileIndexes, setSelectedPileIndexes] = useState<Set<number>>(
    new Set(),
  );
  const [isPickingLoot, setIsPickingLoot] = useState(false);
  const [animationTarget, setAnimationTarget] = useState<string | null>(null);
  const [replayAction, setReplayAction] = useState<ReplayAction | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [damagePopup, setDamagePopup] = useState<DamagePopup | null>(null);
  const [healPopup, setHealPopup] = useState<HealPopup | null>(null);

  const initial = useMemo(() => buildDisplay(initialCombat), [initialCombat]);
  const [displayPositions, setDisplayPositions] = useState<DisplayPositions>(
    initial.positions,
  );
  const [displayPostures, setDisplayPostures] = useState<DisplayPostures>(
    initial.postures,
  );

  const isReplayingRef = useRef(false);
  const replayedRoundRef = useRef<string | null>(null);
  const replayTimersRef = useRef<number[]>([]);
  const previousCombatRef = useRef(initialCombat);
  const lastCombatRef = useRef(initialCombat);
  const inventoryRoundRef = useRef<string | null>(null);

  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(320);
  const [isDesktop, setIsDesktop] = useState(false);

  // ---------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------

  const me = combat.participants?.find((p) => p.playerId === playerId);
  const isSpectator = me?.role === "SPECTATOR";
  const isFighter = me?.role === "FIGHTER";
  const myTeam = me?.team ?? "";
  const fighters = useMemo(
    () =>
      (combat.participants ?? []).filter(
        (p): p is CombatParticipant => p.role === "FIGHTER",
      ),
    [combat.participants],
  );
  const enemies = useMemo(
    () => fighters.filter((f) => f.team !== myTeam && f.health > 0),
    [fighters, myTeam],
  );

  const myX = me?.x ?? 0;
  const myY = me?.y ?? 0;
  const isMyTurn =
    isFighter &&
    (me?.health ?? 0) > 0 &&
    !(me?.ready ?? false) &&
    combat.status === "IN_PROGRESS";

  const equippedItemCode = me?.equippedItemCode || "PISTOL";
  const plannedEquipment =
    [...plannedActions]
      .reverse()
      .find(
        (action): action is Extract<PlannedAction, { type: "EQUIP" }> =>
          action.type === "EQUIP",
      )?.itemCode || equippedItemCode;
  const myPosture: Posture = (me?.posture as Posture) || "STANDING";
  const plannedPosture = getLatestPosture(plannedActions, myPosture);
  const movementRemaining =
    plannedActions.length < combat.actionPoints
      ? postureMovement(plannedPosture)
      : 0;
  const plannedEnd = getLatestMove(plannedActions);
  const obstacles = useMemo(() => combat.obstacles ?? [], [combat.obstacles]);

  const occupiedCells = useMemo(() => {
    const cells = new Set<string>();
    for (const f of fighters) {
      if (f.health > 0) cells.add(`${f.x}:${f.y}`);
    }
    return cells;
  }, [fighters]);

  const reachableCells = getReachableCells(
    plannedEnd?.x ?? myX,
    plannedEnd?.y ?? myY,
    movementRemaining,
    obstacles,
    occupiedCells,
  );

  const attackOrigin = plannedEnd ?? { x: myX, y: myY };
  const myAttackRange =
    inventory.find((item) => item.code === plannedEquipment)?.attackRange ?? 3;
  const attackRangeCells = getAttackRangeCells(
    attackOrigin.x,
    attackOrigin.y,
    myAttackRange,
  );
  const anyEnemyInRange = enemies.some(
    (e) =>
      Math.max(Math.abs(attackOrigin.x - e.x), Math.abs(attackOrigin.y - e.y)) <=
      myAttackRange,
  );
  const canAttack =
    isMyTurn &&
    !isReplaying &&
    anyEnemyInRange &&
    plannedActions.length < combat.actionPoints;
  const showAttackRange =
    isMyTurn && !isReplaying && plannedActions.length < combat.actionPoints;

  const lootAtMyFeet = useMemo<CombatLootPickerPile[]>(() => {
    const piles: CombatLootPickerPile[] = [];
    combat.loot?.forEach((pile, index) => {
      const distance = Math.max(Math.abs(pile.x - myX), Math.abs(pile.y - myY));
      if (distance <= 1 && pile.quantity > 0) {
        piles.push({ lootIndex: index, pile });
      }
    });
    return piles;
  }, [combat.loot, myX, myY]);

  // ---------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = gridWrapRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const cap = isDesktop ? 760 : 440;
      setBoardSize(Math.max(140, Math.min(w, h, cap)));
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isDesktop]);

  // Replay the last resolved round, then sync the display to the server state.
  useEffect(() => {
    const previous = previousCombatRef.current;
    const roundActions = combat.lastRoundActions;
    const roundKey = roundActions?.length
      ? `${roundActions.join("|")}`
      : null;

    if (roundKey && roundKey !== replayedRoundRef.current) {
      replayedRoundRef.current = roundKey;
      const steps = parseReplay(roundActions ?? []);
      if (steps.length > 0) {
        // Cancel any previous replay that is still running so animations never overlap.
        replayTimersRef.current.forEach((timer) => window.clearTimeout(timer));
        replayTimersRef.current = [];
        setIsReplaying(true);
        isReplayingRef.current = true;
        const timers: number[] = [];
        let positions = buildDisplay(previous).positions;
        let postures = buildDisplay(previous).postures;
        steps.forEach((step, index) => {
          const timer = window.setTimeout(() => {
            if (step.type === "MOVE") {
              positions = {
                ...positions,
                [step.actor]: {
                  x: (positions[step.actor]?.x ?? 0) + step.dx,
                  y: (positions[step.actor]?.y ?? 0) + step.dy,
                },
              };
              setDisplayPositions(positions);
            } else if (step.type === "ATTACK") {
              const from = positions[step.actor] ?? { x: 0, y: 0 };
              const to = positions[step.target] ?? { x: 0, y: 0 };
              setReplayAction({
                id: `${roundKey}-${index}`,
                type: "ATTACK",
                actor: step.actor,
                fromX: from.x,
                fromY: from.y,
                toX: to.x,
                toY: to.y,
                range: step.range,
              });
              setAnimationTarget(step.target);
              if (step.damage > 0) {
                setDamagePopup({
                  id: `${roundKey}-${index}-dmg`,
                  target: step.target,
                  amount: step.damage,
                });
              }
            } else if (step.type === "POSTURE") {
              postures = { ...postures, [step.actor]: step.posture };
              setDisplayPostures(postures);
            } else if (step.type === "HEAL") {
              setHealPopup({
                id: `${roundKey}-${index}-heal`,
                target: step.actor,
                amount: step.amount,
              });
            }
          }, index * 550);
          timers.push(timer);
        });
        timers.push(
          window.setTimeout(() => {
            const d = buildDisplay(combat);
            setDisplayPositions(d.positions);
            setDisplayPostures(d.postures);
            setReplayAction(null);
            setDamagePopup(null);
            setHealPopup(null);
            setAnimationTarget(null);
            setIsReplaying(false);
            isReplayingRef.current = false;
            replayTimersRef.current = [];
          }, steps.length * 550 + 400),
        );
        replayTimersRef.current = timers;
        setCombatLog((logs) => ["Round resolved — actions played.", ...logs].slice(0, 20));
      } else {
        const d = buildDisplay(combat);
        setDisplayPositions(d.positions);
        setDisplayPostures(d.postures);
      }
    } else if (!isReplayingRef.current) {
      const d = buildDisplay(combat);
      setDisplayPositions(d.positions);
      setDisplayPostures(d.postures);
    }
    previousCombatRef.current = combat;
  }, [combat]);

  useEffect(
    () => () =>
      replayTimersRef.current.forEach((timer) => window.clearTimeout(timer)),
    [],
  );

  useEffect(() => {
    lastCombatRef.current = combat;
  }, [combat]);

  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const latestCombat = await combatApi.getCombat(combatId);
        if ((latestCombat.version ?? 0) < (lastCombatRef.current.version ?? 0)) {
          return;
        }
        setCombat(latestCombat);
        onCombatUpdate(latestCombat);
      } catch {
        /* Polling is best effort. */
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [combatId, onCombatUpdate]);

  // Refresh inventory once per resolved round (consumables are used server-side).
  useEffect(() => {
    const roundActions = combat.lastRoundActions;
    const roundKey = roundActions?.length
      ? `${roundActions.join("|")}`
      : null;
    if (roundKey && roundKey !== inventoryRoundRef.current) {
      inventoryRoundRef.current = roundKey;
      onInventoryChanged?.();
    }
  }, [combat, onInventoryChanged]);

  // ---------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------

  const handleTileClick = useCallback(
    (targetX: number, targetY: number) => {
      if (!isMyTurn || isActing || combat.status !== "IN_PROGRESS") {
        setError("Not your turn!");
        return;
      }
      setError("");
      const targetKey = `${targetX}:${targetY}`;

      const enemyAtCell = enemies.find(
        (e) => e.x === targetX && e.y === targetY,
      );
      if (enemyAtCell) {
        if (plannedActions.length >= combat.actionPoints) {
          setError(`You have ${combat.actionPoints} action point${combat.actionPoints === 1 ? "" : "s"} left`);
          return;
        }
        const dist = Math.max(
          Math.abs(attackOrigin.x - targetX),
          Math.abs(attackOrigin.y - targetY),
        );
        if (dist > myAttackRange) {
          setError(`Enemy is out of weapon range (${myAttackRange} cells or closer)`);
          return;
        }
        setPlannedActions((actions) => [
          ...actions,
          { type: "ATTACK", x: targetX, y: targetY },
        ]);
        return;
      }

      if (isMovementBlocked(targetX, targetY, obstacles)) {
        setError("This cell is blocked by an obstacle — shoot it to destroy it");
        return;
      }
      if (!reachableCells.has(targetKey)) {
        setError(
          `Choose a reachable cell within ${postureMovement(plannedPosture)} cells`,
        );
        return;
      }
      if (plannedActions.length >= combat.actionPoints) {
        setError(`You have ${combat.actionPoints} action point${combat.actionPoints === 1 ? "" : "s"} left`);
        return;
      }
      setPlannedActions((actions) => [
        ...actions,
        { type: "MOVE", x: targetX, y: targetY },
      ]);
    },
    [
      attackOrigin.x,
      attackOrigin.y,
      combat,
      enemies,
      isActing,
      isMyTurn,
      myAttackRange,
      obstacles,
      plannedActions,
      plannedPosture,
      reachableCells,
    ],
  );

  const handleEndTurn = async () => {
    if (isEndingTurn) return;
    try {
      setError("");
      setIsEndingTurn(true);
      let previousMove = { x: myX, y: myY };
      const actions = plannedActions.reduce<
        Array<Record<string, number | string>>
      >((result, action) => {
        if (action.type === "POSTURE")
          result.push({ type: "POSTURE", posture: action.posture });
        else if (action.type === "EQUIP")
          result.push({ type: "EQUIP", itemCode: action.itemCode });
        else if (action.type === "USE")
          result.push({ type: "USE", itemCode: action.itemCode });
        else if (action.type === "MOVE") {
          result.push({
            type: "MOVE",
            dx: action.x - previousMove.x,
            dy: action.y - previousMove.y,
          });
          previousMove = action;
        } else
          result.push({ type: "ATTACK", targetX: action.x, targetY: action.y });
        return result;
      }, []);
      const updated = await combatApi.endTurn(combatId, playerId, actions);
      setCombat(updated);
      onCombatUpdate(updated);
      setPlannedActions([]);
      setCombatLog((prev) => [
        "Plan submitted. Waiting for other fighters.",
        ...prev,
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to end turn");
    } finally {
      setIsEndingTurn(false);
    }
  };

  const openLootPicker = () => {
    setSelectedPileIndexes(new Set(lootAtMyFeet.map((entry) => entry.lootIndex)));
    setIsLootPickerOpen(true);
  };

  const toggleLootPile = (lootIndex: number) => {
    setSelectedPileIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(lootIndex)) next.delete(lootIndex);
      else next.add(lootIndex);
      return next;
    });
  };

  const handleTakeLoot = async () => {
    if (isPickingLoot || selectedPileIndexes.size === 0) return;
    try {
      setError("");
      setIsPickingLoot(true);
      const updated = await combatApi.pickupLoot(
        combatId,
        playerId,
        [...selectedPileIndexes],
      );
      setCombat(updated);
      onCombatUpdate(updated);
      setIsLootPickerOpen(false);
      setSelectedPileIndexes(new Set());
      setCombatLog((prev) =>
        ["🎒 Loot taken from the board — it went to your field bag.", ...prev].slice(0, 20),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to pick up loot");
    } finally {
      setIsPickingLoot(false);
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

  const handleLeaveCombat = async () => {
    try {
      setIsActing(true);
      await combatApi.leaveCombat(combatId, playerId);
      onLeaveCombat?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to leave combat");
    } finally {
      setIsActing(false);
    }
  };

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="flex flex-col items-center gap-2 md:gap-2 w-full max-w-2xl xl:max-w-3xl min-h-0 flex-1"
    >
      <CombatStatus
        actionPoints={combat.actionPoints}
        movementRemaining={movementRemaining}
        isMyTurn={isMyTurn}
        isReplaying={isReplaying}
        roundResolved={isReplaying}
        replayAction={replayAction}
        fighters={fighters}
        playerId={playerId}
        turnDeadlineMillis={
          combat.status === "IN_PROGRESS" ? combat.turnDeadlineMillis : null
        }
      />
      {error && (
        <div className="text-red-400 text-xs bg-red-950 p-2 rounded w-full text-center">
          {error}
        </div>
      )}
      {!isSpectator && (
        <CombatModeControls
          plannedActions={plannedActions}
          plannedPosture={plannedPosture}
          actionPoints={combat.actionPoints}
          isMyTurn={isMyTurn}
          isReplaying={isReplaying}
          onPostureChange={(posture) =>
            setPlannedActions((actions) => [
              ...actions,
              { type: "POSTURE", posture },
            ])
          }
          inventory={inventory}
          equippedItemCode={plannedEquipment}
          onEquip={(itemCode) =>
            setPlannedActions((actions) => [...actions, { type: "EQUIP", itemCode }])
          }
          onUse={(itemCode) =>
            setPlannedActions((actions) => [...actions, { type: "USE", itemCode }])
          }
        />
      )}
      <div
        ref={gridWrapRef}
        className="flex-1 min-h-0 w-full flex items-center justify-center"
      >
        <CombatGrid
          combat={combat}
          playerId={playerId}
          canAttack={canAttack}
          attackRangeCells={showAttackRange ? attackRangeCells : null}
          isMyTurn={isMyTurn}
          plannedActions={plannedActions}
          reachableCells={reachableCells}
          displayPositions={displayPositions}
          displayPostures={displayPostures}
          replayAction={replayAction}
          animationTarget={animationTarget}
          damagePopup={damagePopup}
          healPopup={healPopup}
          boardSize={boardSize}
          onTileClick={(x, y) => void handleTileClick(x, y)}
        />
      </div>

      {/* Loot hint: piles lie somewhere on the board, but not under the player. */}
      {!isSpectator &&
        combat.status === "IN_PROGRESS" &&
        lootAtMyFeet.length === 0 &&
        (combat.loot?.length ?? 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-xl border border-emerald-500/50 bg-emerald-950/40 px-3 py-2 text-center text-xs text-emerald-200"
          >
            💰{" "}
            <span className="font-bold">
              {combat.loot!.length} loot pile
              {combat.loot!.length === 1 ? "" : "s"}
            </span>{" "}
            on the board — stand next to a pile and press Take Loot to grab it.
          </motion.div>
        )}

      {/* Player is on or next to a pile: offer the Take button and a selection. */}
      {!isSpectator && combat.status === "IN_PROGRESS" && lootAtMyFeet.length > 0 && (
        <div className="w-full flex flex-col gap-2">
          {!isLootPickerOpen ? (
            <motion.button
              type="button"
              onClick={openLootPicker}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/70 bg-emerald-900/50 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.4)] transition hover:bg-emerald-900 hover:text-white"
            >
              💰 Take Loot · {lootAtMyFeet.length} pile
              {lootAtMyFeet.length === 1 ? "" : "s"}
            </motion.button>
          ) : (
            <CombatLootPicker
              piles={lootAtMyFeet}
              selectedIndexes={selectedPileIndexes}
              busy={isPickingLoot}
              onToggle={toggleLootPile}
              onTake={() => void handleTakeLoot()}
              onCancel={() => setIsLootPickerOpen(false)}
            />
          )}
        </div>
      )}

      <CombatActions
        combat={combat}
        plannedActions={plannedActions}
        isMyTurn={isMyTurn}
        isActing={isActing}
        isEndingTurn={isEndingTurn}
        playerId={playerId}
        isSpectator={isSpectator}
        onClear={() => setPlannedActions([])}
        onEndTurn={handleEndTurn}
        onFinishCombat={handleFinishCombat}
        onCombatFinished={onCombatFinished}
        onLeaveCombat={handleLeaveCombat}
      />

      {/* Mobile inventory button — the inventory opens only on tap */}
      {!isSpectator && onOpenInventory && (
        <button
          type="button"
          onClick={onOpenInventory}
          className="md:hidden w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/60 bg-amber-900/40 px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-300 active:scale-[0.98] transition"
        >
          🎒 Open Inventory
          {inventory.length > 0 && (
            <span className="rounded-full bg-black/40 px-1.5 text-[10px]">
              {inventory.length}
            </span>
          )}
        </button>
      )}
      <CombatLog entries={combatLog} />
    </motion.div>
  );
}
