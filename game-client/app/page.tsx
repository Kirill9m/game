"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { playerApi } from "@/services/playerApi";
import { PlayerInfo } from "@/types/game";
import MovementPad from "@/components/MovementPad";
import PlayersList from "@/components/PlayersList";
import CombatArena from "@/components/CombatArena";
import { combatApi } from "@/services/combatApi";

export default function GameMapPage() {
  const { data: session, status } = useSession();
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [playersOnTile, setPlayersOnTile] = useState<PlayerInfo[]>([]);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState<string | null>(null);
  const [combatSession, setCombatSession] = useState<any | null>(null);

  const sessionUser = session?.user as
    | { githubId?: string; username?: string; image?: string }
    | undefined;

  const getGuestUser = () => {
    if (typeof window === "undefined")
      return { id: "guest_temp", username: "Guest" };
    let guestId = localStorage.getItem("rpg_guest_id");
    let guestName = localStorage.getItem("rpg_guest_name");
    if (!guestId) {
      const randomHex = Math.random().toString(36).substring(2, 8);
      guestId = `guest_${randomHex}`;
      guestName = `Guest_${randomHex.toUpperCase()}`;
      localStorage.setItem("rpg_guest_id", guestId);
      localStorage.setItem("rpg_guest_name", guestName);
    }
    return { id: guestId, username: guestName || "Guest" };
  };

  const handleStartCombat = async (targetId: string) => {
    try {
      setError("");
      const session = await combatApi.startCombat(playerId, targetId);
      setCombatSession(session);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to start combat");
      }
    }
  };

  const [guestData, setGuestData] = useState<{
    id: string;
    username: string;
  } | null>(null);

  useEffect(() => {
    if (!session) {
      setGuestData(getGuestUser());
    }
  }, [session]);

  const playerId = sessionUser?.githubId || guestData?.id || "";
  const playerName = sessionUser?.username || guestData?.username || "Player";
  const playerAvatar = sessionUser?.image || "/default-avatar.png";

  const handleLoginPlayer = useCallback(async () => {
    if (!playerId) return;
    try {
      setError("");
      const player = await playerApi.loginPlayer(
        playerId,
        playerName,
        playerAvatar,
      );
      setPositionX(player.positionX);
      setPositionY(player.positionY);
      if (player.playersOnTile) {
        setPlayersOnTile(player.playersOnTile);
      }
    } catch {
      setError("Failed to load player data from backend");
    }
  }, [playerId, playerName, playerAvatar]);

  useEffect(() => {
    if (playerId) {
      handleLoginPlayer();
    }
  }, [playerId, handleLoginPlayer]);

  useEffect(() => {
    if (!playerId || combatSession) return;

    const interval = setInterval(async () => {
      try {
        const activeCombat = await combatApi.getActiveCombatForPlayer(playerId);
        if (activeCombat && activeCombat.id) {
          setCombatSession(activeCombat);
        }
      } catch (e) {
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [playerId, combatSession]);

  const handleMove = async (deltaX: number, deltaY: number) => {
    const targetX = positionX + deltaX;
    const targetY = positionY + deltaY;

    try {
      setError("");
      const data = await playerApi.movePlayer(playerId, targetX, targetY);
      setPositionX(data.positionX);
      setPositionY(data.positionY);
      setPlayersOnTile(data.playersOnTile || []);
      setCooldown(data.cooldown);
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

  const isGuestMode = !session;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-md space-y-6 border border-gray-700">
        <h1 className="text-2xl font-bold text-center text-blue-400">
          RPG Open World
        </h1>

        {isGuestMode && !sessionUser && !playerId ? (
          <div className="text-center space-y-4 py-8">
            <p className="text-gray-400 text-sm">
              Please sign in or play as a guest to enter the game world
            </p>
            <button
              onClick={() => signIn("github")}
              className="w-full bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white font-semibold py-2.5 px-6 rounded-lg transition flex items-center justify-center gap-2 mx-auto"
            >
              Sign in with GitHub
            </button>
            <button
              onClick={() => {
                const g = getGuestUser();
                setGuestData({ ...g });
              }}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-6 rounded-lg transition"
            >
              Play as Guest
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center bg-gray-900 p-3 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3 text-sm">
                {playerAvatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={playerAvatar}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full border border-gray-600"
                  />
                )}
                <div>
                  <span className="text-gray-400 block text-xs">
                    Logged in as:
                  </span>
                  <span className="font-semibold text-blue-300">
                    {playerName} {isGuestMode && "(Guest)"}
                  </span>
                </div>
              </div>
              {session ? (
                <button
                  onClick={() => signOut()}
                  className="text-xs bg-red-900/60 hover:bg-red-900 text-red-200 px-3 py-1.5 rounded-lg transition"
                >
                  Sign out
                </button>
              ) : (
                <button
                  onClick={() => setGuestData(null)}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition"
                >
                  Switch
                </button>
              )}
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {combatSession ? (
              <CombatArena
                combatId={combatSession.id}
                playerId={playerId}
                initialCombat={combatSession}
                onCombatUpdate={(updated) => setCombatSession(updated)}
              />
            ) : (
              <>
                <MovementPad
                  onMove={handleMove}
                  currentCell={`[${positionX}/${positionY}]`}
                  cooldown={cooldown}
                />

                <PlayersList
                  players={playersOnTile}
                  currentId={playerId}
                  onAttack={handleStartCombat}
                />
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
