import { PlayerInfo } from "@/types/game";

interface PlayersListProps {
  players: PlayerInfo[];
  currentId: string;
}

export default function PlayersList({ players, currentId }: PlayersListProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-400 mb-2">
        Players nearby:
      </h2>
      <ul className="bg-gray-900 border border-gray-700 rounded-lg p-2.5 h-32 overflow-y-auto space-y-1">
        {players.length === 0 ? (
          <li className="text-gray-500 text-sm italic text-center py-6">
            No players on this tile
          </li>
        ) : (
          players.map((p) => (
            <li
              key={p.playerId}
              className="flex justify-between items-center p-2 bg-gray-800 rounded text-sm"
            >
              <span className="font-mono text-gray-300">
                {p.playerId.substring(0, 8)}...
              </span>
              {p.playerId === currentId && (
                <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">
                  You
                </span>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
