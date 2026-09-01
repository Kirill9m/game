import { playerApi } from "@/services/playerApi";
import { useState } from "react";

interface PlayerInfo {
  playerId: string;
  username: string;
}

interface PlayersListProps {
  players: PlayerInfo[];
  currentId: string;
}

export default function PlayersList({ players, currentId }: PlayersListProps) {
  const [message, setMessage] = useState("");

  const handleAttack = async (targetId: string) => {
    try {
      setMessage("");
      const data = await playerApi.attack(currentId, targetId);
      setMessage(data.message || "Attack successful!");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage("Attack failed");
      }
    }
  };

  return (
    <div className="space-y-2 bg-gray-900 p-3 rounded-lg border border-gray-700">
      <h3 className="text-sm font-semibold text-gray-400">
        Players on this tile:
      </h3>
      {message && <p className="text-xs text-yellow-400">{message}</p>}
      <ul className="space-y-1">
        {players.map((p) => {
          const identifier = p.username || p.playerId;
          const isSelf = p.playerId === currentId;
          return (
            <li
              key={identifier}
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
                  onClick={() => handleAttack(identifier)}
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
