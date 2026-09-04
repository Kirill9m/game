"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { adminApi } from "@/services/adminApi";
import { playerApi } from "@/services/playerApi";
import type {
  AdminDialogueNode,
  AdminEnemyType,
  AdminGameMap,
  AdminItem,
  AdminNpc,
  AdminObstacleType,
  AdminPlayer,
  AdminQuest,
  AdminWeaponType,
  AdminWorldCell,
  EnemyLootDropPayload,
} from "@/types/admin";
import type { WorldZone } from "@/types/game";

interface Props {
  playerId: string;
}

type Section =
  | "quests"
  | "dialogues"
  | "items"
  | "weapons"
  | "enemies"
  | "players"
  | "world"
  | "maps"
  | "obstacles";

// --- World map (admin cell editor): big map, movable viewport ---
// Matches the game world (WorldConstants): 1000×1000 cells, negative allowed.
const WORLD_SIZE = 1000; // total map cells per side
const WORLD_MIN = -500; // lowest coordinate (negative coordinates are valid)
const WORLD_MAX = WORLD_MIN + WORLD_SIZE - 1; // 499
const VIEW_SIZE = 10; // visible window per side
const VIEW_HALF = Math.floor(VIEW_SIZE / 2);

interface ChoiceDraft {
  text: string;
  nextNodeId: string;
}

const inputClass =
  "w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500";
const labelClass = "block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1";
const primaryBtn =
  "bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-lg transition";
const dangerBtn =
  "bg-red-950 hover:bg-red-800 border border-red-800 text-red-200 text-[10px] font-bold px-2 py-1 rounded-lg transition";

