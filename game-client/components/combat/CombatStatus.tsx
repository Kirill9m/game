"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CombatParticipant } from "@/types/game";
import { distinctTeams, teamClassFor } from "./board";
import { ReplayAction } from "./types";

interface CombatStatusProps {
  actionPoints: number;
  movementRemaining: number;
  isMyTurn: boolean;
  isReplaying: boolean;
  roundResolved: boolean;
  replayAction: ReplayAction | null;
  fighters: CombatParticipant[];
  playerId: string;
  turnDeadlineMillis?: number | null;
}

const hpTone = (hp: number) =>
  hp >= 60 ? "hp-fill-good" : hp >= 30 ? "hp-fill-mid" : "hp-fill-low";

export function CombatStatus({
  actionPoints,
  movementRemaining,
  isMyTurn,
  isReplaying,
  roundResolved,
  replayAction,
  fighters,
  playerId,
  turnDeadlineMillis,
}: CombatStatusProps) {
  const teams = distinctTeams(fighters);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const remainingSeconds =
    turnDeadlineMillis && turnDeadlineMillis > 0
      ? Math.max(0, Math.ceil((turnDeadlineMillis - now) / 1000))
      : null;

  const phase = isReplaying || roundResolved
    ? "Resolving round…"
    : isMyTurn
      ? "YOUR PHASE"
      : "Waiting for fighters";
  const phaseTone = isReplaying || roundResolved
    ? "bg-amber-400/20 text-amber-300"
    : isMyTurn
      ? "bg-emerald-400/15 text-emerald-300"
      : "bg-red-500/15 text-red-300";

  const phaseBadge = (
    <motion.div
      key={phase}
      initial={{ opacity: 0, y: -6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`rounded-xl border border-white/10 px-2.5 py-1.5 text-center text-[10px] md:text-[11px] font-bold uppercase tracking-[0.16em] ${phaseTone} backdrop-blur-sm whitespace-nowrap`}
    >
      {phase}
    </motion.div>
  );

  const timerBadge =
    remainingSeconds != null && !isReplaying ? (
      <motion.div
        key={remainingSeconds}
        initial={{ scale: 0.9, opacity: 0.7 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`rounded-xl border border-white/10 px-2.5 py-1.5 text-center text-[10px] md:text-[11px] font-bold uppercase tracking-[0.16em] backdrop-blur-sm whitespace-nowrap ${
          remainingSeconds <= 10
            ? "bg-red-500/20 text-red-300"
            : "bg-gray-800/60 text-gray-300"
        }`}
      >
        ⏱ {remainingSeconds}s
      </motion.div>
    ) : null;

  const labelFor = (f: CombatParticipant) =>
    f.playerId === playerId
      ? "YOU"
      : f.playerId.startsWith("bot_")
        ? "ENEMY"
        : f.team === "A" || f.team === "B"
          ? `TEAM ${f.team}`
          : "FOE";

  const healthRow = (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {fighters.map((f, index) => {
        const pct = Math.max(0, Math.min(100, f.health));
        const isYou = f.playerId === playerId;
        const colorClass = isYou
          ? "combat-marker-you"
          : teamClassFor(f.team, teams, playerId);
        return (
          <HealthCard
            key={f.playerId}
            name={labelFor(f)}
            value={f.health}
            pct={pct}
            colorClass={colorClass}
            down={f.health <= 0}
            delay={index * 0.05}
            active={isMyTurn && isYou}
          />
        );
      })}
    </div>
  );

  const apBlock = (
    <div className="flex w-full items-center justify-between gap-2 text-xs text-gray-400" aria-live="polite">
      <div className="flex items-center gap-1.5 whitespace-nowrap">
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
          className="font-semibold text-yellow-300 shrink-0"
        >
          {replayAction.actor === playerId ? "YOU" : "FIGHTER"} fires
        </motion.span>
      ) : (
        <span className="text-gray-500 shrink-0 hidden xl:inline">Round actions play automatically</span>
      )}
    </div>
  );

  return (
    <div className="w-full shrink-0 flex flex-col gap-1.5 md:gap-2">
      <div className="hidden lg:flex w-full items-center gap-3">
        <div className="shrink-0">{phaseBadge}</div>
        <div className="shrink-0">{timerBadge}</div>
        <div className="flex-1 min-w-0">{healthRow}</div>
        <div className="shrink-0">{apBlock}</div>
      </div>

      <div className="lg:hidden flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          {phaseBadge}
          {timerBadge}
        </div>
        {healthRow}
        {apBlock}
      </div>
    </div>
  );
}

function HealthCard({
  name,
  value,
  pct,
  colorClass,
  down,
  delay,
  active,
}: {
  name: string;
  value: number;
  pct: number;
  colorClass: string;
  down: boolean;
  delay: number;
  active: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 22, delay }}
      className={`${colorClass} shrink-0 w-28 rounded-xl border bg-gray-900/85 px-2.5 py-1.5 md:py-2 backdrop-blur-sm ${
        active ? "border-amber-400/60" : "border-white/10"
      } ${down ? "opacity-45" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="marker-dot" style={{ background: "var(--tk)" }} />
        <span className="flex-1 truncate text-[11px] font-bold uppercase tracking-wider">{name}</span>
        <span className="font-mono text-sm font-extrabold text-white shrink-0">
          {down ? "☠" : value}
        </span>
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
