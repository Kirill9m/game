"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { playerApi } from "@/services/playerApi";
import {
  CombatSession,
  GameMap,
  InventoryItem,
  PlayerInfo,
  PlayerStats,
  QuestProgress,
  WorldCell,
  WorldLoot,
  WorldZone,
} from "@/types/game";
import MovementPad from "@/components/MovementPad";
import PlayersList from "@/components/PlayersList";
import WorldMap from "@/components/WorldMap";
import CombatArena from "@/components/CombatArena";
import { combatApi } from "@/services/combatApi";
import InventoryPanel from "@/components/InventoryPanel";
import EquipmentPanel from "@/components/EquipmentPanel";
import LootPanel from "@/components/LootPanel";
import NpcDialog from "@/components/NpcDialog";
import { NpcInfo } from "@/types/npc";
import QuestPanel from "@/components/QuestPanel";
import AdminPanel from "@/components/admin/AdminPanel";
import LocationView from "@/components/LocationView";
import { questApi } from "@/services/questApi";
import { locationApi } from "@/services/locationApi";
import type { Location } from "@/types/location";

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
  const [gameMaps, setGameMaps] = useState<GameMap[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [insideLocation, setInsideLocation] = useState(false);
  const [playersInLocation, setPlayersInLocation] = useState<PlayerInfo[]>([]);
  const [activeMap, setActiveMap] = useState<GameMap | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  // Loot piles visible on the currently opened map viewport.
  const [mapLoot, setMapLoot] = useState<WorldLoot[]>([]);
  // Инвентарь во время боя на мобильных открывается только по кнопке
  const [isMobileInventoryOpen, setIsMobileInventoryOpen] = useState(false);
  const [quests, setQuests] = useState<QuestProgress[]>([]);
  const [playerRole, setPlayerRole] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  // Loot piles lying on the player's current tile.
  const [fieldLoot, setFieldLoot] = useState<WorldLoot[]>([]);
  const [inSafeZone, setInSafeZone] = useState(true);
  // Всплывающая анимация лечения (вне боя): вспышка "+N" над показателем HP.
  const [healFlash, setHealFlash] = useState<{ amount: number; id: number } | null>(
    null,
  );

  const [activeTab, setActiveTab] = useState<
    "inventory" | "quests" | "location" | "admin"
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
    void playerApi
      .getSafeZone()
      .then(setSafeZone)
      .catch(() => setError("Failed to load world zone"));
    void playerApi
      .getWorldCells()
      .then(setWorldCells)
      .catch(() => {});
    void playerApi
      .getGameMaps()
      .then(setGameMaps)
      .catch(() => {});
    void locationApi
      .getLocations()
      .then(setLocations)
      .catch(() => {});
  }, []);

  const playerId = sessionUser?.githubId || guestData?.id || "";
  const playerName = sessionUser?.username || guestData?.username || "Player";
  const playerAvatar = sessionUser?.image || "/default-avatar.png";

  // Heartbeat — keep the player marked as online
  useEffect(() => {
    if (!playerId) return;
    const interval = setInterval(() => {
      playerApi.heartbeat(playerId).catch(() => {});
    }, 20_000); // every 20 seconds
    return () => clearInterval(interval);
  }, [playerId]);

  const handleLoginPlayer = useCallback(async () => {
    if (!playerId) return;
    try {
      setError("");
      // Login first: it secures marked field loot when the player spawns inside
      // the city, so the inventory reflects the secured items afterwards.
      const player = await playerApi.loginPlayer(playerId, playerName, playerAvatar);
      const [playerInventory, playerQuests] = await Promise.all([
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
      setFieldLoot(player.fieldLoot || []);
      setInSafeZone(player.inSafeZone ?? false);
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
        setFieldLoot(player.fieldLoot || []);
        setInSafeZone(player.inSafeZone ?? false);
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
      setPlayersInLocation([]); // movement clears building context
      setNpcs(data.npcs || []);
      setCooldown(data.cooldown);
      setActiveNpc(null);
      setFieldLoot(data.fieldLoot || []);
      if (data.inventory) setInventory(data.inventory);
      setInSafeZone(data.inSafeZone ?? true);
      if (typeof data.health === "number") {
        setStats((prev) => ({ ...prev, health: data.health as number }));
      }
      if ((data.radiationDamage ?? 0) > 0) {
        setNotice(
          `☢️ Radiation! You lost ${data.radiationDamage} HP (${data.health} HP left).`,
        );
      }
      if (data.lootDeposited) {
        setNotice(
          `🏙️ You entered the city — ${data.lootDepositedCount ?? 0} item${(data.lootDepositedCount ?? 0) === 1 ? "" : "s"} secured.`,
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

  /** Enters/exits a location (building). No longer teleports — just sets the
   *  location context on the server. */
  const handleEnterLocation = async (locationId: string, buildingId?: string) => {
    setError("");
    setNotice("");
    try {
      const data = await locationApi.enterLocation(playerId, locationId, buildingId);
      // Position stays the same — only location context changes
      setPlayersOnTile(data.playersOnTile || []);
      setPlayersInLocation(data.playersInLocation || []);
      setNpcs(data.npcs || []);
      setCooldown(data.cooldown);
      setActiveNpc(null);
      setFieldLoot(data.fieldLoot || []);
      if (data.inventory) setInventory(data.inventory);
      setInSafeZone(data.inSafeZone ?? true);
      if (typeof data.health === "number") {
        setStats((prev) => ({ ...prev, health: data.health as number }));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to enter location");
      throw err;
    }
  };

  /** Picks up a world loot pile on the current tile. */
  const handlePickupLoot = async (lootId: string) => {
    try {
      setError("");
      const response = await playerApi.pickupLoot(playerId, lootId);
      setFieldLoot(response.fieldLoot);
      setInventory(response.inventory);
      if (response.notice) {
        setNotice(response.notice);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to pick up loot");
    }
  };

  /** Uses a health-restoring consumable outside of combat. */
  const handleUseItem = async (itemCode: string) => {
    try {
      setError("");
      const response = await playerApi.useItem(playerId, itemCode);
      setInventory(response.inventory);
      if (typeof response.health === "number") {
        setStats((prev) => ({ ...prev, health: response.health }));
      }
      if (response.healed > 0) {
        setHealFlash({ amount: response.healed, id: Date.now() });
      }
      setNotice(
        response.healed > 0
          ? `❤️ Restored ${response.healed} HP (${response.health} HP now).`
          : "❤️ You are already at full health.",
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to use item");
    }
  };

  /** Maps the player can actually open (item present in the inventory). */
  const ownedMaps = gameMaps.filter((gm) =>
    inventory.some((item) => item.code === gm.itemCode),
  );

  /**
   * Open the world map modal. When an inventory item code is supplied it opens
   * the map bound to that item; otherwise it defaults to the first owned map
   * and falls back to the first map on the server.
   */
  const openMap = (itemCode?: string) => {
    setError("");
    if (itemCode) {
      const byItem =
        gameMaps.find((gm) => gm.itemCode.toLowerCase() === itemCode.toLowerCase()) ?? null;
      if (byItem) {
        setActiveMap(byItem);
        setIsMapOpen(true);
        // Loot piles inside the map viewport (20x20 cells around the center).
        void playerApi
          .getWorldLoot(byItem.centerX, byItem.centerY, byItem.radius + 5)
          .then(setMapLoot)
          .catch(() => setMapLoot([]));
        return;
      }
      setNotice(`No map found for item "${itemCode}"`);
      return;
    }
    const next = ownedMaps[0] ?? gameMaps[0] ?? null;
    if (!next) {
      setNotice("You don't have a map yet");
      return;
    }
    setActiveMap(next);
    setNotice("");
    setIsMapOpen(true);
    void playerApi
      .getWorldLoot(next.centerX, next.centerY, next.radius + 5)
      .then(setMapLoot)
      .catch(() => setMapLoot([]));
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
    { id: "quests", icon: "📜", label: "Quests" },
    { id: "location", icon: "📍", label: "Location" },
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
          <header className="flex justify-between items-center gap-2 bg-gray-900 px-3 md:px-4 py-2 rounded-2xl border border-gray-800 shrink-0 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              {playerAvatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={playerAvatar}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full border border-gray-700 object-cover"
                />
              )}
              <div className="leading-tight">
                <span className="font-bold text-blue-300 text-sm block truncate max-w-[140px] sm:max-w-none">
                  {playerName} {isGuestMode && "(Guest)"}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-500 text-[10px] block uppercase font-medium">
                    {combatSession ? "In Combat" : "In World"}
                  </span>
                  <span className="text-amber-400 text-[11px] font-semibold">
                    💰 {gold}
                  </span>
                  <span className="relative inline-flex items-center text-green-400 text-[11px] font-semibold">
                    <motion.span
                      animate={healFlash ? { scale: [1, 1.45, 1] } : { scale: 1 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="inline-block"
                    >
                      ❤️ {stats.health}
                    </motion.span>
                    {healFlash && (
                      <motion.span
                        key={healFlash.id}
                        initial={{ opacity: 1, y: 0, scale: 0.9 }}
                        animate={{ opacity: 0, y: -18, scale: 1.25 }}
                        transition={{ duration: 1.1, ease: "easeOut" }}
                        onAnimationComplete={() => setHealFlash(null)}
                        className="pointer-events-none absolute inset-x-0 top-1/2 text-center text-emerald-300 font-bold text-[13px] drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]"
                      >
                        +{healFlash.amount}
                      </motion.span>
                    )}
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
            <div className="md:col-span-7 lg:col-span-8 bg-gray-900/90 border border-gray-800 rounded-2xl p-2.5 md:p-3 flex flex-col min-h-0 relative overflow-hidden">
              {combatSession ? (
                /* БОЕВАЯ АРЕНА */
                <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
                  <CombatArena
                    combatId={combatSession.id}
                    playerId={playerId}
                    initialCombat={combatSession}
                    inventory={inventory}
                    onCombatUpdate={(updated) => setCombatSession(updated)}
                    onCombatFinished={() => {
                      setCombatSession(null);
                      setIsMobileInventoryOpen(false);
                      // Marked field loot may have been lost (PvE) or dropped
                      // (PvP) as a result of the finished combat — refresh all.
                      playerApi.getInventory(playerId).then(setInventory).catch(() => {});
                      void playerApi
                        .getPlayerState(playerId)
                        .then((state) => {
                          setFieldLoot(state.fieldLoot || []);
                          if ((state.fieldLoot ?? []).length > 0) {
                            setNotice(
                              "💀 Your field loot dropped on the ground! Pick it up before someone else does.",
                            );
                          }
                          setInSafeZone(state.inSafeZone ?? false);
                          // Persist post-combat health into the HUD immediately.
                          const newHealth = state.health;
                          if (typeof newHealth === "number") {
                            setStats((prev) => ({ ...prev, health: newHealth }));
                          }
                          return state;
                        })
                        .catch(() => {});
                    }}
                    onOpenInventory={() => setIsMobileInventoryOpen(true)}
                    onInventoryChanged={() =>
                      playerApi.getInventory(playerId).then(setInventory).catch(() => {})
                    }
                  />
                </div>
              ) : (
                /* ВНЕ БОЯ: ПЕРЕКЛЮЧАЕМЫЕ ВКЛАДКИ */
                <div className="flex-1 min-h-0 flex flex-col">
                  {/* МОБИЛЬНЫЕ: компактная сводка лута и игроки на тайле (на десктопе это правая колонка) */}
                  <div className="md:hidden shrink-0 space-y-2 mb-2 max-h-[38%] overflow-y-auto">
                    <LootPanel
                      fieldLoot={fieldLoot}
                      inSafeZone={inSafeZone}
                      playerId={playerId}
                      onPickup={handlePickupLoot}
                      compact
                    />
                    {playersOnTile.length + npcs.length > 0 && (
                      <div className="overflow-hidden">
                        <PlayersList
                          players={playersOnTile}
                          currentId={playerId}
                          onAttack={handleStartCombat}
                          npcs={npcs}
                          onTalk={setActiveNpc}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-3 shrink-0 border-b border-gray-800 pb-2 gap-2">
                    <span className="hidden sm:block text-xs font-bold uppercase tracking-wider text-gray-400">
                      World View
                    </span>
                    <div className="flex gap-1 md:gap-2 overflow-x-auto w-full sm:w-auto justify-start sm:justify-end">
                      {menuTabs.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-1 md:gap-1.5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-xl border transition-all shrink-0 ${
                            activeTab === tab.id
                              ? "border-blue-500 bg-blue-950/60 text-blue-200 shadow-md scale-105"
                              : "border-gray-800 bg-gray-800/40 text-gray-400 hover:bg-gray-800"
                          }`}
                        >
                          <span className="text-base">{tab.icon}</span>
                          <span className="text-[11px] md:text-xs font-bold whitespace-nowrap">
                            {tab.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Контент активного окна */}
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                    {activeTab === "inventory" && (
                      <div className="flex flex-col gap-3">
                        <EquipmentPanel
                          items={inventory}
                          playerId={playerId}
                          onItemsChange={setInventory}
                        />
                        <InventoryPanel
                          items={inventory}
                          playerId={playerId}
                          onItemsChange={setInventory}
                          onOpenMap={openMap}
                          onUseItem={handleUseItem}
                        />
                      </div>
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

                    {activeTab === "location" && (
                      <LocationView
                        locations={locations}
                        npcs={npcs}
                        positionX={positionX}
                        positionY={positionY}
                        onTalk={setActiveNpc}
                        onInsideChange={setInsideLocation}
                        onEnterLocation={handleEnterLocation}
                      />
                    )}

                    {activeTab === "admin" && playerRole === "ADMIN" && (
                      <AdminPanel playerId={playerId} onHunt={handleCheckTerritory} />
                    )}
                  </div>

                  {/* МОБИЛЬНЫЕ: компактная нижняя навигация — мини-D-pad и карта */}
                  <div className="md:hidden shrink-0 mt-2 border-t border-gray-800 pt-2 flex flex-col items-center gap-1.5">
                    <div className="w-full flex items-center justify-between px-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                        Navigation
                      </span>
                      <span className="font-mono text-[11px] text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-900">
                        [{positionX} : {positionY}]
                      </span>
                    </div>
                    <MovementPad
                      onMove={handleMove}
                      currentCell={`[${positionX}/${positionY}]`}
                      cooldown={cooldown}
                      disabled={insideLocation}
                    />
                    {safeZone && (
                      <button
                        type="button"
                        onClick={() => openMap()}
                        className="w-full py-2 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-[11px] font-bold uppercase tracking-wider text-gray-200 transition active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        🗺️ Open World Map
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ПРАВАЯ ЧАСТЬ: ИНВЕНТАРЬ (В бою на desktop) ИЛИ ДЖОЙСТИК И КАРТА (Вне боя) */}
            {/* На мобильных во время боя инвентарь скрыт и открывается кнопкой 🎒 (bottom-sheet). */}
            <div className="hidden md:flex md:col-span-5 lg:col-span-4 bg-gray-900/90 border border-gray-800 rounded-2xl p-3 justify-between flex-col shrink-0 min-h-0">
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
                  <div className="w-full">
                    <LootPanel
                      fieldLoot={fieldLoot}
                      inSafeZone={inSafeZone}
                      playerId={playerId}
                      onPickup={handlePickupLoot}
                    />
                  </div>

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
                      disabled={insideLocation}
                    />
                  </div>

                  <div className="w-full flex flex-col items-stretch gap-2">
                    {safeZone && (
                      <button
                        type="button"
                        onClick={() => openMap()}
                        className="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-200 transition flex items-center justify-center gap-2"
                      >
                        🗺️ Open World Map
                      </button>
                    )}

                    {playersOnTile.length + npcs.length > 0 && (
                      <div className="w-full max-h-64 overflow-y-auto shrink-0 text-left">
                        <PlayersList
                          players={playersOnTile}
                          currentId={playerId}
                          onAttack={handleStartCombat}
                          npcs={npcs}
                          onTalk={setActiveNpc}
                        />
                      </div>
                    )}
                    {playersInLocation.length > 0 && (
                      <div className="w-full max-h-64 overflow-y-auto shrink-0 text-left mt-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wide text-amber-400 mb-1">
                          🏠 Inside the same building
                        </h4>
                        <PlayersList
                          players={playersInLocation}
                          currentId={playerId}
                          onAttack={handleStartCombat}
                          npcs={[]}
                          onTalk={setActiveNpc}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* МОДАЛЬНОЕ ОКНО КАРТЫ */}
      {isMapOpen && activeMap && !combatSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="relative w-full max-w-3xl bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-800">
              <div>
                <h3 className="font-bold text-gray-200 text-sm uppercase tracking-wider">
                  🗺️ {activeMap.name} [{positionX}:{positionY}]
                </h3>
                <p className="text-[10px] text-gray-500">
                  You are at [{positionX}:{positionY}] · map center [{activeMap.centerX}:{activeMap.centerY}]
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMapOpen(false)}
                className="bg-red-950 hover:bg-red-800 border border-red-800 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
              >
                ✕ Close
              </button>
            </div>

            {ownedMaps.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mr-1">
                  Maps:
                </span>
                {ownedMaps.map((gm) => (
                  <button
                    key={gm.id}
                    type="button"
                    onClick={() => setActiveMap(gm)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                      activeMap.id === gm.id
                        ? "border-blue-500 bg-blue-950/60 text-blue-200"
                        : "border-gray-700 bg-gray-800/40 text-gray-400 hover:bg-gray-800"
                    }`}
                  >
                    {gm.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-auto bg-black/50 rounded-xl p-2 flex justify-center items-center min-h-[300px]">
              <WorldMap
                positionX={positionX}
                positionY={positionY}
                map={activeMap}
                safeZone={safeZone}
                npcs={npcs}
                cells={worldCells}
                loot={mapLoot}
                locations={locations}
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

      {/* ИНВЕНТАРЬ В БОЮ НА МОБИЛЬНЫХ: открывается только по кнопке 🎒 */}
      {combatSession && (
        <AnimatePresence>
          {isMobileInventoryOpen && (
            <motion.div
              className="fixed inset-0 z-50 flex items-end md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                onClick={() => setIsMobileInventoryOpen(false)}
              />
              <motion.div
                className="relative w-full h-[68dvh] rounded-t-3xl border-t border-amber-500/40 bg-gray-900 p-3 flex flex-col"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
              >
                <div className="flex items-center justify-between shrink-0 border-b border-gray-800 pb-2 mb-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
                    🎒 Combat Inventory
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsMobileInventoryOpen(false)}
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 active:scale-95 transition"
                  >
                    ✕ Close
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <InventoryPanel
                    items={inventory}
                    playerId={playerId}
                    onItemsChange={setInventory}
                  />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </main>
  );
}