export default function AdminPanel({ playerId }: Props) {
  const [section, setSection] = useState<Section>("quests");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

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
  const [selectedNpcId, setSelectedNpcId] = useState<string>("");
  const [nodesData, setNodesData] = useState<{ npcId: string; nodes: AdminDialogueNode[] }>({
    npcId: "",
    nodes: [],
  });

  // --- Quest form state ---
  const [questCode, setQuestCode] = useState("");
  const [questTitle, setQuestTitle] = useState("");
  const [questGold, setQuestGold] = useState(50);
  const [questExp, setQuestExp] = useState(100);
  const [questItemCode, setQuestItemCode] = useState("RANDOM");
  const [questNpcIds, setQuestNpcIds] = useState<string[]>([]);

  // --- NPC form state ---
  const [npcCode, setNpcCode] = useState("");
  const [npcName, setNpcName] = useState("");
  const [npcX, setNpcX] = useState(0);
  const [npcY, setNpcY] = useState(0);

  // --- Dialogue node form state ---
  const [nodeText, setNodeText] = useState("");
  const [nodeIsStart, setNodeIsStart] = useState(false);
  const [nodeChoices, setNodeChoices] = useState<ChoiceDraft[]>([]);

  // --- Item form state ---
  const [itemCode, setItemCode] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemType, setItemType] = useState("WEAPON");
  const [itemDamage, setItemDamage] = useState(5);
  const [itemRange, setItemRange] = useState(1);
  const [itemWidth, setItemWidth] = useState(1);
  const [itemHeight, setItemHeight] = useState(1);
  const [itemWeaponType, setItemWeaponType] = useState("");

  // --- Weapon type form state ---
  const [wtCode, setWtCode] = useState("");
  const [wtName, setWtName] = useState("");
  const [wtAccPerLevel, setWtAccPerLevel] = useState(5);
  const [wtMaxAcc, setWtMaxAcc] = useState(25);
  const [editingWtId, setEditingWtId] = useState<string>("");

  // --- Player weapon proficiency state ---
  const [proficiencyTargetId, setProficiencyTargetId] = useState<string>("");
  const [profDrafts, setProfDrafts] = useState<Record<string, number>>({});

  // --- Enemy form state ---
  const [enemyCode, setEnemyCode] = useState("");
  const [enemyName, setEnemyName] = useState("");
  const [enemyHealth, setEnemyHealth] = useState(40);
  const [enemyDamage, setEnemyDamage] = useState(6);
  const [enemyRange, setEnemyRange] = useState(1);
  const [enemyAp, setEnemyAp] = useState(3);
  const [enemyMove, setEnemyMove] = useState(2);
  const [enemyDifficulty, setEnemyDifficulty] = useState(1);
  // Loot drop rows for the "Create enemy" form.
  const [enemyLootRows, setEnemyLootRows] = useState<EnemyLootDropPayload[]>([]);
  // Inline loot-table editor for an existing enemy card.
  const [lootEditEnemyId, setLootEditEnemyId] = useState<string | null>(null);
  const [lootEditRows, setLootEditRows] = useState<EnemyLootDropPayload[]>([]);

  // --- World cell form state ---
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cellBlocked, setCellBlocked] = useState(false);
  const [cellRadiation, setCellRadiation] = useState(0);
  const [cellAmbush, setCellAmbush] = useState(0);
  const [cellEnemyId, setCellEnemyId] = useState<string>("");
  const [cellObstacleIds, setCellObstacleIds] = useState<string[]>([]);

  // --- Map form state ---
  const [mapCode, setMapCode] = useState("");
  const [mapName, setMapName] = useState("");
  const [mapDesc, setMapDesc] = useState("");
  const [mapX, setMapX] = useState(0);
  const [mapY, setMapY] = useState(0);
  const [mapRadius, setMapRadius] = useState(4);
  const [mapItemCode, setMapItemCode] = useState("WORLD_MAP");
  const [editingMapId, setEditingMapId] = useState<string>("");

  // --- Obstacle type form state ---
  const [obstacleCode, setObstacleCode] = useState("");
  const [obstacleName, setObstacleName] = useState("");
  const [obstacleHealth, setObstacleHealth] = useState(30);
  const [editingObstacleId, setEditingObstacleId] = useState<string>("");

  // --- World map navigation state ---
  const [viewOrigin, setViewOrigin] = useState({ x: 0, y: 0 });
  const [jumpX, setJumpX] = useState(0);
  const [jumpY, setJumpY] = useState(0);
  const miniMapRef = useRef<HTMLDivElement>(null);

  // --- Player edit state ---
  const [editingPlayerId, setEditingPlayerId] = useState<string>("");
  const [playerDraft, setPlayerDraft] = useState({
    username: "",
    level: 1,
    gold: 0,
    health: 100,
    strength: 5,
    agility: 5,
    stamina: 10,
    energy: 10,
  });

  const run = useCallback(
    async (action: () => Promise<void>, okMessage?: string) => {
      setError("");
      setNotice("");
      setBusy(true);
      try {
        await action();
        if (okMessage) setNotice(okMessage);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const loadAll = useCallback(async () => {
    const [p, n, q, i, wt, e, w, m, ot] = await Promise.all([
      adminApi.getPlayers(playerId),
      adminApi.getNpcs(playerId),
      adminApi.getQuests(playerId),
      adminApi.getItems(playerId),
      adminApi.getWeaponTypes(playerId),
      adminApi.getEnemyTypes(playerId),
      adminApi.getWorldCells(playerId),
      adminApi.getMaps(playerId),
      adminApi.getObstacleTypes(playerId),
    ]);
    setPlayers(p);
    setNpcs(n);
    setQuests(q);
    setItems(i);
    setWeaponTypes(wt);
    setEnemies(e);
    setWorldCells(w);
    setMaps(m);
    setObstacleTypes(ot);
    setSelectedNpcId((current) => current || n[0]?.id || "");
  }, [playerId]);

  // Initial data load (setState happens in promise callbacks, not synchronously)
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      adminApi.getPlayers(playerId),
      adminApi.getNpcs(playerId),
      adminApi.getQuests(playerId),
      adminApi.getItems(playerId),
      adminApi.getWeaponTypes(playerId),
      adminApi.getEnemyTypes(playerId),
      adminApi.getWorldCells(playerId),
      adminApi.getMaps(playerId),
      adminApi.getObstacleTypes(playerId),
      playerApi.getSafeZone().catch(() => null),
    ])
      .then(([p, n, q, i, wt, e, w, m, ot, zone]) => {
        if (cancelled) return;
        setPlayers(p);
        setNpcs(n);
        setQuests(q);
        setItems(i);
        setWeaponTypes(wt);
        setEnemies(e);
        setWorldCells(w);
        setMaps(m);
        setObstacleTypes(ot);
        setSafeZone(zone);
        setSelectedNpcId((current) => current || n[0]?.id || "");
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load admin data");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const loadNodes = useCallback(async () => {
    if (!selectedNpcId) {
      setNodesData({ npcId: "", nodes: [] });
      return;
    }
    try {
      const result = await adminApi.getDialogueNodes(playerId, selectedNpcId);
      setNodesData({ npcId: selectedNpcId, nodes: result });
    } catch {
      setNodesData({ npcId: selectedNpcId, nodes: [] });
    }
  }, [playerId, selectedNpcId]);

  // Dialogue nodes for the selected NPC
  useEffect(() => {
    if (!selectedNpcId) return;
    let cancelled = false;
    adminApi
      .getDialogueNodes(playerId, selectedNpcId)
      .then((result) => {
        if (!cancelled) setNodesData({ npcId: selectedNpcId, nodes: result });
      })
      .catch(() => {
        if (!cancelled) setNodesData({ npcId: selectedNpcId, nodes: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [playerId, selectedNpcId]);

  const refreshAfterChange = useCallback(async () => {
    await loadAll();
    await loadNodes();
  }, [loadAll, loadNodes]);

  const nodes = nodesData.npcId === selectedNpcId ? nodesData.nodes : [];

  // --- Handlers ---

  const handleGenerateQuest = (createNewNpc: boolean) =>
    run(async () => {
      const quest = await adminApi.generateQuest(playerId, createNewNpc);
      await refreshAfterChange();
      setNotice(`Generated quest "${quest.title}" (${quest.code})`);
    });

  const handleCreateQuest = () =>
    run(async () => {
      if (!questCode.trim() || !questTitle.trim()) {
        throw new Error("Quest code and title are required");
      }
      if (questNpcIds.length === 0) {
        throw new Error("Select at least one required NPC");
      }
      await adminApi.createQuest(playerId, {
        code: questCode.trim(),
        title: questTitle.trim(),
        rewardExp: questExp,
        rewardGold: questGold,
        rewardItemCode: questItemCode,
        requiredNpcIds: questNpcIds,
      });
      setQuestCode("");
      setQuestTitle("");
      setQuestNpcIds([]);
      await refreshAfterChange();
      setNotice("Quest created");
    });

  const handleDeleteQuest = (questId: string) =>
    run(async () => {
      await adminApi.deleteQuest(playerId, questId);
      await refreshAfterChange();
      setNotice("Quest deleted");
    });

  const handleCreateNpc = () =>
    run(async () => {
      if (!npcCode.trim() || !npcName.trim()) {
        throw new Error("NPC code and name are required");
      }
      await adminApi.createNpc(playerId, {
        code: npcCode.trim(),
        name: npcName.trim(),
        positionX: npcX,
        positionY: npcY,
      });
      setNpcCode("");
      setNpcName("");
      await refreshAfterChange();
      setNotice("NPC created");
    });

  const handleDeleteNpc = (npcId: string) =>
    run(async () => {
      await adminApi.deleteNpc(playerId, npcId);
      if (selectedNpcId === npcId) setSelectedNpcId("");
      await refreshAfterChange();
      setNotice("NPC deleted");
    });

  const handleCreateNode = () =>
    run(async () => {
      if (!selectedNpcId) throw new Error("Select an NPC first");
      if (!nodeText.trim()) throw new Error("Dialogue text is required");
      await adminApi.createDialogueNode(playerId, {
        npcId: selectedNpcId,
        text: nodeText.trim(),
        isStart: nodeIsStart,
        choices: nodeChoices
          .filter((c) => c.text.trim())
          .map((c) => ({ text: c.text.trim(), nextNodeId: c.nextNodeId || null })),
      });
      setNodeText("");
      setNodeIsStart(false);
      setNodeChoices([]);
      await refreshAfterChange();
      setNotice("Dialogue node added");
    });

  const handleSetStart = (nodeId: string) =>
    run(async () => {
      await adminApi.setStartNode(playerId, nodeId);
      await loadNodes();
      setNotice("Start node updated");
    });

  const handleDeleteNode = (nodeId: string) =>
    run(async () => {
      await adminApi.deleteDialogueNode(playerId, nodeId);
      await refreshAfterChange();
      setNotice("Dialogue node deleted");
    });

  const handleSetRole = (targetPlayerId: string, role: "ADMIN" | "PLAYER") =>
    run(async () => {
      await adminApi.setPlayerRole(playerId, targetPlayerId, role);
      await loadAll();
      setNotice(`Role updated to ${role}`);
    });

  const handleGenerateItem = () =>
    run(async () => {
      const item = await adminApi.generateItem(playerId);
      await loadAll();
      setNotice(`Generated item "${item.name}" (${item.code})`);
    });

  const handleCreateItem = () =>
    run(async () => {
      if (!itemCode.trim() || !itemName.trim()) {
        throw new Error("Item code and name are required");
      }
      await adminApi.createItem(playerId, {
        code: itemCode.trim(),
        name: itemName.trim(),
        type: itemType,
        weaponTypeCode: itemType === "WEAPON" && itemWeaponType ? itemWeaponType : null,
        damage: itemDamage,
        attackRange: itemRange,
        width: itemWidth,
        height: itemHeight,
      });
      setItemCode("");
      setItemName("");
      await loadAll();
      setNotice("Item created");
    });

  const handleDeleteItem = (itemId: string) =>
    run(async () => {
      await adminApi.deleteItem(playerId, itemId);
      await loadAll();
      setNotice("Item deleted");
    });

  // --- Weapon type handlers ---

  const resetWeaponTypeForm = () => {
    setWtCode("");
    setWtName("");
    setWtAccPerLevel(5);
    setWtMaxAcc(25);
    setEditingWtId("");
  };

  const handleStartEditWeaponType = (weaponType: AdminWeaponType) => {
    setEditingWtId(weaponType.id);
    setWtCode(weaponType.code);
    setWtName(weaponType.name);
    setWtAccPerLevel(weaponType.accuracyPerLevel);
    setWtMaxAcc(weaponType.maxAccuracy);
  };

  const handleSaveWeaponType = () =>
    run(async () => {
      if (!wtCode.trim() || !wtName.trim()) {
        throw new Error("Weapon type code and name are required");
      }
      if (editingWtId) {
        await adminApi.updateWeaponType(playerId, editingWtId, {
          name: wtName.trim(),
          accuracyPerLevel: wtAccPerLevel,
          maxAccuracy: wtMaxAcc,
        });
        setNotice("Weapon type updated");
      } else {
        await adminApi.createWeaponType(playerId, {
          code: wtCode.trim(),
          name: wtName.trim(),
          accuracyPerLevel: wtAccPerLevel,
          maxAccuracy: wtMaxAcc,
        });
        setNotice("Weapon type created");
      }
      resetWeaponTypeForm();
      await loadAll();
    });

  const handleDeleteWeaponType = (weaponTypeId: string) =>
    run(async () => {
      await adminApi.deleteWeaponType(playerId, weaponTypeId);
      await loadAll();
      setNotice("Weapon type deleted");
    });

  // --- Player weapon proficiency handlers ---

  const openProficiencyEditor = (player: AdminPlayer) => {
    setProficiencyTargetId(player.id);
    const drafts: Record<string, number> = {};
    weaponTypes.forEach((weaponType) => {
      const existing = (player.proficiencies ?? []).find(
        (p) => p.weaponTypeCode === weaponType.code,
      );
      drafts[weaponType.code] = existing?.level ?? 0;
    });
    setProfDrafts(drafts);
  };

  const handleSaveProficiency = (weaponTypeCode: string) =>
    run(async () => {
      if (!proficiencyTargetId) return;
      await adminApi.setPlayerProficiency(playerId, proficiencyTargetId, {
        weaponTypeCode,
        level: Math.max(0, profDrafts[weaponTypeCode] ?? 0),
      });
      setNotice("Proficiency saved");
      await loadAll();
    });

  const handleCloseProficiency = () => {
    setProficiencyTargetId("");
    setProfDrafts({});
  };

  const handleGenerateEnemy = () =>
    run(async () => {
      const enemy = await adminApi.generateEnemy(playerId, enemyDifficulty);
      await loadAll();
      setNotice(`Generated enemy "${enemy.name}" (${enemy.code})`);
    });

  const handleCreateEnemy = () =>
    run(async () => {
      if (!enemyCode.trim() || !enemyName.trim()) {
        throw new Error("Enemy code and name are required");
      }
      await adminApi.createEnemyType(playerId, {
        code: enemyCode.trim(),
        name: enemyName.trim(),
        maxHealth: enemyHealth,
        damage: enemyDamage,
        attackRange: enemyRange,
        actionPoints: enemyAp,
        movementRange: enemyMove,
        lootDrops: enemyLootRows.filter(
          (row) => row.itemCode && row.chance > 0,
        ),
      });
      setEnemyCode("");
      setEnemyName("");
      setEnemyLootRows([]);
      await loadAll();
      setNotice("Enemy type created");
    });

  const openEnemyLootEditor = (enemy: AdminEnemyType) => {
    setLootEditEnemyId(enemy.id);
    setLootEditRows(
      (enemy.lootDrops ?? []).map((drop) => ({
        itemCode: drop.itemCode,
        chance: drop.chance,
        minQuantity: drop.minQuantity,
        maxQuantity: drop.maxQuantity,
      })),
    );
  };

  const handleSaveEnemyLoot = (enemyId: string) =>
    run(async () => {
      await adminApi.updateEnemyType(playerId, enemyId, {
        lootDrops: lootEditRows.filter(
          (row) => row.itemCode && row.chance > 0,
        ),
      });
      setLootEditEnemyId(null);
      setLootEditRows([]);
      await loadAll();
      setNotice("Enemy loot table saved");
    });

  const addLootRow = (
    rows: EnemyLootDropPayload[],
    setRows: (rows: EnemyLootDropPayload[]) => void,
  ) => {
    const firstItem = items.find((item) => item.type === "WEAPON");
    setRows([
      ...rows,
      {
        itemCode: firstItem?.code ?? items[0]?.code ?? "",
        chance: 50,
        minQuantity: 1,
        maxQuantity: 1,
      },
    ]);
  };

  const updateLootRow = (
    rows: EnemyLootDropPayload[],
    setRows: (rows: EnemyLootDropPayload[]) => void,
    index: number,
    patch: Partial<EnemyLootDropPayload>,
  ) => {
    setRows(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  };

  const removeLootRow = (
    rows: EnemyLootDropPayload[],
    setRows: (rows: EnemyLootDropPayload[]) => void,
    index: number,
  ) => {
    setRows(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleDeleteEnemy = (enemyId: string) =>
    run(async () => {
      await adminApi.deleteEnemyType(playerId, enemyId);
      await loadAll();
      setNotice("Enemy type deleted");
    });

  // --- World cell handlers ---

  const handleSelectCell = (x: number, y: number) => {
    setSelectedCell({ x, y });
    const existing = worldCells.find(
      (c) => c.positionX === x && c.positionY === y,
    );
    setCellBlocked(existing?.blocked ?? false);
    setCellRadiation(existing?.radiation ?? 0);
    setCellAmbush(existing?.ambushChance ?? 0);
    setCellEnemyId(existing?.enemyType?.id ?? "");
    setCellObstacleIds(
      existing?.obstacleTypes?.map((obstacle) => obstacle.id) ?? [],
    );
  };

  // World map navigation helpers
  const clampView = (x: number, y: number) => ({
    x: Math.max(WORLD_MIN, Math.min(WORLD_MAX - VIEW_SIZE + 1, x)),
    y: Math.max(WORLD_MIN, Math.min(WORLD_MAX - VIEW_SIZE + 1, y)),
  });

  const moveView = (dx: number, dy: number) =>
    setViewOrigin((origin) => clampView(origin.x + dx, origin.y + dy));

  // Center the camera on a cell (and select it for editing)
  const jumpToCell = (x: number, y: number) => {
    const cx = Math.max(WORLD_MIN, Math.min(WORLD_MAX, x));
    const cy = Math.max(WORLD_MIN, Math.min(WORLD_MAX, y));
    setJumpX(cx);
    setJumpY(cy);
    setViewOrigin(clampView(cx - VIEW_HALF, cy - VIEW_HALF));
    handleSelectCell(cx, cy);
  };

  // Mini-map click → move the camera to the chosen point
  const handleMiniMapClick = (event: MouseEvent<HTMLDivElement>) => {
    const rect = miniMapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x =
      Math.floor(((event.clientX - rect.left) / rect.width) * WORLD_SIZE) +
      WORLD_MIN;
    const y =
      Math.floor(((rect.bottom - event.clientY) / rect.height) * WORLD_SIZE) +
      WORLD_MIN;
    jumpToCell(x, y);
  };

  const handleSaveCell = () =>
    run(async () => {
      if (cellEnemyId && cellAmbush <= 0) {
        throw new Error("Ambush chance must be above 0 when an enemy is selected");
      }
      const saved = await adminApi.upsertWorldCell(playerId, {
        positionX: selectedCell.x,
        positionY: selectedCell.y,
        blocked: cellBlocked,
        radiation: cellRadiation,
        ambushChance: cellEnemyId ? cellAmbush : 0,
        enemyTypeId: cellEnemyId || null,
        obstacleTypeIds: cellObstacleIds,
      });
      await loadAll();
      setNotice(
        `Cell [${saved.positionX}:${saved.positionY}] saved`,
      );
    });

  const toggleCellObstacle = (obstacleTypeId: string) => {
    setCellObstacleIds((current) =>
      current.includes(obstacleTypeId)
        ? current.filter((id) => id !== obstacleTypeId)
        : [...current, obstacleTypeId],
    );
  };

  const handleDeleteCell = (cellId: string) =>
    run(async () => {
      await adminApi.deleteWorldCell(playerId, cellId);
      await loadAll();
      setNotice("Cell settings removed");
    });

  // --- Map handlers ---

  const resetMapForm = () => {
    setMapCode("");
    setMapName("");
    setMapDesc("");
    setMapX(0);
    setMapY(0);
    setMapRadius(4);
    setMapItemCode("WORLD_MAP");
    setEditingMapId("");
  };

  const handleStartEditMap = (map: AdminGameMap) => {
    setEditingMapId(map.id);
    setMapCode(map.code);
    setMapName(map.name);
    setMapDesc(map.description ?? "");
    setMapX(map.centerX);
    setMapY(map.centerY);
    setMapRadius(map.radius);
    setMapItemCode(map.itemCode);
  };

  const handleSaveMap = () =>
    run(async () => {
      if (!mapCode.trim() || !mapName.trim() || !mapItemCode.trim()) {
        throw new Error("Map code, name and item code are required");
      }
      const payload = {
        code: mapCode.trim(),
        name: mapName.trim(),
        description: mapDesc.trim() || null,
        centerX: mapX,
        centerY: mapY,
        radius: mapRadius,
        itemCode: mapItemCode.trim().toUpperCase(),
      };
      if (editingMapId) {
        await adminApi.updateMap(playerId, editingMapId, payload);
        setNotice(`Map "${payload.name}" updated`);
      } else {
        await adminApi.createMap(playerId, payload);
        setNotice(`Map "${payload.name}" created`);
      }
      resetMapForm();
      await loadAll();
    });

  const handleDeleteMap = (mapId: string) =>
    run(async () => {
      await adminApi.deleteMap(playerId, mapId);
      if (editingMapId === mapId) resetMapForm();
      await loadAll();
      setNotice("Map deleted");
    });

  const resetObstacleForm = () => {
    setObstacleCode("");
    setObstacleName("");
    setObstacleHealth(30);
    setEditingObstacleId("");
  };

  const handleStartEditObstacle = (obstacle: AdminObstacleType) => {
    setEditingObstacleId(obstacle.id);
    setObstacleCode(obstacle.code);
    setObstacleName(obstacle.name);
    setObstacleHealth(obstacle.maxHealth);
  };

  const handleSaveObstacle = () =>
    run(async () => {
      if (!obstacleCode.trim() || !obstacleName.trim()) {
        throw new Error("Obstacle code and name are required");
      }
      if (editingObstacleId) {
        await adminApi.updateObstacleType(playerId, editingObstacleId, {
          name: obstacleName.trim(),
          maxHealth: obstacleHealth,
        });
        setNotice("Obstacle type updated");
      } else {
        await adminApi.createObstacleType(playerId, {
          code: obstacleCode.trim().toUpperCase(),
          name: obstacleName.trim(),
          maxHealth: obstacleHealth,
        });
        setNotice("Obstacle type created");
      }
      resetObstacleForm();
      await loadAll();
    });

  const handleDeleteObstacle = (obstacleTypeId: string) =>
    run(async () => {
      await adminApi.deleteObstacleType(playerId, obstacleTypeId);
      if (editingObstacleId === obstacleTypeId) resetObstacleForm();
      await loadAll();
      setNotice("Obstacle type deleted");
    });

  const handleStartEditPlayer = (player: AdminPlayer) => {
    setEditingPlayerId(player.id);
    setPlayerDraft({
      username: player.username ?? "",
      level: player.level,
      gold: player.gold,
      health: 100,
      strength: 5,
      agility: 5,
      stamina: 10,
      energy: 10,
    });
  };

  const handleSavePlayer = (targetPlayerId: string) =>
    run(async () => {
      await adminApi.updatePlayer(playerId, targetPlayerId, playerDraft);
      setEditingPlayerId("");
      await loadAll();
      setNotice("Player updated");
    });

  const handleDeletePlayer = (targetPlayerId: string) =>
    run(async () => {
      if (targetPlayerId === playerId) {
        throw new Error("You cannot delete your own account");
      }
      await adminApi.deletePlayer(playerId, targetPlayerId);
      if (editingPlayerId === targetPlayerId) setEditingPlayerId("");
      await loadAll();
      setNotice("Player deleted");
    });

  const selectedNpc = npcs.find((n) => n.id === selectedNpcId);
  const nodeNameById = new Map(npcs.map((n) => [n.id, n.name]));

  return (
    <div className="flex flex-col gap-3 text-gray-200">
      {/* Section switcher */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
            {(
              [
                { id: "quests", icon: "🎲", label: "Quest Generator" },
                { id: "dialogues", icon: "💬", label: "Dialogues" },
                { id: "items", icon: "⚔️", label: "Items" },
                { id: "weapons", icon: "🔫", label: "Weapon Types" },
                { id: "enemies", icon: "👹", label: "Enemies" },
                { id: "world", icon: "🗺️", label: "World Cells" },
                { id: "maps", icon: "🧭", label: "Maps" },
                { id: "obstacles", icon: "🧱", label: "Obstacles" },
                { id: "players", icon: "🛡️", label: "Players" },
              ] as const
            ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                section === tab.id
                  ? "border-purple-500 bg-purple-950/60 text-purple-200"
                  : "border-gray-800 bg-gray-800/40 text-gray-400 hover:bg-gray-800"
              }`}
            >
              <span>{tab.icon}</span>
              <span className="text-xs font-bold">{tab.label}</span>
            </button>
          ))}
        </div>
        <span className="text-[10px] text-gray-500 font-mono">ADMIN PANEL</span>
      </div>

      {error && (
        <div className="bg-red-950/80 border border-red-800 text-red-200 px-3 py-2 rounded-xl text-xs">
          {error}
        </div>
      )}
      {notice && (
        <div className="bg-green-950/60 border border-green-800 text-green-200 px-3 py-2 rounded-xl text-xs">
          {notice}
        </div>
      )}

      {/* ================= QUEST GENERATOR ================= */}
      {section === "quests" && (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-900 border border-purple-900/60 rounded-xl p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                🎲 Random Quest Generator
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Creates a quest with a random title, random gold/exp rewards, a random set of
              required NPCs and starter dialogues for NPCs that have none.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleGenerateQuest(false)}
                className={primaryBtn}
              >
                🎲 Generate Quest
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleGenerateQuest(true)}
                className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                🧙 Generate + New NPC
              </button>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              ✍️ Create Quest Manually
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Code</label>
                <input
                  className={inputClass}
                  value={questCode}
                  onChange={(e) => setQuestCode(e.target.value.toUpperCase())}
                  placeholder="FIND_THE_MAP"
                />
              </div>
              <div>
                <label className={labelClass}>Title</label>
                <input
                  className={inputClass}
                  value={questTitle}
                  onChange={(e) => setQuestTitle(e.target.value)}
                  placeholder="Find the Lost Map"
                />
              </div>
              <div>
                <label className={labelClass}>Reward gold</label>
                <input
                  type="number"
                  className={inputClass}
                  value={questGold}
                  onChange={(e) => setQuestGold(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>Reward exp (quest points)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={questExp}
                  onChange={(e) => setQuestExp(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Reward item</label>
              <select
                className={inputClass}
                value={questItemCode}
                onChange={(e) => setQuestItemCode(e.target.value)}
              >
                <option value="RANDOM">Random item</option>
                {items.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Required NPCs (talk to all to complete)</label>
              <div className="flex flex-wrap gap-1.5">
                {npcs.map((npc) => {
                  const checked = questNpcIds.includes(npc.id);
                  return (
                    <button
                      key={npc.id}
                      type="button"
                      onClick={() =>
                        setQuestNpcIds((ids) =>
                          checked ? ids.filter((id) => id !== npc.id) : [...ids, npc.id],
                        )
                      }
                      className={`px-2 py-1 rounded-lg border text-[11px] font-semibold transition ${
                        checked
                          ? "border-blue-500 bg-blue-950/60 text-blue-200"
                          : "border-gray-700 bg-gray-800/40 text-gray-400 hover:bg-gray-800"
                      }`}
                    >
                      {checked ? "✓ " : ""}
                      {npc.name}
                    </button>
                  );
                })}
                {npcs.length === 0 && (
                  <span className="text-[11px] text-gray-600">No NPCs yet — create one below.</span>
                )}
              </div>
            </div>
            <button type="button" disabled={busy} onClick={handleCreateQuest} className={primaryBtn}>
              ➕ Create Quest
            </button>
          </div>

          {/* NPC quick create */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              🧍 Quick Add NPC
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Code</label>
                <input
                  className={inputClass}
                  value={npcCode}
                  onChange={(e) => setNpcCode(e.target.value.toUpperCase())}
                  placeholder="FARMER"
                />
              </div>
              <div>
                <label className={labelClass}>Name</label>
                <input
                  className={inputClass}
                  value={npcName}
                  onChange={(e) => setNpcName(e.target.value)}
                  placeholder="Farmer Joe"
                />
              </div>
              <div>
                <label className={labelClass}>Position X</label>
                <input
                  type="number"
                  className={inputClass}
                  value={npcX}
                  onChange={(e) => setNpcX(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>Position Y</label>
                <input
                  type="number"
                  className={inputClass}
                  value={npcY}
                  onChange={(e) => setNpcY(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <button type="button" disabled={busy} onClick={handleCreateNpc} className={primaryBtn}>
              ➕ Create NPC
            </button>
          </div>

          {/* Quest list */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              📜 All Quests ({quests.length})
            </span>
            {quests.map((quest) => (
              <div
                key={quest.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-100 truncate">{quest.title}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{quest.code}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="bg-amber-900/40 border border-amber-800 text-amber-200 px-2 py-0.5 rounded-full text-[10px]">
                      💰 {quest.rewardGold}
                    </span>
                    <span className="bg-blue-900/40 border border-blue-800 text-blue-200 px-2 py-0.5 rounded-full text-[10px]">
                      ⭐ {quest.rewardExp}
                    </span>
                    <span className="bg-purple-900/40 border border-purple-800 text-purple-200 px-2 py-0.5 rounded-full text-[10px]">
                      🎒 {quest.rewardItemCode ?? "none"}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    NPCs:{" "}
                    {quest.requiredNpcs.length > 0
                      ? quest.requiredNpcs.map((n) => n.name).join(", ")
                      : "—"}
                  </div>
                </div>
                <button type="button" disabled={busy} onClick={() => handleDeleteQuest(quest.id)} className={dangerBtn}>
                  🗑 Delete
                </button>
              </div>
            ))}
            {quests.length === 0 && (
              <div className="text-center text-gray-600 text-xs py-4">No quests yet.</div>
            )}
          </div>
        </div>
      )}

      {/* ================= DIALOGUE EDITOR ================= */}
      {section === "dialogues" && (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <label className={labelClass}>NPC</label>
            <div className="flex gap-1.5">
              <select
                className={inputClass}
                value={selectedNpcId}
                onChange={(e) => setSelectedNpcId(e.target.value)}
              >
                <option value="">— Select an NPC —</option>
                {npcs.map((npc) => (
                  <option key={npc.id} value={npc.id}>
                    {npc.name} ({npc.code}) [{npc.positionX}:{npc.positionY}]
                  </option>
                ))}
              </select>
              {selectedNpc && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDeleteNpc(selectedNpc.id)}
                  className={dangerBtn}
                  title="Delete this NPC (detaches it from quests and dialogues)"
                >
                  🗑 Delete NPC
                </button>
              )}
            </div>
          </div>

          {selectedNpc && (
            <>
              {/* Node list */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  💬 Dialogue nodes for {selectedNpc.name} ({nodes.length})
                </span>
                {nodes.map((node) => (
                  <div key={node.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {node.isStart && (
                          <span className="text-[9px] font-bold uppercase bg-green-900/50 border border-green-700 text-green-300 px-1.5 py-0.5 rounded-full mr-1.5">
                            START
                          </span>
                        )}
                        <span className="text-xs text-gray-200">{node.text}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {!node.isStart && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleSetStart(node.id)}
                            className="bg-green-950 hover:bg-green-800 border border-green-800 text-green-200 text-[10px] font-bold px-2 py-1 rounded-lg transition"
                          >
                            ★ Start
                          </button>
                        )}
                        <button type="button" disabled={busy} onClick={() => handleDeleteNode(node.id)} className={dangerBtn}>
                          🗑
                        </button>
                      </div>
                    </div>
                    {node.choices.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1 border-t border-gray-800 pt-2">
                        {node.choices.map((choice) => (
                          <div key={choice.id} className="text-[11px] text-gray-400 flex gap-1.5">
                            <span className="text-blue-400">→</span>
                            <span className="text-gray-300">{choice.text}</span>
                            <span className="text-gray-600">
                              {choice.nextNodeId
                                ? `(goes to: ${nodeNameById.get(choice.nextNodeId) ?? "node"})`
                                : "(ends dialogue)"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {nodes.length === 0 && (
                  <div className="text-center text-gray-600 text-xs py-3">
                    No dialogue yet — add the first node below.
                  </div>
                )}
              </div>

              {/* Add node form */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  ➕ Add Dialogue Node
                </span>
                <div>
                  <label className={labelClass}>NPC text</label>
                  <textarea
                    className={`${inputClass} min-h-[60px]`}
                    value={nodeText}
                    onChange={(e) => setNodeText(e.target.value)}
                    placeholder="Greetings, traveler! I have a task for you..."
                  />
                </div>
                <label className="flex items-center gap-2 text-[11px] text-gray-400">
                  <input
                    type="checkbox"
                    checked={nodeIsStart}
                    onChange={(e) => setNodeIsStart(e.target.checked)}
                    className="accent-blue-500"
                  />
                  Make this the start node (players begin here)
                </label>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Player choices</label>
                  {nodeChoices.map((choice, idx) => (
                    <div key={idx} className="flex gap-1.5">
                      <input
                        className={inputClass}
                        value={choice.text}
                        onChange={(e) =>
                          setNodeChoices((cs) =>
                            cs.map((c, i) => (i === idx ? { ...c, text: e.target.value } : c)),
                          )
                        }
                        placeholder="Choice text"
                      />
                      <select
                        className={`${inputClass} max-w-[140px]`}
                        value={choice.nextNodeId}
                        onChange={(e) =>
                          setNodeChoices((cs) =>
                            cs.map((c, i) => (i === idx ? { ...c, nextNodeId: e.target.value } : c)),
                          )
                        }
                      >
                        <option value="">End dialogue</option>
                        {nodes.map((n) => (
                          <option key={n.id} value={n.id}>
                            → {n.text.slice(0, 24)}...
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setNodeChoices((cs) => cs.filter((_, i) => i !== idx))}
                        className={dangerBtn}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNodeChoices((cs) => [...cs, { text: "", nextNodeId: "" }])}
                    className="self-start text-[11px] font-bold text-blue-400 hover:text-blue-300 transition"
                  >
                    + Add choice
                  </button>
                  <span className="text-[10px] text-gray-600">
                    Choices can link to existing nodes or end the dialogue. Ending a
                    dialogue counts as talking to the NPC for quest progress.
                  </span>
                </div>

                <button type="button" disabled={busy} onClick={handleCreateNode} className={primaryBtn}>
                  ➕ Add Node
                </button>
              </div>
            </>
          )}

          {!selectedNpc && npcs.length === 0 && (
            <div className="text-center text-gray-600 text-xs py-6">
              No NPCs exist yet — create one in the Quest Generator tab.
            </div>
          )}
        </div>
      )}

{/* ================= ITEMS ================= */}
      {section === "items" && (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                ⚔️ Items — {items.length} defined
              </span>
            </div>
            <button type="button" disabled={busy} onClick={handleGenerateItem} className={primaryBtn}>
              🎲 Generate Random Item
            </button>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              ✍️ Create Item Manually
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Code</label>
                <input
                  className={inputClass}
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                  placeholder="PISTOL"
                />
              </div>
              <div>
                <label className={labelClass}>Name</label>
                <input
                  className={inputClass}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Pistol"
                />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select
                  className={inputClass}
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value)}
                >
                  <option value="WEAPON">WEAPON</option>
                  <option value="ARMOR">ARMOR</option>
                  <option value="UTILITY">UTILITY</option>
                </select>
              </div>
              {itemType === "WEAPON" && (
                <div>
                  <label className={labelClass}>Weapon type</label>
                  <select
                    className={inputClass}
                    value={itemWeaponType}
                    onChange={(e) => setItemWeaponType(e.target.value)}
                  >
                    <option value="">— none —</option>
                    {weaponTypes.map((weaponType) => (
                      <option key={weaponType.code} value={weaponType.code}>
                        {weaponType.code}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={labelClass}>Damage</label>
                <input
                  type="number"
                  className={inputClass}
                  value={itemDamage}
                  onChange={(e) => setItemDamage(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>Attack range</label>
                <input
                  type="number"
                  className={inputClass}
                  value={itemRange}
                  onChange={(e) => setItemRange(Number(e.target.value) || 0)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Width</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={itemWidth}
                    onChange={(e) => setItemWidth(Number(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Height</label>
                  <input
                    type="number"
                    className={inputClass}
                    value={itemHeight}
                    onChange={(e) => setItemHeight(Number(e.target.value) || 1)}
                  />
                </div>
              </div>
            </div>
            <button type="button" disabled={busy} onClick={handleCreateItem} className={primaryBtn}>
              ➕ Create Item
            </button>
          </div>

          {/* Item list */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              📦 All Items ({items.length})
            </span>
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-100 truncate">{item.name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{item.code}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="bg-purple-900/40 border border-purple-800 text-purple-200 px-2 py-0.5 rounded-full text-[10px]">
                      {item.type}
                    </span>
                    {item.weaponTypeCode && (
                      <span className="bg-cyan-900/40 border border-cyan-800 text-cyan-200 px-2 py-0.5 rounded-full text-[10px]">
                        🔫 {item.weaponTypeCode}
                      </span>
                    )}
                    <span className="bg-red-900/40 border border-red-800 text-red-200 px-2 py-0.5 rounded-full text-[10px]">
                      ⚔️ {item.damage}
                    </span>
                    <span className="bg-blue-900/40 border border-blue-800 text-blue-200 px-2 py-0.5 rounded-full text-[10px]">
                      🎯 {item.attackRange}
                    </span>
                    <span className="bg-gray-800/60 border border-gray-700 text-gray-300 px-2 py-0.5 rounded-full text-[10px]">
                      {item.width}×{item.height}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDeleteItem(item.id)}
                  className={dangerBtn}
                >
                  🗑 Delete
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center text-gray-600 text-xs py-4">No items yet.</div>
            )}
          </div>
        </div>
      )}
{/* ================= WEAPON TYPES ================= */}
      {section === "weapons" && (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-900 border border-cyan-900/50 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
              🔫 Weapon Types — {weaponTypes.length} defined
            </span>
            <p className="text-[11px] text-gray-500">
              Each weapon type has an accuracy bonus per proficiency level and a maximum
              accuracy bonus. A character’s proficiency in a type raises their hit chance
              in combat (set it in the Players tab).
            </p>
            {editingWtId && (
              <span className="text-[10px] text-cyan-200 font-mono">
                Editing: {wtCode}
              </span>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Code</label>
                <input
                  className={inputClass}
                  value={wtCode}
                  onChange={(e) => setWtCode(e.target.value.toUpperCase())}
                  placeholder="PISTOL"
                />
              </div>
              <div>
                <label className={labelClass}>Name</label>
                <input
                  className={inputClass}
                  value={wtName}
                  onChange={(e) => setWtName(e.target.value)}
                  placeholder="Pistol"
                />
              </div>
              <div>
                <label className={labelClass}>Accuracy per level</label>
                <input
                  type="number"
                  className={inputClass}
                  value={wtAccPerLevel}
                  onChange={(e) => setWtAccPerLevel(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>Max accuracy bonus</label>
                <input
                  type="number"
                  className={inputClass}
                  value={wtMaxAcc}
                  onChange={(e) => setWtMaxAcc(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={handleSaveWeaponType} className={primaryBtn}>
                {editingWtId ? "💾 Save Weapon Type" : "➕ Create Weapon Type"}
              </button>
              {editingWtId && (
                <button type="button" disabled={busy} onClick={resetWeaponTypeForm} className={dangerBtn}>
                  ✖ Cancel
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              🔫 All Weapon Types ({weaponTypes.length})
            </span>
            {weaponTypes.map((weaponType) => (
              <div
                key={weaponType.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-100 truncate">{weaponType.name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{weaponType.code}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="bg-cyan-900/40 border border-cyan-800 text-cyan-200 px-2 py-0.5 rounded-full text-[10px]">
                      🎯 +{weaponType.accuracyPerLevel}/level
                    </span>
                    <span className="bg-blue-900/40 border border-blue-800 text-blue-200 px-2 py-0.5 rounded-full text-[10px]">
                      cap {weaponType.maxAccuracy}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleStartEditWeaponType(weaponType)}
                    className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDeleteWeaponType(weaponType.id)}
                    className={dangerBtn}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
            {weaponTypes.length === 0 && (
              <div className="text-center text-gray-600 text-xs py-4">No weapon types yet.</div>
            )}
          </div>
        </div>
      )}
{/* ================= ENEMY TYPES ================= */}
      {section === "enemies" && (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                👹 Enemies — {enemies.length} defined
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className={labelClass}>Difficulty</label>
              <select
                className={inputClass}
                value={enemyDifficulty}
                onChange={(e) => setEnemyDifficulty(Number(e.target.value) || 1)}
              >
                <option value={1}>1 (weak)</option>
                <option value={2}>2 (medium)</option>
                <option value={3}>3 (boss)</option>
              </select>
              <button type="button" disabled={busy} onClick={handleGenerateEnemy} className={primaryBtn}>
                🎲 Generate Random Enemy
              </button>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              ✍️ Create Enemy Manually
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Code</label>
                <input
                  className={inputClass}
                  value={enemyCode}
                  onChange={(e) => setEnemyCode(e.target.value.toUpperCase())}
                  placeholder="RADROACH"
                />
              </div>
              <div>
                <label className={labelClass}>Name</label>
                <input
                  className={inputClass}
                  value={enemyName}
                  onChange={(e) => setEnemyName(e.target.value)}
                  placeholder="Rad Roach"
                />
              </div>
              <div>
                <label className={labelClass}>Max health</label>
                <input
                  type="number"
                  className={inputClass}
                  value={enemyHealth}
                  onChange={(e) => setEnemyHealth(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>Damage</label>
                <input
                  type="number"
                  className={inputClass}
                  value={enemyDamage}
                  onChange={(e) => setEnemyDamage(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>Attack range</label>
                <input
                  type="number"
                  className={inputClass}
                  value={enemyRange}
                  onChange={(e) => setEnemyRange(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>Action points</label>
                <input
                  type="number"
                  className={inputClass}
                  value={enemyAp}
                  onChange={(e) => setEnemyAp(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>Movement range</label>
                <input
                  type="number"
                  className={inputClass}
                  value={enemyMove}
                  onChange={(e) => setEnemyMove(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Loot drops: what this enemy drops on the combat board when it dies */}
            <div className="mt-2 rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  💰 Loot drops (on death, in combat)
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => addLootRow(enemyLootRows, setEnemyLootRows)}
                  className="rounded-md bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 px-2 py-0.5 text-[10px] font-bold text-emerald-100 transition"
                >
                  ➕ Add
                </button>
              </div>
              {enemyLootRows.map((row, index) => (
                <div
                  key={index}
                  className="mb-1 flex flex-wrap items-end gap-1.5 rounded-md border border-emerald-900/60 bg-black/30 p-1.5"
                >
                  <div className="min-w-[110px] flex-1">
                    <label className={labelClass}>Item</label>
                    <select
                      className={inputClass}
                      value={row.itemCode}
                      onChange={(event) =>
                        updateLootRow(enemyLootRows, setEnemyLootRows, index, {
                          itemCode: event.target.value,
                        })
                      }
                    >
                      <option value="">— select —</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.code}>
                          {item.name} ({item.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-16">
                    <label className={labelClass}>Chance %</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={row.chance}
                      min={0}
                      max={100}
                      onChange={(event) =>
                        updateLootRow(enemyLootRows, setEnemyLootRows, index, {
                          chance:
                            Math.max(0, Math.min(100, Number(event.target.value) || 0)),
                        })
                      }
                    />
                  </div>
                  <div className="w-16">
                    <label className={labelClass}>Min</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={row.minQuantity}
                      min={1}
                      onChange={(event) =>
                        updateLootRow(enemyLootRows, setEnemyLootRows, index, {
                          minQuantity: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                    />
                  </div>
                  <div className="w-16">
                    <label className={labelClass}>Max</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={row.maxQuantity}
                      min={1}
                      onChange={(event) =>
                        updateLootRow(enemyLootRows, setEnemyLootRows, index, {
                          maxQuantity: Math.max(1, Number(event.target.value) || 1),
                        })
                      }
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeLootRow(enemyLootRows, setEnemyLootRows, index)}
                    className="rounded-md bg-red-950 hover:bg-red-800 border border-red-800 px-2 py-1 text-[10px] font-bold text-red-200 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {enemyLootRows.length === 0 && (
                <span className="text-[10px] text-emerald-200/50">
                  No drops — this enemy dies without loot.
                </span>
              )}
            </div>
            <button type="button" disabled={busy} onClick={handleCreateEnemy} className={primaryBtn}>
              ➕ Create Enemy
            </button>
          </div>

          {/* Enemy list */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              👹 All Enemies ({enemies.length})
            </span>
{enemies.map((enemy) => (
              <div
                key={enemy.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-100 truncate">{enemy.name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{enemy.code}</div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="bg-red-900/40 border border-red-800 text-red-200 px-2 py-0.5 rounded-full text-[10px]">
                      ❤️ {enemy.maxHealth}
                    </span>
                    <span className="bg-amber-900/40 border border-amber-800 text-amber-200 px-2 py-0.5 rounded-full text-[10px]">
                      ⚔️ {enemy.damage}
                    </span>
                    <span className="bg-blue-900/40 border border-blue-800 text-blue-200 px-2 py-0.5 rounded-full text-[10px]">
                      🎯 {enemy.attackRange}
                    </span>
                    <span className="bg-yellow-900/40 border border-yellow-800 text-yellow-200 px-2 py-0.5 rounded-full text-[10px]">
                      ⚡ {enemy.actionPoints} AP
                    </span>
                    <span className="bg-green-900/40 border border-green-800 text-green-200 px-2 py-0.5 rounded-full text-[10px]">
                      👣 {enemy.movementRange}
                    </span>
                    </div>
                    {(enemy.lootDrops ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {enemy.lootDrops!.map((drop, dropIndex) => (
                          <span
                            key={`${drop.itemCode}-${dropIndex}`}
                            className="bg-emerald-900/40 border border-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full text-[10px]"
                          >
                            💰 {drop.itemCode} ×{drop.maxQuantity} {drop.chance}%
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        lootEditEnemyId === enemy.id
                          ? setLootEditEnemyId(null)
                          : openEnemyLootEditor(enemy)
                      }
                      className="rounded-md bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 border border-emerald-700 px-2 py-1 text-[10px] font-bold text-emerald-100 transition"
                    >
                      💰 Loot
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleDeleteEnemy(enemy.id)}
                      className={dangerBtn}
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
                {lootEditEnemyId === enemy.id && (
                  <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/20 p-2">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                        💰 Loot table
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => addLootRow(lootEditRows, setLootEditRows)}
                        className="rounded-md bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 px-2 py-0.5 text-[10px] font-bold text-emerald-100 transition"
                      >
                        ➕ Add
                      </button>
                    </div>
                    {lootEditRows.map((row, index) => (
                      <div
                        key={index}
                        className="mb-1 flex flex-wrap items-end gap-1.5 rounded-md border border-emerald-900/60 bg-black/30 p-1.5"
                      >
                        <div className="min-w-[110px] flex-1">
                          <label className={labelClass}>Item</label>
                          <select
                            className={inputClass}
                            value={row.itemCode}
                            onChange={(event) =>
                              updateLootRow(lootEditRows, setLootEditRows, index, {
                                itemCode: event.target.value,
                              })
                            }
                          >
                            <option value="">— select —</option>
                            {items.map((item) => (
                              <option key={item.id} value={item.code}>
                                {item.name} ({item.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-16">
                          <label className={labelClass}>Chance %</label>
                          <input
                            type="number"
                            className={inputClass}
                            value={row.chance}
                            min={0}
                            max={100}
                            onChange={(event) =>
                              updateLootRow(lootEditRows, setLootEditRows, index, {
                                chance:
                                  Math.max(0, Math.min(100, Number(event.target.value) || 0)),
                              })
                            }
                          />
                        </div>
                        <div className="w-16">
                          <label className={labelClass}>Min</label>
                          <input
                            type="number"
                            className={inputClass}
                            value={row.minQuantity}
                            min={1}
                            onChange={(event) =>
                              updateLootRow(lootEditRows, setLootEditRows, index, {
                                minQuantity: Math.max(1, Number(event.target.value) || 1),
                              })
                            }
                          />
                        </div>
                        <div className="w-16">
                          <label className={labelClass}>Max</label>
                          <input
                            type="number"
                            className={inputClass}
                            value={row.maxQuantity}
                            min={1}
                            onChange={(event) =>
                              updateLootRow(lootEditRows, setLootEditRows, index, {
                                maxQuantity: Math.max(1, Number(event.target.value) || 1),
                              })
                            }
                          />
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removeLootRow(lootEditRows, setLootEditRows, index)}
                          className="rounded-md bg-red-950 hover:bg-red-800 border border-red-800 px-2 py-1 text-[10px] font-bold text-red-200 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {lootEditRows.length === 0 && (
                      <span className="text-[10px] text-emerald-200/50">
                        No drops — this enemy dies without loot.
                      </span>
                    )}
                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleSaveEnemyLoot(enemy.id)}
                        className="rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1 text-[10px] font-bold text-white transition"
                      >
                        💾 Save
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setLootEditEnemyId(null);
                          setLootEditRows([]);
                        }}
                        className="rounded-md bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1 text-[10px] font-bold text-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {enemies.length === 0 && (
              <div className="text-center text-gray-600 text-xs py-4">No enemies yet.</div>
            )}
          </div>
        </div>
      )}
      {/* ================= WORLD CELLS ================= */}
      {section === "world" && (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                🗺️ World Cells — click a cell to configure it
              </span>
              <span className="font-mono text-[10px] text-gray-500">
                {WORLD_SIZE}×{WORLD_SIZE} cells ({WORLD_MIN}…
                {WORLD_MAX}) · view [{viewOrigin.x}–
                {viewOrigin.x + VIEW_SIZE - 1}]×[{viewOrigin.y}–
                {viewOrigin.y + VIEW_SIZE - 1}]
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              🚫 blocked (cannot enter) · ☢️ radiation (HP loss per step) · 👹 ambush
              (chance + enemy, only outside the blue safe zone). The map is bigger
              than the window — pan with the arrows, type coordinates, or click the
              overview to jump to a point.
            </p>

            {/* Pan + jump controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Up"
                  onClick={() => moveView(0, 1)}
                  className="h-8 w-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-200 text-xs flex items-center justify-center transition"
                >
                  ▲
                </button>
                <button
                  type="button"
                  title="Left"
                  onClick={() => moveView(-1, 0)}
                  className="h-8 w-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-200 text-xs flex items-center justify-center transition"
                >
                  ◀
                </button>
                <button
                  type="button"
                  title="Back to 0,0"
                  onClick={() => setViewOrigin({ x: 0, y: 0 })}
                  className="h-8 w-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-200 text-xs flex items-center justify-center transition"
                >
                  🏠
                </button>
                <button
                  type="button"
                  title="Right"
                  onClick={() => moveView(1, 0)}
                  className="h-8 w-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-200 text-xs flex items-center justify-center transition"
                >
                  ▶
                </button>
                <button
                  type="button"
                  title="Down"
                  onClick={() => moveView(0, -1)}
                  className="h-8 w-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-200 text-xs flex items-center justify-center transition"
                >
                  ▼
                </button>
              </div>
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  📍 Jump to
                </span>
                <input
                  type="number"
                  min={WORLD_MIN}
                  max={WORLD_MAX}
                  className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
                  value={jumpX}
                  onChange={(e) =>
                    setJumpX(
                      Math.max(WORLD_MIN, Math.min(WORLD_MAX, Number(e.target.value) || 0)),
                    )
                  }
                />
                <span className="text-xs text-gray-500">:</span>
                <input
                  type="number"
                  min={WORLD_MIN}
                  max={WORLD_MAX}
                  className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
                  value={jumpY}
                  onChange={(e) =>
                    setJumpY(
                      Math.max(WORLD_MIN, Math.min(WORLD_MAX, Number(e.target.value) || 0)),
                    )
                  }
                />
                <button type="button" disabled={busy} onClick={() => jumpToCell(jumpX, jumpY)} className={primaryBtn}>
                  Go
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              {/* Main viewport (camera window) */}
              <div className="flex flex-col items-center gap-1 w-full max-w-[320px]">
                <div className="w-full aspect-square overflow-hidden rounded-md border border-gray-700 bg-gray-950 p-1">
                  <div
                    className="grid h-full w-full gap-px bg-gray-950"
                    style={{
                      gridTemplateColumns: `repeat(${VIEW_SIZE}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${VIEW_SIZE}, minmax(0, 1fr))`,
                    }}
                  >
                  {Array.from({ length: VIEW_SIZE * VIEW_SIZE }, (_, index) => {
                    const x = viewOrigin.x + (index % VIEW_SIZE);
                    const y =
                      viewOrigin.y +
                      (VIEW_SIZE - 1 - Math.floor(index / VIEW_SIZE));
                    const settings = worldCells.find(
                      (c) => c.positionX === x && c.positionY === y,
                    );
                    const inSafeZone =
                      safeZone &&
                      (() => {
                        const dx = x - safeZone.centerX;
                        const dy = y - safeZone.centerY;
                        return (
                          dx * dx + dy * dy <=
                          safeZone.radius * safeZone.radius
                        );
                      })();
                    const isSelected =
                      selectedCell.x === x && selectedCell.y === y;
                    let bg = inSafeZone ? "bg-blue-800/50" : "bg-red-900/40";
                    let icon = "";
                    if (settings?.blocked) {
                      bg = "bg-gray-800";
                      icon = "🚫";
                    } else if ((settings?.radiation ?? 0) > 0) {
                      bg = "bg-lime-800/70";
                      icon = "☢️";
                    }
                    if ((settings?.ambushChance ?? 0) > 0 && !settings?.blocked) {
                      bg = icon ? bg : "bg-orange-800/70";
                      icon = icon || "👹";
                    }
                    return (
                      <button
                        key={`${x}:${y}`}
                        type="button"
                        onClick={() => handleSelectCell(x, y)}
                        className={`relative flex items-center justify-center transition ${bg} ${
                          isSelected
                            ? "ring-2 ring-blue-400 z-10"
                            : "hover:ring-1 hover:ring-gray-400"
                        }`}
                        title={`[${x}/${y}]${
                          settings
                            ? ` — ${settings.blocked ? "blocked" : ""}${
                                settings.radiation > 0
                                  ? ` ☢${settings.radiation}`
                                  : ""
                              }${
                                settings.ambushChance > 0
                                  ? ` 👹${settings.ambushChance}%`
                                  : ""
                              }`
                            : ""
                        }`}
                      >
                        {icon && (
                          <span className="select-none text-[9px] leading-none">
                            {icon}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-gray-500">
                  [{viewOrigin.x}–{viewOrigin.x + VIEW_SIZE - 1}] × [{viewOrigin.y}–
                  {viewOrigin.y + VIEW_SIZE - 1}]
                </span>
              </div>

              {/* Mini-map — click to move the camera */}
              <div className="flex flex-col items-center gap-1 w-full max-w-[200px]">
                <div
                  ref={miniMapRef}
                  onClick={handleMiniMapClick}
                  className="relative aspect-square w-full cursor-crosshair overflow-hidden rounded-xl border border-gray-700 bg-gray-950"
                  title="Click anywhere on the overview to jump the camera to that point"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(to top, rgba(148,163,184,0.25) 1px, transparent 1px)",
                      backgroundSize: "10% 10%",
                    }}
                  />
                  {/* Axis lines through cell (0,0) */}
                  <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-blue-400/30" />
                  <div className="pointer-events-none absolute top-1/2 left-0 w-full h-px bg-blue-400/30" />
                  {worldCells
                    .filter(
                      (cell) =>
                        cell.positionX >= WORLD_MIN &&
                        cell.positionX <= WORLD_MAX &&
                        cell.positionY >= WORLD_MIN &&
                        cell.positionY <= WORLD_MAX,
                    )
                    .map((cell) => (
                      <span
                        key={cell.id}
                        className={`absolute h-[5px] w-[5px] rounded-full border border-black/70 ${
                          cell.blocked
                            ? "bg-gray-300"
                            : (cell.radiation ?? 0) > 0
                              ? "bg-lime-400"
                              : (cell.ambushChance ?? 0) > 0
                                ? "bg-orange-400"
                                : "bg-blue-400"
                        }`}
                        style={{
                          left: `${((cell.positionX - WORLD_MIN + 0.5) / WORLD_SIZE) * 100}%`,
                          bottom: `${((cell.positionY - WORLD_MIN + 0.5) / WORLD_SIZE) * 100}%`,
                          transform: "translate(-50%, 50%)",
                          zIndex: 5,
                        }}
                        title={`[${cell.positionX}:${cell.positionY}]${cell.blocked ? " 🚫" : ""}${(cell.radiation ?? 0) > 0 ? ` ☢${cell.radiation}` : ""}${(cell.ambushChance ?? 0) > 0 ? ` 👹${cell.ambushChance}%` : ""}`}
                      />
                    ))}
                  <div
                    className="pointer-events-none absolute z-10 rounded-[2px] border border-blue-400 bg-blue-400/10 shadow-[0_0_6px_rgba(96,165,250,0.5)]"
                    style={{
                      left: `${((viewOrigin.x - WORLD_MIN) / WORLD_SIZE) * 100}%`,
                      bottom: `${((viewOrigin.y - WORLD_MIN) / WORLD_SIZE) * 100}%`,
                      width: `${(VIEW_SIZE / WORLD_SIZE) * 100}%`,
                      height: `${(VIEW_SIZE / WORLD_SIZE) * 100}%`,
                    }}
                  />
                  {selectedCell.x >= WORLD_MIN &&
                    selectedCell.x <= WORLD_MAX &&
                    selectedCell.y >= WORLD_MIN &&
                    selectedCell.y <= WORLD_MAX && (
                      <span
                        className="pointer-events-none absolute z-20 h-[7px] w-[7px] rounded-full border border-white bg-white"
                        style={{
                          left: `${((selectedCell.x - WORLD_MIN + 0.5) / WORLD_SIZE) * 100}%`,
                          bottom: `${((selectedCell.y - WORLD_MIN + 0.5) / WORLD_SIZE) * 100}%`,
                          transform: "translate(-50%, 50%)",
                        }}
                      />
                    )}
                </div>
                <span className="text-[10px] text-gray-500">
                  🏁 overview — click to jump the camera
                </span>
              </div>
            </div>
          </div>

          {/* Cell settings form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              ⚙️ Settings for cell [{selectedCell.x}:{selectedCell.y}]
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Position X</label>
                <input
                  type="number"
                  min={WORLD_MIN}
                  max={WORLD_MAX}
                  className={inputClass}
                  value={selectedCell.x}
                  onChange={(e) =>
                    setSelectedCell((c) => ({
                      ...c,
                      x: Math.max(WORLD_MIN, Math.min(WORLD_MAX, Number(e.target.value) || 0)),
                    }))
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Position Y</label>
                <input
                  type="number"
                  min={WORLD_MIN}
                  max={WORLD_MAX}
                  className={inputClass}
                  value={selectedCell.y}
                  onChange={(e) =>
                    setSelectedCell((c) => ({
                      ...c,
                      y: Math.max(WORLD_MIN, Math.min(WORLD_MAX, Number(e.target.value) || 0)),
                    }))
                  }
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-[11px] text-gray-300">
              <input
                type="checkbox"
                checked={cellBlocked}
                onChange={(e) => setCellBlocked(e.target.checked)}
                className="accent-red-500"
              />
              🚫 Blocked — players cannot step onto this cell
            </label>
            <div>
              <label className={labelClass}>☢️ Radiation (HP lost per step)</label>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={cellRadiation}
                onChange={(e) => setCellRadiation(Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className={labelClass}>
                👹 Ambush chance (%) — only outside the safe zone
              </label>
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass}
                value={cellAmbush}
                onChange={(e) =>
                  setCellAmbush(
                    Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                  )
                }
              />
            </div>
            <div>
              <label className={labelClass}>Ambush enemy</label>
              <select
                className={inputClass}
                value={cellEnemyId}
                onChange={(e) => setCellEnemyId(e.target.value)}
              >
                <option value="">— No ambush —</option>
                {enemies.map((enemy) => (
                  <option key={enemy.id} value={enemy.id}>
                    {enemy.name} ({enemy.maxHealth} HP / {enemy.damage} DMG)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>
                🧱 Obstacles that may spawn here (empty = no obstacles in combat)
              </span>
              {obstacleTypes.length === 0 ? (
                <p className="text-[11px] text-gray-600">
                  No obstacle types yet — create them in the “Obstacles” tab first.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {obstacleTypes.map((obstacle) => {
                    const selected = cellObstacleIds.includes(obstacle.id);
                    return (
                      <button
                        key={obstacle.id}
                        type="button"
                        onClick={() => toggleCellObstacle(obstacle.id)}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition ${
                          selected
                            ? "border-amber-400 bg-amber-900/60 text-amber-100"
                            : "border-gray-700 bg-gray-800/40 text-gray-400 hover:bg-gray-800"
                        }`}
                      >
                        {obstacle.name} ({obstacle.maxHealth} HP)
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button type="button" disabled={busy} onClick={handleSaveCell} className={primaryBtn}>
              💾 Save Cell Settings
            </button>
          </div>

          {/* Configured cells list */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              📍 Configured Cells ({worldCells.length})
            </span>
            {worldCells.map((cell) => (
              <div
                key={cell.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-100 font-mono">
                    [{cell.positionX}:{cell.positionY}]
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {cell.blocked && (
                      <span className="bg-gray-800 border border-gray-600 text-gray-200 px-2 py-0.5 rounded-full text-[10px]">
                        🚫 blocked
                      </span>
                    )}
                    {cell.radiation > 0 && (
                      <span className="bg-lime-900/40 border border-lime-700 text-lime-200 px-2 py-0.5 rounded-full text-[10px]">
                        ☢️ {cell.radiation} HP
                      </span>
                    )}
                    {cell.ambushChance > 0 && (
                      <span className="bg-orange-900/40 border border-orange-700 text-orange-200 px-2 py-0.5 rounded-full text-[10px]">
                        👹 {cell.ambushChance}% {cell.enemyType?.name ?? ""}
                      </span>
                    )}
                    {cell.obstacleTypes.length > 0 && (
                      <span className="bg-amber-900/40 border border-amber-700 text-amber-200 px-2 py-0.5 rounded-full text-[10px]">
                        🧱 {cell.obstacleTypes.map((obstacle) => obstacle.name).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => jumpToCell(cell.positionX, cell.positionY)}
                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-[10px] font-bold px-2 py-1 rounded-lg transition"
                  >
                    ✎ Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDeleteCell(cell.id)}
                    className={dangerBtn}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
            {worldCells.length === 0 && (
              <div className="text-center text-gray-600 text-xs py-4">
                No cells configured yet — click a cell on the grid above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MAPS (world areas opened from the inventory) ================= */}
      {section === "maps" && (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {editingMapId ? "✏️ Edit Map" : "➕ New Map"}
              </span>
              {editingMapId && (
                <button type="button" onClick={resetMapForm} className={dangerBtn}>
                  Cancel edit
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              Each map shows a circular area of the world (different maps = different
              coordinates) and is bound to an inventory item. Players open it from the
              inventory via the “Open” button.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Code</label>
                <input
                  className={inputClass}
                  value={mapCode}
                  onChange={(e) => setMapCode(e.target.value.toUpperCase())}
                  placeholder="DESERT_MAP"
                />
              </div>
              <div>
                <label className={labelClass}>Name</label>
                <input
                  className={inputClass}
                  value={mapName}
                  onChange={(e) => setMapName(e.target.value)}
                  placeholder="Desert Map"
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Description</label>
                <input
                  className={inputClass}
                  value={mapDesc}
                  onChange={(e) => setMapDesc(e.target.value)}
                  placeholder="Scorched dunes far to the east…"
                />
              </div>
              <div>
                <label className={labelClass}>Center X (-500..499)</label>
                <input
                  type="number"
                  min={-500}
                  max={499}
                  className={inputClass}
                  value={mapX}
                  onChange={(e) => setMapX(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>Center Y (-500..499)</label>
                <input
                  type="number"
                  min={-500}
                  max={499}
                  className={inputClass}
                  value={mapY}
                  onChange={(e) => setMapY(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className={labelClass}>Radius (1..9)</label>
                <input
                  type="number"
                  min={1}
                  max={9}
                  className={inputClass}
                  value={mapRadius}
                  onChange={(e) => setMapRadius(Number(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className={labelClass}>Item code (opens the map)</label>
                <select
                  className={inputClass}
                  value={mapItemCode}
                  onChange={(e) => setMapItemCode(e.target.value)}
                >
                  {items.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="button" disabled={busy} onClick={handleSaveMap} className={primaryBtn}>
              {editingMapId ? "💾 Save changes" : "➕ Create map"}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              🧭 Maps ({maps.length})
            </span>
            {maps.map((gm) => (
              <div
                key={gm.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-100 truncate">
                    {gm.name}{" "}
                    <span className="text-[10px] text-gray-500 font-mono">
                      {gm.code}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Center [{gm.centerX}:{gm.centerY}] · R{gm.radius} · opens via{" "}
                    <span className="font-mono text-blue-400">{gm.itemCode}</span>
                  </div>
                  {gm.description && (
                    <div className="text-[10px] text-gray-400 mt-0.5">{gm.description}</div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleStartEditMap(gm)}
                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-[10px] font-bold px-2 py-1 rounded-lg transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDeleteMap(gm.id)}
                    className={dangerBtn}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
            {maps.length === 0 && (
              <div className="text-center text-gray-600 text-xs py-4">
                No maps yet — create one above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= OBSTACLE TYPES (destructible combat obstacles) ================= */}
      {section === "obstacles" && (
        <div className="flex flex-col gap-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {editingObstacleId ? "✏️ Edit Obstacle Type" : "➕ New Obstacle Type"}
              </span>
              {editingObstacleId && (
                <button type="button" onClick={resetObstacleForm} className={dangerBtn}>
                  Cancel edit
                </button>
              )}
            </div>
            <p className="text-[11px] text-gray-500">
              Obstacles are destructible. They never block shots — every bullet that passes
              through a cell with an obstacle damages it, and at 0 HP the obstacle is removed
              from the board. Pick which types each location may spawn in the “Maps” tab.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Code</label>
                <input
                  className={inputClass}
                  value={obstacleCode}
                  onChange={(e) => setObstacleCode(e.target.value.toUpperCase())}
                  disabled={Boolean(editingObstacleId)}
                  placeholder="CRATE"
                />
              </div>
              <div>
                <label className={labelClass}>Name</label>
                <input
                  className={inputClass}
                  value={obstacleName}
                  onChange={(e) => setObstacleName(e.target.value)}
                  placeholder="Crate"
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Max health (how much damage it can absorb)</label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={obstacleHealth}
                  onChange={(e) => setObstacleHealth(Number(e.target.value) || 1)}
                />
              </div>
            </div>
            <button type="button" disabled={busy} onClick={handleSaveObstacle} className={primaryBtn}>
              {editingObstacleId ? "💾 Save changes" : "➕ Create obstacle type"}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              🧱 Obstacle Types ({obstacleTypes.length})
            </span>
            {obstacleTypes.map((obstacle) => (
              <div
                key={obstacle.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-100 truncate">
                    {obstacle.name}{" "}
                    <span className="text-[10px] text-gray-500 font-mono">{obstacle.code}</span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {obstacle.maxHealth} HP durability
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleStartEditObstacle(obstacle)}
                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-[10px] font-bold px-2 py-1 rounded-lg transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDeleteObstacle(obstacle.id)}
                    className={dangerBtn}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
            {obstacleTypes.length === 0 && (
              <div className="text-center text-gray-600 text-xs py-4">
                No obstacle types yet — create one above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= PLAYERS ================= */}
      {section === "players" && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            🛡️ Players & Roles ({players.length})
          </span>
          {players.map((player) => (
            <div
              key={player.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-100 truncate">
                    {player.username ?? "Unnamed"}{" "}
                    <span className="text-[10px] text-gray-500 font-mono">#{player.id.slice(0, 12)}</span>
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Lv {player.level} · 💰 {player.gold} · ⭐ {player.questPoints}
                  </div>
                  {(player.proficiencies ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(player.proficiencies ?? []).map((prof) => (
                        <span
                          key={prof.weaponTypeCode}
                          className="bg-cyan-900/40 border border-cyan-800 text-cyan-200 px-2 py-0.5 rounded-full text-[10px]"
                        >
                          {prof.weaponTypeCode} Lv{prof.level}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openProficiencyEditor(player)}
                    className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition"
                  >
                    🎯 Weapons
                  </button>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      player.role === "ADMIN"
                        ? "bg-purple-900/50 border-purple-700 text-purple-200"
                        : "bg-gray-800 border-gray-700 text-gray-400"
                    }`}
                  >
                    {player.role}
                  </span>
                  {player.role === "ADMIN" ? (
                    <button
                      type="button"
                      disabled={busy || player.id === playerId}
                      onClick={() => handleSetRole(player.id, "PLAYER")}
                      className={dangerBtn}
                    >
                      Demote
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleSetRole(player.id, "ADMIN")}
                      className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition"
                    >
                      Make Admin
                    </button>
                  )}
                </div>
              </div>
              {proficiencyTargetId === player.id && (
                <div className="mt-2 border border-cyan-800 bg-cyan-950/20 rounded-xl p-2 flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                    🎯 Weapon proficiency — {player.username ?? "Unnamed"}
                  </span>
                  {weaponTypes.length === 0 ? (
                    <span className="text-[10px] text-gray-500">
                      No weapon types yet. Create them in the “Weapon Types” tab first.
                    </span>
                  ) : (
                    weaponTypes.map((weaponType) => (
                      <div key={weaponType.code} className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-gray-200 min-w-24 truncate">
                          {weaponType.code}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-100"
                          value={profDrafts[weaponType.code] ?? 0}
                          onChange={(e) =>
                            setProfDrafts((drafts) => ({
                              ...drafts,
                              [weaponType.code]: Number(e.target.value) || 0,
                            }))
                          }
                        />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleSaveProficiency(weaponType.code)}
                          className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-[10px] font-bold px-3 py-1 rounded-lg transition"
                        >
                          Save
                        </button>
                      </div>
                    ))
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleCloseProficiency}
                    className={dangerBtn}
                  >
                    ✖ Close
                  </button>
                </div>
              )}
            </div>
          ))}
          {players.length === 0 && (
            <div className="text-center text-gray-600 text-xs py-4">No players found.</div>
          )}
        </div>
      )}
    </div>
  );
}