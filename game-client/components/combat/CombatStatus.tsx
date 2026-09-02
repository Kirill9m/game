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
  return (
    <>
      <div className="flex justify-between w-full bg-gray-900 p-3 rounded-lg border border-gray-700 text-sm">
        <div>
          <span className="text-gray-400">AP: </span>
          <span className="font-bold text-yellow-400">{actionPoints}</span>
          <span className="ml-3 text-gray-400">Move: </span>
          <span className="font-bold text-teal-300">{movementRemaining}</span>
          <span className="ml-1 text-gray-500">cells</span>
        </div>
        <div className="text-right">
          <div className="text-green-300">You: {myHealth} HP</div>
          <div className="text-red-300">{enemyName}: {enemyHealth} HP</div>
          <span className={isMyTurn ? "text-green-400 font-bold animate-pulse" : "text-red-400"}>
            {isMyTurn ? "Plan your actions" : "Waiting for the enemy"}
          </span>
        </div>
      </div>
      <div className="flex w-full items-center gap-2 text-xs text-gray-400" aria-live="polite">
        <span className={`h-2 w-2 rounded-full ${isMyTurn ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
        <span>{isReplaying || roundResolved ? "Resolving round..." : isMyTurn ? "Your phase" : "Enemy phase"}</span>
        {replayAction?.type === "ATTACK" ? (
          <span className="ml-auto font-semibold text-yellow-300">
            {replayAction.actor === (isPlayer1 ? "p1" : "p2") ? "YOU" : "FOE"} fires
          </span>
        ) : (
          <span className="ml-auto text-gray-500">Round actions play automatically</span>
        )}
      </div>
    </>
  );
}
