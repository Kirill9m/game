"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { playerApi } from "@/services/playerApi";
import { PlayerInfo } from "@/types/game";
import MapDisplay from "@/components/MapDisplay";
import MovementPad from "@/components/MovementPad";
import PlayersList from "@/components/PlayersList";

export default function GameMapPage() {
  const { data: session, status } = useSession();
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [playersOnTile, setPlayersOnTile] = useState<PlayerInfo[]>([]);
  const [error, setError] = useState("");

  // Используем email или имя из GitHub как уникальный идентификатор игрока
  const playerId = session?.user?.email || "";

  useEffect(() => {
    if (playerId) {
      loadPlayer();
    }
  }, [playerId]);

  const loadPlayer = async () => {
    try {
      setError("");
      // Здесь бэкенд может искать или создавать игрока по GitHub email/id
      const player = await playerApi.getPlayer(playerId);
      setPositionX(player.positionX);
      setPositionY(player.positionY);
    } catch {
      setError("Failed to load player data from backend");
    }
  };

  const handleMove = async (deltaX: number, deltaY: number) => {
    const targetX = positionX + deltaX;
    const targetY = positionY + deltaY;

    try {
      setError("");
      const data = await playerApi.movePlayer(playerId, targetX, targetY);
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

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md space-y-6 border border-gray-700">
        <h1 className="text-2xl font-bold text-center text-blue-400">
          RPG Open World
        </h1>

        {!session ? (
          <div className="text-center space-y-4 py-8">
            <p className="text-gray-400 text-sm">
              Please sign in to enter the game world
            </p>
            <button
              onClick={() => signIn("github")}
              className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white font-semibold py-2.5 px-6 rounded-lg transition flex items-center justify-center gap-2 mx-auto"
            >
              Sign in with GitHub
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center bg-gray-900 p-3 rounded-lg border border-gray-700">
              <div className="text-sm">
                <span className="text-gray-400">Logged in as: </span>
                <span className="font-semibold text-blue-300">
                  {session.user?.name}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="text-xs bg-red-900/60 hover:bg-red-900 text-red-200 px-3 py-1.5 rounded-lg transition"
              >
                Sign out
              </button>
            </div>

            <MapDisplay x={positionX} y={positionY} />

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <MovementPad onMove={handleMove} />

            <PlayersList players={playersOnTile} currentId={playerId} />
          </>
        )}
      </div>
    </main>
  );
}
