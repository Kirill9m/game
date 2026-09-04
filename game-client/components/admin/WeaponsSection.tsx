"use client";
import { useState } from "react";
import { adminApi } from "@/services/adminApi";
import type { AdminWeaponType } from "@/types/admin";
import type { SectionProps } from "./types";
import { inputClass, labelClass, primaryBtn, dangerBtn } from "./ui";

interface Props extends SectionProps { weaponTypes: AdminWeaponType[]; }

export default function WeaponsSection({ playerId, busy, setError, setNotice, onRefresh, weaponTypes }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [accPerLvl, setAccPerLvl] = useState(5);
  const [maxAcc, setMaxAcc] = useState(80);
  const [editId, setEditId] = useState("");
  const [editDraft, setEditDraft] = useState({ name: "", accPerLvl: 5, maxAcc: 80 });

  const reset = () => { setCode(""); setName(""); setAccPerLvl(5); setMaxAcc(80); setEditId(""); };
  const handleCreate = async () => {
    if (!code.trim()) { setError("Code required"); return; }
    try { await adminApi.createWeaponType(playerId, { code: code.trim().toUpperCase(), name: name.trim() || code, accuracyPerLevel: accPerLvl, maxAccuracy: maxAcc }); setNotice("Created"); reset(); await onRefresh(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };
  const handleDelete = async (id: string) => {
    try { await adminApi.deleteWeaponType(playerId, id); setNotice("Deleted"); await onRefresh(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };
  const handleSaveEdit = async () => {
    try { await adminApi.updateWeaponType(playerId, editId, { name: editDraft.name, accuracyPerLevel: editDraft.accPerLvl, maxAccuracy: editDraft.maxAcc }); setNotice("Updated"); reset(); await onRefresh(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{editId ? "✏️ Edit Weapon" : "➕ Create Weapon Type"}</span>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelClass}>Code</label><input className={inputClass} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SWORD" disabled={!!editId} /></div>
          <div><label className={labelClass}>Name</label><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sword" /></div>
          <div><label className={labelClass}>Acc / Level</label><input type="number" min={1} className={inputClass} value={accPerLvl} onChange={(e) => setAccPerLvl(Number(e.target.value) || 1)} /></div>
          <div><label className={labelClass}>Max Accuracy %</label><input type="number" min={1} max={100} className={inputClass} value={maxAcc} onChange={(e) => setMaxAcc(Number(e.target.value) || 1)} /></div>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={editId ? handleSaveEdit : handleCreate} className={primaryBtn}>{editId ? "💾 Save" : "➕ Create"}</button>
          {editId && <button type="button" onClick={reset} className={dangerBtn}>✕ Cancel</button>}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">⚔️ Weapon Types ({weaponTypes.length})</span>
        {weaponTypes.map((w) => (
          <div key={w.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <div><div className="text-sm font-semibold text-gray-100">{w.name}</div><div className="text-[10px] text-gray-500 font-mono">{w.code}</div>
              <div className="flex gap-1.5 mt-1">
                <span className="bg-blue-900/40 border border-blue-800 text-blue-200 px-2 py-0.5 rounded-full text-[10px]">+{w.accuracyPerLevel}%/lvl</span>
                <span className="bg-green-900/40 border border-green-800 text-green-200 px-2 py-0.5 rounded-full text-[10px]">Max {w.maxAccuracy}%</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button type="button" disabled={busy} onClick={() => { setEditId(w.id); setEditDraft({ name: w.name, accPerLvl: w.accuracyPerLevel, maxAcc: w.maxAccuracy }); }} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-lg transition">✏️</button>
              <button type="button" disabled={busy} onClick={() => handleDelete(w.id)} className={dangerBtn}>🗑</button>
            </div>
          </div>
        ))}
        {weaponTypes.length === 0 && <div className="text-center text-gray-600 text-xs py-4">No weapon types yet.</div>}
      </div>
    </div>
  );
}
