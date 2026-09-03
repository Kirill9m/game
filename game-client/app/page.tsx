"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { playerApi } from "@/services/playerApi";
import {
  CombatSession,
  EnemyType,
  InventoryItem,
  PlayerInfo,
  PlayerStats,
  QuestProgress,
  WorldCell,
  WorldZone,
} from "@/types/game";
import MovementPad from "@/components/MovementPad";
import PlayersList from "@/components/PlayersList";
import WorldMap from "@/components/WorldMap";
import CombatArena from "@/components/CombatArena";
import { combatApi } from "@/services/combatApi";
import InventoryPanel from "@/components/InventoryPanel";
import NpcDialog from "@/components/NpcDialog";
import { NpcInfo } from "@/types/npc";
import QuestPanel from "@/components/QuestPanel";
import AdminPanel from "@/components/AdminPanel";
import { questApi } from "@/services/questApi";

export default function GameMapPage() {
  const { data: session, status } = useSession();
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [playersOnTile, setPlayersOnTile] = useState<PlayerInfo[]>([]);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState<string | null>(null);
  const [combatSession, setCombatSession] = useState<CombatSession | null>(
    null,
  );
  const [enemyTypes, setEnemyTypes] = useState<EnemyType[]>([]);
  const [selectedEnemyCode, setSelectedEnemyCode] = useState("WOLF");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [gold, setGold] = useState<number>(0);
  const [stats, setStats] = useState<PlayerStats>({
    questPoints: 0,
    health: 100,
    level: 1,
    strength: 5,
    energy: 10,
    agility: 5,
    stamina: 10,
  });
  const [npcs, setNpcs] = useState<NpcInfo[]>([]);
  const [activeNpc, setActiveNpc] = useState<NpcInfo | null>(null);
  const [safeZone, setSafeZone] = useState<WorldZone | null>(null);
  const [worldCells, setWorldCells] = useState<WorldCell[]>([]);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [quests, setQuests] = useState<QuestProgress[]>([]);
  const [playerRole, setPlayerRole] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const [activeTab, setActiveTab] = useState<
    "inventory" | "territory" | "players" | "quests" | "admin"
  >("inventory");

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
      setError(err instanceof Error ? err.message : "Failed to start combat");
    }
  };

  const handleCheckTerritory = async (enemyCode: string) => {
    try {
      setError("");
      const session = await combatApi.startBotCombat(playerId, enemyCode);
      setCombatSession(session);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start combat");
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

  useEffect(() => {
    void combatApi
      .getEnemyTypes()
      .then(setEnemyTypes)
      .catch(() => setError("Failed to load enemy types"));
  }, []);

  useEffect(() => {
    void playerApi
      .getSafeZone()
      .then(setSafeZone)
      .catch(() => setError("Failed to load world zone"));
    void playerApi
      .getWorldCells()
      .then(setWorldCells)
      .catch(() => {});
  }, []);

  const playerId = sessionUser?.githubId || guestData?.id || "";
  const playerName = sessionUser?.username || guestData?.username || "Player";
  const playerAvatar = sessionUser?.image || "/default-avatar.png";

  const handleLoginPlayer = useCallback(async () => {
    if (!playerId) return;
    try {
      setError("");
      const [player, playerInventory, playerQuests] = await Promise.all([
        playerApi.loginPlayer(playerId, playerName, playerAvatar),
        playerApi.getInventory(playerId),
        questApi.getPlayerQuests(playerId),
      ]);
      setPositionX(player.positionX);
      setPositionY(player.positionY);
      if (player.playersOnTile) {
        setPlayersOnTile(player.playersOnTile);
      }
      setNpcs(player.npcs || []);
      setPlayerRole(player.role ?? null);
      setInventory(playerInventory);
      setQuests(playerQuests);
      if (typeof player.gold === "number") {
        setGold(player.gold);
      }
      setStats({
        questPoints: player.questPoints ?? 0,
        health: player.health ?? 100,
        level: player.level ?? 1,
        strength: player.strength ?? 5,
        energy: player.energy ?? 10,
        agility: player.agility ?? 5,
        stamina: player.stamina ?? 10,
      });
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
      } catch (e) {}
    }, 3000);

    return () => clearInterval(interval);
  }, [playerId, combatSession]);

  useEffect(() => {
    if (!playerId || combatSession) return;

    const refreshPlayerState = async () => {
      try {
        const player = await playerApi.getPlayerState(playerId);
        setPositionX(player.positionX);
        setPositionY(player.positionY);
        setPlayersOnTile(player.playersOnTile || []);
        setNpcs(player.npcs || []);
        setPlayerRole(player.role ?? null);
        if (typeof player.gold === "number") {
          setGold(player.gold);
        }
        setStats({
          questPoints: player.questPoints ?? 0,
          health: player.health ?? 100,
          level: player.level ?? 1,
          strength: player.strength ?? 5,
          energy: player.energy ?? 10,
          agility: player.agility ?? 5,
          stamina: player.stamina ?? 10,
        });
      } catch {}
    };

    const interval = setInterval(() => {
      void refreshPlayerState();
    }, 2000);

    return () => clearInterval(interval);
  }, [playerId, combatSession]);

  const handleMove = async (deltaX: number, deltaY: number) => {
    const targetX = positionX + deltaX;
    const targetY = positionY + deltaY;

    try {
      setError("");
      setNotice("");
      const data = await playerApi.movePlayer(playerId, targetX, targetY);
      setPositionX(data.positionX);
      setPositionY(data.positionY);
      setPlayersOnTile(data.playersOnTile || []);
      setNpcs(data.npcs || []);
      setCooldown(data.cooldown);
      setActiveNpc(null);
      if (typeof data.health === "number") {
        setStats((prev) => ({ ...prev, health: data.health as number }));
      }
      if ((data.radiationDamage ?? 0) > 0) {
        setNotice(
          `☢️ Radiation! You lost ${data.radiationDamage} HP (${data.health} HP left).`,
        );
      }
      if (data.combatStarted && data.combatId) {
        setNotice(
          `⚔️ Ambush! ${data.enemyName ?? "An enemy"} attacked you!`,
        );
        const combat = await combatApi.getCombat(data.combatId);
        setCombatSession(combat);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Movement failed");
    }
  };

  if (status === "loading") {
    return (
      <div className="h-screen bg-gray-950 text-white flex items-center justify-center font-semibold">
        Loading game world...
      </div>
    );
  }

  const isGuestMode = !session;

  const menuTabs = [
    { id: "inventory", icon: "🎒", label: "Inventory" },
    { id: "territory", icon: "🐺", label: "Hunt" },
    { id: "players", icon: "👥", label: "Players" },
    { id: "quests", icon: "📜", label: "Quests" },
    // The admin panel is only visible to players with the ADMIN role
    ...(playerRole === "ADMIN"
      ? [{ id: "admin" as const, icon: "🛠️", label: "Admin" }]
      : []),
  ] as const;

  return (
    <main className="h-screen h-[100dvh] w-screen overflow-hidden bg-gray-950 text-white p-2 md:p-4 flex flex-col justify-between">
      {isGuestMode && !sessionUser && !playerId ? (
        <div className="m-auto bg-gray-900 p-6 rounded-2xl shadow-2xl w-full max-w-md border border-gray-800 text-center space-y-4">
          <h1 className="text-3xl font-extrabold text-blue-400 mb-6 tracking-wide">
            JN RPG
          </h1>
          <p className="text-gray-400 text-sm">
            Sign in or enter as guest to start
          </p>
          <button
            onClick={() => signIn("github")}
            className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white font-bold py-3 px-6 rounded-xl transition"
          >
            Sign in with GitHub
          </button>
          <button
            onClick={() => {
              const g = getGuestUser();
              setGuestData({ ...g });
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition"
          >
            Play as Guest
          </button>
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto flex-1 min-h-0 flex flex-col gap-3">
          {/* ВЕРХНЯЯ ПАНЕЛЬ СТАТУСА */}
          <header className="flex justify-between items-center bg-gray-900 px-4 py-2.5 rounded-2xl border border-gray-800 shrink-0">
            <div className="flex items-center gap-3">
              {playerAvatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={playerAvatar}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full border border-gray-700 object-cover"
                />
              )}
              <div className="leading-tight">
                <span className="font-bold text-blue-300 text-sm block">
                  {playerName} {isGuestMode && "(Guest)"}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-500 text-[10px] block uppercase font-medium">
                    {combatSession ? "In Combat" : "In World"}
                  </span>
                  <span className="text-amber-400 text-[11px] font-semibold">
                    💰 {gold}
                  </span>
                  <span className="text-green-400 text-[11px] font-semibold">
                    ❤️ {stats.health}
                  </span>
                  <span className="text-blue-400 text-[11px] font-semibold">
                    Lv.{stats.level}
                  </span>
                  <span className="text-purple-400 text-[11px] font-semibold">
                    ⭐ {stats.questPoints} QP
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {session ? (
                <button
                  onClick={() => signOut()}
                  className="text-xs bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 px-3 py-1.5 rounded-xl transition font-medium"
                >
                  Sign out
                </button>
              ) : (
                <button
                  onClick={() => setGuestData(null)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-xl transition font-medium"
                >
                  Switch
                </button>
              )}
            </div>
          </header>

          {error && (
            <div className="bg-red-950/80 border border-red-800 text-red-200 px-3 py-2 rounded-xl text-xs shrink-0">
              {error}
            </div>
          )}

          {notice && !error && (
            <div className="bg-amber-950/80 border border-amber-700 text-amber-200 px-3 py-2 rounded-xl text-xs shrink-0">
              {notice}
            </div>
          )}

          {/* ОСНОВНОЙ DASHBOARD */}
          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* ЛЕВАЯ ЧАСТЬ: Арена боя ИЛИ Панель управления мирной зоны */}
            <div className="md:col-span-7 lg:col-span-8 bg-gray-900/90 border border-gray-800 rounded-2xl p-3 flex flex-col min-h-0 relative overflow-hidden">
              {combatSession ? (
                /* БОЕВАЯ АРЕНА */
                <div className="w-full h-full flex flex-col min-h-0 overflow-y-auto">
                  <CombatArena
                    combatId={combatSession.id}
                    playerId={playerId}
                    initialCombat={combatSession}
                    inventory={inventory}
                    onCombatUpdate={(updated) => setCombatSession(updated)}
                    onCombatFinished={() => setCombatSession(null)}
                  />
                </div>
              ) : (
                /* ВНЕ БОЯ: ПЕРЕКЛЮЧАЕМЫЕ ВКЛАДКИ */
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex items-center justify-between mb-3 shrink-0 border-b border-gray-800 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      World View
                    </span>
                    <div className="flex gap-2">
                      {menuTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                            activeTab === tab.id
                              ? "border-blue-500 bg-blue-950/60 text-blue-200 shadow-md scale-105"
                              : "border-gray-800 bg-gray-800/40 text-gray-400 hover:bg-gray-800"
                          }`}
                        >
                          <span className="text-base">{tab.icon}</span>
                          <span className="text-xs font-bold">{tab.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Контент активного окна */}
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                    {activeTab === "inventory" && (
                      <InventoryPanel
                        items={inventory}
                        playerId={playerId}
                        onItemsChange={setInventory}
                        onOpenMap={() => setIsMapOpen(true)}
                      />
                    )}

                    {activeTab === "territory" && (
                      <div className="w-full rounded-xl border border-amber-800/50 bg-amber-950/20 p-3">
                        <div className="mb-3">
                          <span className="block text-sm font-bold text-amber-200">
                            Check territory
                          </span>
                          <span className="text-xs text-amber-200/60">
                            Choose an enemy in the nearby woods.
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {enemyTypes.map((enemy) => (
                            <button
                              key={enemy.code}
                              type="button"
                              onClick={() => {
                                setSelectedEnemyCode(enemy.code);
                                void handleCheckTerritory(enemy.code);
                              }}
                              className={`rounded-xl border p-3 text-left transition ${
                                selectedEnemyCode === enemy.code
                                  ? "border-amber-400 bg-amber-900/60 shadow-lg"
                                  : "border-amber-900/40 bg-black/30 hover:border-amber-600"
                              }`}
                            >
                              <span className="block font-bold text-amber-100 text-sm mb-1">
                                {enemy.name}
                              </span>
                              <span className="block text-[11px] text-amber-200/70">
                                {enemy.maxHealth} HP | {enemy.damage} DMG | RNG{" "}
                                {enemy.attackRange}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === "players" && (
                      <PlayersList
                        players={playersOnTile}
                        currentId={playerId}
                        onAttack={handleStartCombat}
                        npcs={npcs}
                        onTalk={setActiveNpc}
                      />
                    )}

                    {activeTab === "quests" && (
                      <QuestPanel
                        quests={quests}
                        playerId={playerId}
                        onQuestsChange={(updatedQuests) => {
                          setQuests(updatedQuests);
                          if (playerId) {
                            playerApi.getInventory(playerId).then(setInventory).catch(() => {});
                            playerApi.getPlayerState(playerId).then((state) => {
                              if (typeof state?.gold === "number") setGold(state.gold);
                              setStats({
                                questPoints: state.questPoints ?? 0,
                                health: state.health ?? 100,
                                level: state.level ?? 1,
                                strength: state.strength ?? 5,
                                energy: state.energy ?? 10,
                                agility: state.agility ?? 5,
                                stamina: state.stamina ?? 10,
                              });
                            }).catch(() => {});
                          }
                        }}
                      />
                    )}

                    {activeTab === "admin" && playerRole === "ADMIN" && (
                      <AdminPanel playerId={playerId} />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ПРАВАЯ ЧАСТЬ: ИНВЕНТАРЬ (В бою) ИЛИ ДЖОЙСТИК И КАРТА (Вне боя) */}
            <div className="md:col-span-5 lg:col-span-4 bg-gray-900/90 border border-gray-800 rounded-2xl p-3 flex flex-col justify-between shrink-0 min-h-0">
              {combatSession ? (
                /* ИНВЕНТАРЬ ВО ВРЕМЯ БОЯ */
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2 shrink-0">
                    <span className="text-xs uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
                      🎒 Combat Inventory
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <InventoryPanel
                      items={inventory}
                      playerId={playerId}
                      onItemsChange={setInventory}
                    />
                  </div>
                </div>
              ) : (
                /* ДЖОЙСТИК И КАРТА ВНЕ БОЯ */
                <div className="h-full flex flex-col justify-between items-center">
                  <div className="w-full flex items-center justify-between border-b border-gray-800 pb-2 mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider text-gray-400">
                      Navigation
                    </span>
                    <span className="font-mono text-xs text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-900">
                      [{positionX} : {positionY}]
                    </span>
                  </div>

                  <div className="my-auto flex items-center justify-center p-2">
                    <MovementPad
                      onMove={handleMove}
                      currentCell={`[${positionX}/${positionY}]`}
                      cooldown={cooldown}
                    />
                  </div>

                  {safeZone && (
                    <button
                      type="button"
                      onClick={() => setIsMapOpen(true)}
                      className="w-full mt-2 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-200 transition flex items-center justify-center gap-2"
                    >
                      🗺️ Open World Map
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО КАРТЫ */}
      {isMapOpen && safeZone && !combatSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-800">
              <h3 className="font-bold text-gray-200 text-sm uppercase tracking-wider">
                World Map [{positionX}:{positionY}]
              </h3>
              <button
                type="button"
                onClick={() => setIsMapOpen(false)}
                className="bg-red-950 hover:bg-red-800 border border-red-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-black/50 rounded-xl p-2 flex justify-center items-center min-h-[300px]">
              <WorldMap
                positionX={positionX}
                positionY={positionY}
                zone={safeZone}
                npcs={npcs}
                cells={worldCells}
                onTalk={setActiveNpc}
              />
            </div>
          </div>
        </div>
      )}

      {/* DIALOG NPC */}
      {activeNpc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-2xl">
            <NpcDialog
              npc={activeNpc}
              playerId={playerId}
              onClose={() => {
                setActiveNpc(null);
                if (playerId) {
                  playerApi.getInventory(playerId).then(setInventory).catch(() => {});
                  playerApi.getPlayerState(playerId).then((state) => {
                    if (typeof state?.gold === "number") setGold(state.gold);
                  }).catch(() => {});
                  questApi.getPlayerQuests(playerId).then(setQuests).catch(() => {});
                }
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
