"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import type {
  AdminDialogueNode,
  AdminEnemyType,
  AdminGameMap,
  AdminItem,
  AdminLocation,
  AdminNpc,
  AdminObstacleType,
  AdminPlayer,
  AdminQuest,
  AdminWeaponType,
  AdminWorldCell,
} from "@/types/admin";
import type { WorldZone } from "@/types/game";

export interface AdminDataState {
  players: AdminPlayer[];
  npcs: AdminNpc[];
  quests: AdminQuest[];
  items: AdminItem[];
  weaponTypes: AdminWeaponType[];
  enemies: AdminEnemyType[];
  worldCells: AdminWorldCell[];
  safeZone: WorldZone | null;
  maps: AdminGameMap[];
  obstacleTypes: AdminObstacleType[];
  locations: AdminLocation[];
  dialogueNodes: AdminDialogueNode[];
  selectedNpcId: string;
}

/**
 * Central hook that fetches and stores every entity the admin panel
 * needs.  Returns the data array + a `refresh` function that re-fetches
 * everything in parallel.
 */
export function useAdminData(playerId: string) {
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [npcs, setNpcs] = useState<AdminNpc[]>([]);
  const [quests, setQuests] = useState<AdminQuest[]>([]);
  const [items, setItems] = useState<AdminItem[]>([]);
  const [weaponTypes, setWeaponTypes] = useState<AdminWeaponType[]>([]);
  const [enemies, setEnemies] = useState<AdminEnemyType[]>([]);
  const [worldCells, setWorldCells] = useState<AdminWorldCell[]>([]);
  const [safeZone, setSafeZone] = useState<WorldZone | null>(null);
  const [maps, setMaps] = useState<AdminGameMap[]>([]);
  const [obstacleTypes, setObstacleTypes] = useState<AdminObstacleType[]>([]);
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [dialogueNodes, setDialogueNodes] = useState<AdminDialogueNode[]>([]);
  const [selectedNpcId, setSelectedNpcId] = useState<string>("");

  const refresh = async () => {
    const results = await Promise.allSettled([
      adminApi.getPlayers(playerId),
      adminApi.getNpcs(playerId),
      adminApi.getQuests(playerId),
      adminApi.getItems(playerId),
      adminApi.getWeaponTypes(playerId),
      adminApi.getEnemyTypes(playerId),
      adminApi.getWorldCells(playerId),
      adminApi.getSafeZone(playerId),
      adminApi.getMaps(playerId),
      adminApi.getObstacleTypes(playerId),
      adminApi.getLocations(playerId),
    ]);

    const get = <T,>(r: PromiseSettledResult<T>): T =>
      r.status === "fulfilled" ? r.value : ([] as unknown as T);

    setPlayers(get(results[0]));
    setNpcs(get(results[1]));
    setQuests(get(results[2]));
    setItems(get(results[3]));
    setWeaponTypes(get(results[4]));
    setEnemies(get(results[5]));
    setWorldCells(get(results[6]));
    setSafeZone(
      results[7].status === "fulfilled" ? (results[7].value as WorldZone | null) : null,
    );
    setMaps(get(results[8]));
    setObstacleTypes(get(results[9]));
    setLocations(get(results[10]));
  };

  // Initial load
  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    Promise.allSettled([
      adminApi.getPlayers(playerId),
      adminApi.getNpcs(playerId),
      adminApi.getQuests(playerId),
      adminApi.getItems(playerId),
      adminApi.getWeaponTypes(playerId),
      adminApi.getEnemyTypes(playerId),
      adminApi.getWorldCells(playerId),
      adminApi.getSafeZone(playerId),
      adminApi.getMaps(playerId),
      adminApi.getObstacleTypes(playerId),
      adminApi.getLocations(playerId),
    ]).then((results) => {
      if (cancelled) return;
      const get = <T,>(r: PromiseSettledResult<T>): T => r.status === "fulfilled" ? r.value : ([] as unknown as T);
      setPlayers(get(results[0])); setNpcs(get(results[1])); setQuests(get(results[2]));
      setItems(get(results[3])); setWeaponTypes(get(results[4])); setEnemies(get(results[5]));
      setWorldCells(get(results[6]));
      setSafeZone(results[7].status === "fulfilled" ? (results[7].value as WorldZone | null) : null);
      setMaps(get(results[8])); setObstacleTypes(get(results[9])); setLocations(get(results[10]));
    });
    return () => { cancelled = true; };
  }, [playerId]);

  // Reload dialogue nodes when selected NPC changes
  useEffect(() => {
    let cancelled = false;
    if (selectedNpcId && playerId) {
      adminApi.getDialogueNodes(playerId, selectedNpcId)
        .then((nodes) => { if (!cancelled) setDialogueNodes(nodes); })
        .catch(() => { if (!cancelled) setDialogueNodes([]); });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDialogueNodes([]);
    }
    return () => { cancelled = true; };
  }, [playerId, selectedNpcId]);

  return {
    // state
    players, setPlayers,
    npcs, setNpcs,
    quests, setQuests,
    items, setItems,
    weaponTypes, setWeaponTypes,
    enemies, setEnemies,
    worldCells, setWorldCells,
    safeZone, setSafeZone,
    maps, setMaps,
    obstacleTypes, setObstacleTypes,
    locations, setLocations,
    dialogueNodes, setDialogueNodes,
    selectedNpcId, setSelectedNpcId,
    // actions
    refresh,
  };
}
