import { useState } from "react";
import { PlayerInfo } from "@/types/game";
import { NpcInfo } from "@/types/npc";

interface PlayersListProps {
  players: PlayerInfo[];
  currentId: string;
  onAttack: (targetId: string) => void;
  npcs?: NpcInfo[];
  onTalk: (npc: NpcInfo) => void;
}

export default function PlayersList({
  players,
  currentId,
  onAttack,
  npcs = [],
  onTalk,
}: PlayersListProps) {
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-2 bg-gray-900 p-3 rounded-lg border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-400">
        Players and characters on this tile:
      </h3>
      {message && <p className="text-xs text-yellow-400">{message}</p>}
      <ul className="space-y-1">
        {npcs.map((npc) => (
          <li
            key={npc.code}
            className="flex items-center justify-between text-sm py-1"
          >
            <span className="font-semibold text-sky-300">{npc.name}</span>
            <button
              type="button"
              onClick={() => onTalk(npc)}
              className="rounded bg-sky-700 px-2.5 py-1 text-xs text-white transition hover:bg-sky-600"
            >
              Talk
            </button>
          </li>
        ))}
        {players.map((p) => {
          const identifier = p.username || p.playerId;
          const isSelf = p.playerId === currentId;
          const isOnline = p.online !== false; // default to true for backward compat
          if (!isSelf && !isOnline) return null; // hide offline players
          return (
            <li
              key={p.playerId}
              className="flex justify-between items-center text-sm py-1"
            >
              <span
                className={
                  isSelf ? "text-green-400 font-bold" : "text-gray-300"
                }
              >
                {identifier} {isSelf && "(You)"}
              </span>
              {!isSelf && (
                <button
                  onClick={() => onAttack(p.playerId)}
                  className="bg-red-700 hover:bg-red-600 text-white text-xs px-2.5 py-1 rounded transition"
                >
                  Attack
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
