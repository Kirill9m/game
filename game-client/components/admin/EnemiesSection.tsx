"use client";
import { useState } from "react";
import { adminApi } from "@/services/adminApi";
import type { AdminEnemyType, AdminItem, EnemyLootDropPayload } from "@/types/admin";
import type { SectionProps } from "./types";
import { inputClass, labelClass, primaryBtn, dangerBtn } from "./ui";

interface Props extends SectionProps { enemies: AdminEnemyType[]; items: AdminItem[]; }

function LootRowEditor({ items, rows, setRows }: { items: AdminItem[]; rows: EnemyLootDropPayload[]; setRows: (r: EnemyLootDropPayload[]) => void }) {
  const add = () => setRows([...rows, { itemCode: items[0]?.code ?? "", chance: 50, minQuantity: 1, maxQuantity: 1 }]);
  const upd = (i: number, p: Partial<EnemyLootDropPayload>) => setRows(rows.map((r, j) => j === i ? { ...r, ...p } : r));
  return (<>
    {rows.map((r, i) => (<div key={i} className="flex gap-1 items-end">
      <select className="flex-1 text-[10px]" value={r.itemCode} onChange={(e) => upd(i, { itemCode: e.target.value })}>{items.map((it) => <option key={it.code} value={it.code}>{it.name}</option>)}</select>
      <input type="number" min={1} max={100} className="w-12 text-[10px]" value={r.chance} onChange={(e) => upd(i, { chance: Number(e.target.value) || 1 })} />
      <input type="number" min={1} className="w-10 text-[10px]" value={r.minQuantity} onChange={(e) => upd(i, { minQuantity: Number(e.target.value) || 1 })} />
      <input type="number" min={1} className="w-10 text-[10px]" value={r.maxQuantity} onChange={(e) => upd(i, { maxQuantity: Number(e.target.value) || 1 })} />
      <button type="button" onClick={() => setRows(rows.filter((_, j) => j !== i))} className={dangerBtn}>✕</button>
    </div>))}
    <button type="button" onClick={add} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-lg transition w-fit">➕ Row</button>
  </>);
}

