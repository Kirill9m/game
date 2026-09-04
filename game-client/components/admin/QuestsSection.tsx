"use client";
import { useState } from "react";
import { adminApi } from "@/services/adminApi";
import type { AdminNpc, AdminQuest } from "@/types/admin";
import type { SectionProps } from "./types";
import { inputClass, labelClass, primaryBtn, dangerBtn } from "./ui";

interface Props extends SectionProps { quests: AdminQuest[]; npcs: AdminNpc[]; }

export default function QuestsSection({ playerId, busy, setError, setNotice, onRefresh, quests, npcs }: Props) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [gold, setGold] = useState(50);
  const [exp, setExp] = useState(100);
  const [itemCode, setItemCode] = useState("RANDOM");
  const [npcIds, setNpcIds] = useState<string[]>([]);

  const run = async (fn: () => Promise<void>, msg?: string) => {
    setError(""); setNotice(""); try { await fn(); if (msg) setNotice(msg); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };
  const handleCreate = () => run(async () => {
    if (!code.trim() || !title.trim()) throw new Error("Code and title required");
    await adminApi.createQuest(playerId, { code: code.trim(), title: title.trim(), rewardGold: gold, rewardExp: exp, rewardItemCode: itemCode, requiredNpcIds: npcIds });
    setCode(""); setTitle(""); setNpcIds([]); await onRefresh(); setNotice("Quest created");
  });
  const handleDelete = (id: string) => run(async () => { await adminApi.deleteQuest(playerId, id); await onRefresh(); setNotice("Deleted"); });
  const handleGenerate = (withNpc: boolean) => run(async () => {
    const q = await adminApi.generateQuest(playerId, withNpc); await onRefresh(); setNotice(`Generated "${q.title}" (${q.code})`);
  });
  const toggleNpc = (id: string) => setNpcIds((prev) => prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]);

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-gray-900 border border-purple-900/60 rounded-xl p-3 flex flex-col gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-purple-300">🎲 Random Quest Generator</span>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => handleGenerate(false)} className={primaryBtn}>🎲 Generate Quest</button>
          <button type="button" disabled={busy} onClick={() => handleGenerate(true)} className="bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition">🧙 Generate + New NPC</button>
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">✍️ Create Quest Manually</span>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelClass}>Code</label><input className={inputClass} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="FIND_THE_MAP" /></div>
          <div><label className={labelClass}>Title</label><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Find the Map" /></div>
          <div><label className={labelClass}>Gold Reward</label><input type="number" min={0} className={inputClass} value={gold} onChange={(e) => setGold(Number(e.target.value) || 0)} /></div>
          <div><label className={labelClass}>Exp Reward</label><input type="number" min={0} className={inputClass} value={exp} onChange={(e) => setExp(Number(e.target.value) || 0)} /></div>
        </div>
        <div><label className={labelClass}>Reward Item Code</label><input className={inputClass} value={itemCode} onChange={(e) => setItemCode(e.target.value.toUpperCase())} placeholder="RANDOM" /></div>
        <div><label className={labelClass}>Required NPCs</label>
          <div className="flex flex-wrap gap-1 mt-1">{npcs.map((n) => (
            <button key={n.id} type="button" onClick={() => toggleNpc(n.id)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition ${npcIds.includes(n.id) ? "bg-green-900/60 border-green-700 text-green-200" : "bg-gray-800 border-gray-700 text-gray-400"}`}>
              {n.name}</button>))}</div></div>
        <button type="button" disabled={busy} onClick={handleCreate} className={primaryBtn}>➕ Create Quest</button>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">📜 Quests ({quests.length})</span>
        {quests.map((q) => (
          <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-100 truncate">{q.title}</div>
              <div className="text-[10px] text-gray-500 font-mono">{q.code}</div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span className="bg-amber-900/40 border border-amber-800 text-amber-200 px-2 py-0.5 rounded-full text-[10px]">💰 {q.rewardGold}</span>
                <span className="bg-blue-900/40 border border-blue-800 text-blue-200 px-2 py-0.5 rounded-full text-[10px]">⭐ {q.rewardExp}</span>
                <span className="bg-purple-900/40 border border-purple-800 text-purple-200 px-2 py-0.5 rounded-full text-[10px]">🎒 {q.rewardItemCode ?? "none"}</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1">NPCs: {q.requiredNpcs.length > 0 ? q.requiredNpcs.map((n) => n.name).join(", ") : "—"}</div>
            </div>
            <button type="button" disabled={busy} onClick={() => handleDelete(q.id)} className={dangerBtn}>🗑</button>
          </div>
        ))}
        {quests.length === 0 && <div className="text-center text-gray-600 text-xs py-4">No quests yet.</div>}
      </div>
    </div>
  );
}
