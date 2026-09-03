"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/services/adminApi";
import type {
  AdminDialogueNode,
  AdminEnemyType,
  AdminItem,
  AdminNpc,
  AdminPlayer,
  AdminQuest,
} from "@/types/admin";

interface Props {
  playerId: string;
}

type Section = "quests" | "dialogues" | "items" | "enemies" | "players";

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
  const [enemies, setEnemies] = useState<AdminEnemyType[]>([]);
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

  // --- Enemy form state ---
  const [enemyCode, setEnemyCode] = useState("");
  const [enemyName, setEnemyName] = useState("");
  const [enemyHealth, setEnemyHealth] = useState(40);
  const [enemyDamage, setEnemyDamage] = useState(6);
  const [enemyRange, setEnemyRange] = useState(1);
  const [enemyAp, setEnemyAp] = useState(3);
  const [enemyMove, setEnemyMove] = useState(2);
  const [enemyDifficulty, setEnemyDifficulty] = useState(1);

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
    const [p, n, q, i, e] = await Promise.all([
      adminApi.getPlayers(playerId),
      adminApi.getNpcs(playerId),
      adminApi.getQuests(playerId),
      adminApi.getItems(playerId),
      adminApi.getEnemyTypes(playerId),
    ]);
    setPlayers(p);
    setNpcs(n);
    setQuests(q);
    setItems(i);
    setEnemies(e);
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
      adminApi.getEnemyTypes(playerId),
    ])
      .then(([p, n, q, i, e]) => {
        if (cancelled) return;
        setPlayers(p);
        setNpcs(n);
        setQuests(q);
        setItems(i);
        setEnemies(e);
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
      });
      setEnemyCode("");
      setEnemyName("");
      await loadAll();
      setNotice("Enemy type created");
    });

  const handleDeleteEnemy = (enemyId: string) =>
    run(async () => {
      await adminApi.deleteEnemyType(playerId, enemyId);
      await loadAll();
      setNotice("Enemy type deleted");
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
                { id: "enemies", icon: "👹", label: "Enemies" },
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

      {/* ================= PLAYERS ================= */}
      {section === "players" && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            🛡️ Players & Roles ({players.length})
          </span>
          {players.map((player) => (
            <div
              key={player.id}
              className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-100 truncate">
                  {player.username ?? "Unnamed"}{" "}
                  <span className="text-[10px] text-gray-500 font-mono">#{player.id.slice(0, 12)}</span>
                </div>
                <div className="text-[10px] text-gray-500">
                  Lv {player.level} · 💰 {player.gold} · ⭐ {player.questPoints}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
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
          ))}
          {players.length === 0 && (
            <div className="text-center text-gray-600 text-xs py-4">No players found.</div>
          )}
        </div>
      )}
    </div>
  );
}