export default function EnemiesSection({ playerId, busy, setError, setNotice, onRefresh, enemies, items }: Props) {
  const [code, setCode] = useState(""); const [name, setName] = useState("");
  const [hp, setHp] = useState(40); const [dmg, setDmg] = useState(6);
  const [range, setRange] = useState(1); const [ap, setAp] = useState(3); const [move, setMove] = useState(2);
  const [difficulty, setDifficulty] = useState(1);
  const [lootRows, setLootRows] = useState<EnemyLootDropPayload[]>([]);
  const [lootEditId, setLootEditId] = useState<string | null>(null);
  const [lootEditRows, setLootEditRows] = useState<EnemyLootDropPayload[]>([]);

  const act = async (fn: () => Promise<void>, msg?: string) => {
    try { await fn(); if (msg) setNotice(msg); await onRefresh(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  return (<div className="flex flex-col gap-3">
    {/* CREATE FORM */}
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">➕ Create Enemy</span>
        <div className="flex gap-1.5">
          <select className="w-16 bg-gray-800 border border-gray-700 rounded text-[10px] text-gray-100 px-1" value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option></select>
          <button type="button" disabled={busy} onClick={() => act(async () => { const e = await adminApi.generateEnemy(playerId, difficulty); setNotice(`Generated "${e.name}"`); })} className={primaryBtn}>🎲</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelClass}>Code</label><input className={inputClass} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WOLF" /></div>
        <div><label className={labelClass}>Name</label><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Wolf" /></div>
        <div><label className={labelClass}>HP</label><input type="number" min={1} className={inputClass} value={hp} onChange={(e) => setHp(Number(e.target.value) || 1)} /></div>
        <div><label className={labelClass}>Damage</label><input type="number" min={0} className={inputClass} value={dmg} onChange={(e) => setDmg(Number(e.target.value) || 0)} /></div>
        <div><label className={labelClass}>Range</label><input type="number" min={0} className={inputClass} value={range} onChange={(e) => setRange(Number(e.target.value) || 0)} /></div>
        <div><label className={labelClass}>AP</label><input type="number" min={1} className={inputClass} value={ap} onChange={(e) => setAp(Number(e.target.value) || 1)} /></div>
        <div><label className={labelClass}>Move</label><input type="number" min={1} className={inputClass} value={move} onChange={(e) => setMove(Number(e.target.value) || 1)} /></div>
      </div>
      <div className="flex flex-col gap-1"><span className="text-[10px] font-bold text-gray-500">Loot Drops</span><LootRowEditor items={items} rows={lootRows} setRows={setLootRows} /></div>
      <button type="button" disabled={busy} onClick={() => act(async () => {
        if (!code.trim() || !name.trim()) throw new Error("Code and name required");
        await adminApi.createEnemyType(playerId, { code: code.trim(), name: name.trim(), maxHealth: hp, damage: dmg, attackRange: range, actionPoints: ap, movementRange: move, lootDrops: lootRows.filter((r) => r.itemCode && r.chance > 0) });
        setCode(""); setName(""); setLootRows([]); setNotice("Enemy created");
      })} className={primaryBtn}>➕ Create</button>
    </div>
    <div className="flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">👹 Enemies ({enemies.length})</span>
      {enemies.map((en) => (
        <div key={en.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-100">{en.name}</div>
            <div className="text-[10px] text-gray-500 font-mono">{en.code}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              <span className="bg-red-900/40 border border-red-800 text-red-200 px-1.5 py-0.5 rounded text-[9px]">❤️{en.maxHealth}</span>
              <span className="bg-orange-900/40 border border-orange-800 text-orange-200 px-1.5 py-0.5 rounded text-[9px]">⚔️{en.damage}</span>
              <span className="bg-blue-900/40 border border-blue-800 text-blue-200 px-1.5 py-0.5 rounded text-[9px]">📏{en.attackRange}</span>
              <span className="bg-green-900/40 border border-green-800 text-green-200 px-1.5 py-0.5 rounded text-[9px]">⚡{en.actionPoints} 🏃{en.movementRange}</span>
            </div>
            {lootEditId === en.id ? (
              <div className="mt-2 flex flex-col gap-1 border-t border-gray-800 pt-2">
                <span className="text-[10px] font-bold text-gray-500">Loot Table</span>
                <LootRowEditor items={items} rows={lootEditRows} setRows={setLootEditRows} />
                <div className="flex gap-1.5">
                  <button type="button" disabled={busy} onClick={() => act(async () => { await adminApi.updateEnemyType(playerId, en.id, { lootDrops: lootEditRows.filter((r) => r.itemCode && r.chance > 0) }); setLootEditId(null); }, "Loot saved")} className={primaryBtn}>💾 Save</button>
                  <button type="button" onClick={() => setLootEditId(null)} className={dangerBtn}>✕</button>
                </div>
              </div>
            ) : en.lootDrops.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{en.lootDrops.map((ld, i) => <span key={i} className="bg-purple-900/40 border border-purple-800 text-purple-200 px-1.5 py-0.5 rounded text-[9px]">🎒 {ld.itemCode} {ld.chance}%</span>)}</div>}
          </div>
          <div className="flex gap-1 shrink-0">
            <button type="button" disabled={busy} onClick={() => { setLootEditId(en.id); setLootEditRows((en.lootDrops ?? []).map((d) => ({ itemCode: d.itemCode, chance: d.chance, minQuantity: d.minQuantity, maxQuantity: d.maxQuantity }))); }} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-lg transition">🎒</button>
            <button type="button" disabled={busy} onClick={() => act(async () => { await adminApi.deleteEnemyType(playerId, en.id); }, "Deleted")} className={dangerBtn}>🗑</button>
          </div>
        </div>
      ))}
      {enemies.length === 0 && <div className="text-center text-gray-600 text-xs py-4">No enemies yet.</div>}
    </div>
  </div>);
}
