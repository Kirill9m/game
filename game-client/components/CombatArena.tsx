"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { combatApi } from "@/services/combatApi";
import { CombatActions } from "./combat/CombatActions";
import { CombatGrid } from "./combat/CombatGrid";
import { CombatLog } from "./combat/CombatLog";
import { CombatModeControls } from "./combat/CombatModeControls";
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
  DisplayHealth,
  DisplayPositions,
  DisplayPostures,
  PlannedAction,
  Posture,
  ReplayAction,
} from "./combat/types";

export default function CombatArena({
  combatId,
  playerId,
  initialCombat,
  inventory,
  onCombatUpdate,
  onCombatFinished,
  onOpenInventory,
}: CombatArenaProps) {
  const [combat, setCombat] = useState(initialCombat);
  const [error, setError] = useState("");
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [plannedActions, setPlannedActions] = useState<PlannedAction[]>([]);
  const [isEndingTurn, setIsEndingTurn] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [animationTarget, setAnimationTarget] = useState<"p1" | "p2" | null>(
    null,
  );
  const [displayPositions, setDisplayPositions] = useState<DisplayPositions>({
    p1: { x: initialCombat.p1X, y: initialCombat.p1Y },
    p2: { x: initialCombat.p2X, y: initialCombat.p2Y },
  });
  const [replayAction, setReplayAction] = useState<ReplayAction | null>(null);
  const [isReplaying, setIsReplaying] = useState(false);
  const [displayHealth, setDisplayHealth] = useState<DisplayHealth>({
    p1: initialCombat.p1Health,
    p2: initialCombat.p2Health,
  });
  const [damagePopup, setDamagePopup] = useState<DamagePopup | null>(null);
  const [displayPostures, setDisplayPostures] = useState<DisplayPostures>({
    p1: initialCombat.p1Posture || "STANDING",
    p2: initialCombat.p2Posture || "STANDING",
  });
  const isReplayingRef = useRef(false);
  const replayedRoundRef = useRef<string | null>(null);
  const replayTimersRef = useRef<number[]>([]);
  const previousCombatRef = useRef(initialCombat);

  // Размер поля: mobile — вписываемся в высоту экрана (до 440px),
  // desktop — растем по ширине колонки вплоть до 760px.
  const gridWrapRef = useRef<HTMLDivElement>(null);
  const [boardSize, setBoardSize] = useState(320);
  const [isDesktop, setIsDesktop] = useState(false);

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
      // Квадрат по min(ширина, высота) — поле всегда влезает в экран.
      const cap = isDesktop ? 760 : 440;
      setBoardSize(Math.max(140, Math.min(w, h, cap)));
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isDesktop]);

  const isPlayer1 = playerId === combat.player1Id;
  const myX = isPlayer1 ? combat.p1X : combat.p2X;
  const myY = isPlayer1 ? combat.p1Y : combat.p2Y;
  const isMyTurn = isPlayer1 ? !combat.p1Ready : !combat.p2Ready;
  const enemyX = isPlayer1 ? combat.p2X : combat.p1X;
  const enemyY = isPlayer1 ? combat.p2Y : combat.p1Y;
  const myHealth = isPlayer1 ? displayHealth.p1 : displayHealth.p2;
  const enemyHealth = isPlayer1 ? displayHealth.p2 : displayHealth.p1;
  const equippedItemCode = isPlayer1
    ? combat.p1EquippedItemCode || "PISTOL"
    : combat.p2EquippedItemCode || "PISTOL";
  const plannedEquipment =
    [...plannedActions]
      .reverse()
      .find(
        (action): action is Extract<PlannedAction, { type: "EQUIP" }> =>
          action.type === "EQUIP",
      )?.itemCode || equippedItemCode;
  const isWolf = combat.player2Id === "bot_wolf";
  const myPosture: Posture = isPlayer1
    ? combat.p1Posture || "STANDING"
    : combat.p2Posture || "STANDING";
  const plannedPosture = getLatestPosture(plannedActions, myPosture);
  const movementRemaining =
    plannedActions.length < combat.actionPoints
      ? postureMovement(plannedPosture)
      : 0;
  const plannedEnd = getLatestMove(plannedActions);
  const obstacles = useMemo(() => combat.obstacles ?? [], [combat.obstacles]);
  const reachableCells = getReachableCells(
    plannedEnd?.x ?? myX,
    plannedEnd?.y ?? myY,
    movementRemaining,
    obstacles,
  );

  // Дальность текущего (или запланированного к экипировке) оружия.
  const attackOrigin = plannedEnd ?? { x: myX, y: myY };
  const myAttackRange =
    inventory.find((item) => item.code === plannedEquipment)?.attackRange ?? 3;
  // Зона обстрела вокруг точки, из которой будем стрелять в этом ходе.
  // Препятствия её не ограничивают — пули проходят сквозь них, повреждая их.
  const attackRangeCells = getAttackRangeCells(
    attackOrigin.x,
    attackOrigin.y,
    myAttackRange,
  );
  // Сервер считает дистанцию как max(|dx|, |dy|) (Chebyshev).
  const distanceToEnemy = Math.max(
    Math.abs(attackOrigin.x - enemyX),
    Math.abs(attackOrigin.y - enemyY),
  );
  const canAttack =
    isMyTurn &&
    !isReplaying &&
    distanceToEnemy <= myAttackRange &&
    plannedActions.length < combat.actionPoints;
  // Зону обстрела показываем только когда ей можно воспользоваться.
  const showAttackRange =
    isMyTurn &&
    !isReplaying &&
    plannedActions.length < combat.actionPoints;

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
      let positions: DisplayPositions = {
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
            const next = {
              x: current.x + Number(first),
              y: current.y + Number(second),
            };
            setReplayAction({
              id: `${encodedAction}-${index}`,
              type: "MOVE",
              actor: actorKey,
              fromX: current.x,
              fromY: current.y,
              toX: next.x,
              toY: next.y,
            });
            positions = { ...positions, [actorKey]: next };
            setDisplayPositions(positions);
            setAnimationTarget(actorKey);
          } else if (type === "P") {
            setDisplayPostures((postures) => ({
              ...postures,
              [actorKey]: first as Posture,
            }));
            setAnimationTarget(actorKey);
          } else if (type === "A") {
            const targetKey = actorKey === "p1" ? "p2" : "p1";
            const damage = Number(encodedAction.split(":")[4] || 0);
            setReplayAction({
              id: `${encodedAction}-${index}`,
              type: "ATTACK",
              actor: actorKey,
              fromX: current.x,
              fromY: current.y,
              toX: Number(first),
              toY: Number(second),
            });
            setAnimationTarget(targetKey);
            if (damage > 0)
              replayTimersRef.current.push(
                window.setTimeout(() => {
                  setDisplayHealth((health) => ({
                    ...health,
                    [targetKey]: Math.max(0, health[targetKey] - damage),
                  }));
                  setDamagePopup({
                    id: `${encodedAction}-${index}-damage`,
                    target: targetKey,
                    amount: damage,
                  });
                }, 420),
              );
          }
        }, index * 700);
        replayTimersRef.current.push(timer);
      });
      replayTimersRef.current.push(
        window.setTimeout(
          () => {
            setDisplayPositions({
              p1: { x: combat.p1X, y: combat.p1Y },
              p2: { x: combat.p2X, y: combat.p2Y },
            });
            setDisplayHealth({ p1: combat.p1Health, p2: combat.p2Health });
            setDisplayPostures({
              p1: combat.p1Posture || "STANDING",
              p2: combat.p2Posture || "STANDING",
            });
            setReplayAction(null);
            setDamagePopup(null);
            setAnimationTarget(damagedP1 ? "p1" : damagedP2 ? "p2" : null);
            setIsReplaying(false);
            isReplayingRef.current = false;
            replayTimersRef.current = [];
          },
          roundActions.length * 700 + 500,
        ),
      );
      const roundEvents = [
        ...(movedP1 ? ["Player 1 moved"] : []),
        ...(movedP2 ? ["Player 2 moved"] : []),
        ...(damagedP1
          ? [`Player 1 took ${previous.p1Health - combat.p1Health} damage`]
          : []),
        ...(damagedP2
          ? [`Player 2 took ${previous.p2Health - combat.p2Health} damage`]
          : []),
      ];
      setCombatLog((logs) => [...roundEvents.reverse(), ...logs].slice(0, 20));
      previousCombatRef.current = combat;
    }
    if (isReplayingRef.current) return;
    setDisplayPositions({
      p1: { x: combat.p1X, y: combat.p1Y },
      p2: { x: combat.p2X, y: combat.p2Y },
    });
    setDisplayHealth({ p1: combat.p1Health, p2: combat.p2Health });
    setDisplayPostures({
      p1: combat.p1Posture || "STANDING",
      p2: combat.p2Posture || "STANDING",
    });
    if (
      previous.p1Ready !== combat.p1Ready ||
      previous.p2Ready !== combat.p2Ready
    )
      setCombatLog((logs) =>
        [
          combat.p1Ready && combat.p2Ready
            ? "Round resolved"
            : "Plan submitted. Waiting for the enemy.",
          ...logs,
        ].slice(0, 20),
      );
    previousCombatRef.current = combat;
  }, [combat]);

  useEffect(
    () => () =>
      replayTimersRef.current.forEach((timer) => window.clearTimeout(timer)),
    [],
  );
  useEffect(() => {
    const interval = window.setInterval(async () => {
      try {
        const latestCombat = await combatApi.getCombat(combatId);
        setCombat(latestCombat);
        onCombatUpdate(latestCombat);
      } catch {
        /* Polling is best effort. */
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [combatId, onCombatUpdate]);

  const handleTileClick = useCallback(
    (targetX: number, targetY: number) => {
      if (!isMyTurn || isActing || combat.status !== "IN_PROGRESS") {
        setError("Not your turn!");
        return;
      }
      setError("");
      const targetKey = `${targetX}:${targetY}`;

      // Нажатие на врага = выстрел по умолчанию (режима "Shoot" больше нет).
      if (targetX === enemyX && targetY === enemyY) {
        if (plannedActions.length >= combat.actionPoints) {
          setError(
            `You have ${combat.actionPoints} action point${combat.actionPoints === 1 ? "" : "s"} left`,
          );
          return;
        }
        if (!canAttack) {
          setError(
            `Enemy is out of weapon range (${myAttackRange} cells or closer)`,
          );
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
        setError(
          `You have ${combat.actionPoints} action point${combat.actionPoints === 1 ? "" : "s"} left`,
        );
        return;
      }
      setPlannedActions((actions) => [
        ...actions,
        { type: "MOVE", x: targetX, y: targetY },
      ]);
    },
    [
      canAttack,
      combat,
      enemyX,
      enemyY,
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
        "Plan submitted. Waiting for the enemy.",
        ...prev,
      ]);
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
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 22 }}
      className="flex flex-col items-center gap-2 md:gap-2 w-full max-w-2xl xl:max-w-3xl min-h-0 flex-1"
    >
      <CombatStatus
        actionPoints={combat.actionPoints}
        movementRemaining={movementRemaining}
        myHealth={myHealth}
        enemyHealth={enemyHealth}
        isMyTurn={isMyTurn}
        isReplaying={isReplaying}
        roundResolved={Boolean(combat.p1Ready && combat.p2Ready)}
        replayAction={replayAction}
        isPlayer1={isPlayer1}
        enemyName={isWolf ? "Wolf" : undefined}
      />
      {error && (
        <div className="text-red-400 text-xs bg-red-950 p-2 rounded w-full text-center">
          {error}
        </div>
      )}
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
      />
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
          boardSize={boardSize}
          onTileClick={(x, y) => void handleTileClick(x, y)}
        />
      </div>
      <CombatActions
        combat={combat}
        plannedActions={plannedActions}
        isMyTurn={isMyTurn}
        isActing={isActing}
        isEndingTurn={isEndingTurn}
        playerId={playerId}
        onClear={() => setPlannedActions([])}
        onEndTurn={handleEndTurn}
        onFinishCombat={handleFinishCombat}
        onCombatFinished={onCombatFinished}
      />
      {/* Кнопка инвентаря на мобильных — инвентарь открывается только по нажатию */}
      {onOpenInventory && (
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
