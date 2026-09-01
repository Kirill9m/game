"use client";

import { useState } from "react";
import { playerApi } from "@/services/playerApi";
import { PlayerInfo } from "@/types/game";
import PlayerInput from "@/components/PlayerInput";
import MapDisplay from "@/components/MapDisplay";
import MovementPad from "@/components/MovementPad";
import PlayersList from "@/components/PlayersList";

export default function GameMapPage() {
  const [playerId, setPlayerId] = useState("");
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [playersOnTile, setPlayersOnTile] = useState<PlayerInfo[]>([]);
  const [error, setError] = useState("");

  const handleFetchPlayer = async () => {
    if (!playerId.trim()) return;
    try {
      setError("");
      const player = await playerApi.getPlayer(playerId.trim());
      setPositionX(player.positionX);
      setPositionY(player.positionY);
    } catch {
      setError("Player not found in database");
    }
  };

  const handleMove = async (deltaX: number, deltaY: number) => {
    if (!playerId.trim()) {
      alert("Please enter Player ID first!");
      return;
    }

    const targetX = positionX + deltaX;
    const targetY = positionY + deltaY;

    try {
      setError("");
      const data = await playerApi.movePlayer(
        playerId.trim(),
        targetX,
        targetY,
      );
      setPositionX(data.positionX);
      setPositionY(data.positionY);
      setPlayersOnTile(data.playersOnTile || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Movement failed");
      }
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md space-y-6 border border-gray-700">
        <h1 className="text-2xl font-bold text-center text-blue-400">
          RPG Open World
        </h1>

        <PlayerInput
          playerId={playerId}
          setPlayerId={setPlayerId}
          onBlur={handleFetchPlayer}
        />

        <MapDisplay x={positionX} y={positionY} />

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <MovementPad onMove={handleMove} />

        <PlayersList players={playersOnTile} currentId={playerId} />
      </div>
    </main>
  );
}
