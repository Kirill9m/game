"use client";

import { motion } from "framer-motion";
import { ReplayAction } from "./types";

interface CombatStatusProps {
  actionPoints: number;
  movementRemaining: number;
  myHealth: number;
  enemyHealth: number;
  isMyTurn: boolean;
  isReplaying: boolean;
  roundResolved: boolean;
  replayAction: ReplayAction | null;
  isPlayer1: boolean;
  enemyName?: string;
}

const hpTone = (hp: number) =>
  hp >= 60 ? "hp-fill-good" : hp >= 30 ? "hp-fill-mid" : "hp-fill-low";

export function CombatStatus({
  actionPoints,
  movementRemaining,
  myHealth,
  enemyHealth,
  isMyTurn,
  isReplaying,
  roundResolved,
  replayAction,
  isPlayer1,
  enemyName = "Enemy",
}: CombatStatusProps) {
  const myPct = Math.max(0, Math.min(100, myHealth));
  const enemyPct = Math.max(0, Math.min(100, enemyHealth));

  const phase = isReplaying || roundResolved
    ? "Resolving round…"
    : isMyTurn
      ? "YOUR PHASE"
      : "ENEMY PHASE";
  const phaseTone = isReplaying || roundResolved
    ? "bg-amber-400/20 text-amber-300"
    : isMyTurn
      ? "bg-emerald-400/15 text-emerald-300"
      : "bg-red-500/15 text-red-300";

  return (
    <div className="w-full flex flex-col gap-2">
      {/* Phase banner */}
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className={`w-full rounded-xl border border-white/10 px-3 py-1.5 text-center text-xs font-bold uppercase tracking-[0.18em] ${phaseTone} backdrop-blur-sm`}
      >
        {phase}
      </motion.div>

      {/* Health cards */}
      <div className="grid grid-cols-2 gap-2">
        <HealthCard
          name="YOU"
          value={myHealth}
          pct={myPct}
          accent={"border-sky-400/40 text-sky-300"}
          delay={0}
          active={isMyTurn}
        />
        <HealthCard
          name={enemyName.toUpperCase()}
          value={enemyHealth}
          pct={enemyPct}
          accent={"border-red-400/40 text-red-300"}
          delay={0.08}
          active={!isMyTurn}
        />
      </div>

      {/* AP pips + movement */}
      <div className="flex w-full items-center justify-between text-xs text-gray-400" aria-live="polite">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold uppercase tracking-wider text-gray-500">AP</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: actionPoints }, (_, i) => (
              <motion.span
                key={`pip-${i}`}
                className="ap-pip ap-pip-on"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 24, delay: i * 0.04 }}
              />
            ))}
          </div>
          <span className="ml-1 text-gray-500">Move {movementRemaining} cells</span>
        </div>
        {replayAction?.type === "ATTACK" ? (
          <motion.span
            key={replayAction.id}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="font-semibold text-yellow-300"
          >
            {replayAction.actor === (isPlayer1 ? "p1" : "p2") ? "YOU" : "FOE"} fires
          </motion.span>
        ) : (
          <span className="text-gray-500">Round actions play automatically</span>
        )}
      </div>
    </div>
  );
}

function HealthCard({
  name,
  value,
  pct,
  accent,
  delay,
  active,
}: {
  name: string;
  value: number;
  pct: number;
  accent: string;
  delay: number;
  active: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 22, delay }}
      className={`rounded-xl border bg-gray-900/85 px-2.5 py-2 backdrop-blur-sm ${accent} ${active ? "shadow-[0_0_18px_rgba(255,255,255,0.06)]" : ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider">{name}</span>
        <span className="font-mono text-sm font-extrabold text-white">{value}</span>
      </div>
      <div className="hp-bar mt-1.5">
        <motion.div
          className={`hp-fill ${hpTone(pct)}`}
          initial={{ width: "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </div>
    </motion.div>
  );
}