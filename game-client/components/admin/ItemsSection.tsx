"use client";
import { useState } from "react";
import { adminApi } from "@/services/adminApi";
import type { AdminItem } from "@/types/admin";
import type { SectionProps } from "./types";
import { inputClass, labelClass, primaryBtn, dangerBtn } from "./ui";

interface Props extends SectionProps { items: AdminItem[]; }

export default function ItemsSection({ playerId, busy, setError, setNotice, onRefresh, items }: Props) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("WEAPON");
  const [damage, setDamage] = useState(5);
  const [range, setRange] = useState(1);
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);
  const [wCode, setWCode] = useState("");
  const [defense, setDefense] = useState(2);
  const [slot, setSlot] = useState("HELMET");

  const act = async (fn: () => Promise<void>, msg?: string) => {
    try { await fn(); if (msg) setNotice(msg); await onRefresh(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">➕ Create Item</span>
          <button type="button" disabled={busy} onClick={() => act(async () => { const item = await adminApi.generateItem(playerId); setNotice(`Generated "${item.name}" (${item.code})`); }, "")} className={primaryBtn}>🎲 Random Item</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelClass}>Code</label><input className={inputClass} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="IRON_SWORD" /></div>
          <div><label className={labelClass}>Name</label><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Iron Sword" /></div>
          <div><label className={labelClass}>Type</label>
            <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="WEAPON">WEAPON</option><option value="ARMOR">ARMOR</option><option value="UTILITY">UTILITY</option>
            </select></div>
          <div><label className={labelClass}>Weapon Type Code</label><input className={inputClass} value={wCode} onChange={(e) => setWCode(e.target.value.toUpperCase())} placeholder="SWORD" /></div>
          <div><label className={labelClass}>Damage</label><input type="number" min={0} className={inputClass} value={damage} onChange={(e) => setDamage(Number(e.target.value) || 0)} /></div>
          <div><label className={labelClass}>Attack Range</label><input type="number" min={0} className={inputClass} value={range} onChange={(e) => setRange(Number(e.target.value) || 0)} /></div>
          <div><label className={labelClass}>Width</label><input type="number" min={1} className={inputClass} value={width} onChange={(e) => setWidth(Number(e.target.value) || 1)} /></div>
          <div><label className={labelClass}>Height</label><input type="number" min={1} className={inputClass} value={height} onChange={(e) => setHeight(Number(e.target.value) || 1)} /></div>
          {type === "ARMOR" && (
            <>
              <div><label className={labelClass}>Defense (damage reduction)</label><input type="number" min={0} className={inputClass} value={defense} onChange={(e) => setDefense(Number(e.target.value) || 0)} /></div>
              <div><label className={labelClass}>Equipment Slot</label>
                <select className={inputClass} value={slot} onChange={(e) => setSlot(e.target.value)}>
                  <option value="HELMET">HELMET</option><option value="BODY">BODY</option><option value="LEGS">LEGS</option><option value="FEET">FEET</option>
                </select></div>
            </>
          )}
        </div>
        <button type="button" disabled={busy} onClick={() => act(async () => {
          if (!code.trim() || !name.trim()) throw new Error("Code and name required");
          await adminApi.createItem(playerId, { code: code.trim(), name: name.trim(), type, weaponTypeCode: wCode || null, damage, attackRange: range, width, height, defense: type === "ARMOR" ? defense : 0, equipmentSlot: type === "ARMOR" ? slot : null });
          setCode(""); setName(""); setNotice("Item created");
        }, "")} className={primaryBtn}>➕ Create Item</button>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">🎒 Items ({items.length})</span>
        {items.map((it) => (
          <div key={it.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-gray-100">{it.name}</div>
              <div className="text-[10px] text-gray-500 font-mono">{it.code}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="bg-gray-800 border border-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[9px]">{it.type}</span>
                <span className="bg-red-900/40 border border-red-800 text-red-200 px-1.5 py-0.5 rounded text-[9px]">⚔️ {it.damage}</span>
                <span className="bg-blue-900/40 border border-blue-800 text-blue-200 px-1.5 py-0.5 rounded text-[9px]">📏 {it.attackRange}</span>
                {it.weaponTypeCode && <span className="bg-green-900/40 border border-green-800 text-green-200 px-1.5 py-0.5 rounded text-[9px]">{it.weaponTypeCode}</span>}
                {it.type === "ARMOR" && <span className="bg-purple-900/40 border border-purple-800 text-purple-200 px-1.5 py-0.5 rounded text-[9px]">🛡 {it.defense}</span>}
                {it.equipmentSlot && <span className="bg-cyan-900/40 border border-cyan-800 text-cyan-200 px-1.5 py-0.5 rounded text-[9px]">{it.equipmentSlot}</span>}
              </div>
            </div>
            <button type="button" disabled={busy} onClick={() => act(async () => { await adminApi.deleteItem(playerId, it.id); }, "Deleted")} className={dangerBtn}>🗑</button>
          </div>
        ))}
        {items.length === 0 && <div className="text-center text-gray-600 text-xs py-4">No items yet.</div>}
      </div>
    </div>
  );
}
