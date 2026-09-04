"use client";
import { useState } from "react";
import { adminApi } from "@/services/adminApi";
import type { AdminObstacleType } from "@/types/admin";
import type { SectionProps } from "./types";
import { inputClass, labelClass, primaryBtn, dangerBtn } from "./ui";

interface Props extends SectionProps { obstacleTypes: AdminObstacleType[]; }

export default function ObstaclesSection({ playerId, busy, setError, setNotice, onRefresh, obstacleTypes }: Props) {
  const [editId, setEditId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [maxHp, setMaxHp] = useState(50);

  const reset = () => { setEditId(""); setCode(""); setName(""); setMaxHp(50); };
  const handleCreate = async () => {
    if (!code.trim()) { setError("Code required"); return; }
    try { await adminApi.createObstacleType(playerId, { code: code.trim().toUpperCase(), name: name.trim() || code, maxHealth: maxHp }); setNotice("Created"); reset(); await onRefresh(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };
  const handleDelete = async (id: string) => {
    try { await adminApi.deleteObstacleType(playerId, id); setNotice("Deleted"); await onRefresh(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };
  const handleSaveEdit = async () => {
    try { await adminApi.updateObstacleType(playerId, editId, { name: name.trim() || undefined, maxHealth: maxHp }); setNotice("Updated"); reset(); await onRefresh(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          {editId ? "✏️ Edit Obstacle" : "➕ Create Obstacle Type"}
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelClass}>Code</label><input className={inputClass} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WOODEN_BARRICADE" disabled={!!editId} /></div>
          <div><label className={labelClass}>Name</label><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Wooden Barricade" /></div>
          <div><label className={labelClass}>Max Health</label><input type="number" min={1} className={inputClass} value={maxHp} onChange={(e) => setMaxHp(Number(e.target.value) || 1)} /></div>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={editId ? handleSaveEdit : handleCreate} className={primaryBtn}>{editId ? "💾 Save" : "➕ Create"}</button>
          {editId && <button type="button" onClick={reset} className={dangerBtn}>✕ Cancel</button>}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">🧱 Obstacles ({obstacleTypes.length})</span>
        {obstacleTypes.map((o) => (
          <div key={o.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <div><div className="text-sm font-semibold text-gray-100">{o.name}</div><div className="text-[10px] text-gray-500 font-mono">{o.code}</div>
              <span className="bg-orange-900/40 border border-orange-800 text-orange-200 px-2 py-0.5 rounded-full text-[10px]">❤️ {o.maxHealth} HP</span>
            </div>
            <div className="flex gap-1">
              <button type="button" disabled={busy} onClick={() => { setEditId(o.id); setCode(o.code); setName(o.name); setMaxHp(o.maxHealth); }} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-lg transition">✏️ Edit</button>
              <button type="button" disabled={busy} onClick={() => handleDelete(o.id)} className={dangerBtn}>🗑 Delete</button>
            </div>
          </div>
        ))}
        {obstacleTypes.length === 0 && <div className="text-center text-gray-600 text-xs py-4">No obstacle types yet.</div>}
      </div>
    </div>
  );
}
