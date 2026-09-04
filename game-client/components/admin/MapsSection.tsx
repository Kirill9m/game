"use client";
import { useState } from "react";
import { adminApi } from "@/services/adminApi";
import type { AdminGameMap, AdminItem } from "@/types/admin";
import type { SectionProps } from "./types";
import { inputClass, labelClass, primaryBtn, dangerBtn } from "./ui";

interface Props extends SectionProps { maps: AdminGameMap[]; items: AdminItem[]; }

export default function MapsSection({ playerId, busy, setError, setNotice, onRefresh, maps, items }: Props) {
  const [editId, setEditId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [cx, setCx] = useState(0);
  const [cy, setCy] = useState(0);
  const [radius, setRadius] = useState(4);
  const [itemCode, setItemCode] = useState("WORLD_MAP");

  const reset = () => { setEditId(""); setCode(""); setName(""); setDesc(""); setCx(0); setCy(0); setRadius(4); setItemCode("WORLD_MAP"); };
  const act = async (fn: () => Promise<void>, msg?: string) => {
    try { await fn(); if (msg) setNotice(msg); await onRefresh(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{editId ? "✏️ Edit Map" : "➕ Create Map"}</span>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelClass}>Code</label><input className={inputClass} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="DESERT_MAP" disabled={!!editId} /></div>
          <div><label className={labelClass}>Name</label><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Desert Map" /></div>
          <div className="col-span-2"><label className={labelClass}>Description</label><input className={inputClass} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Scorched dunes…" /></div>
          <div><label className={labelClass}>Center X</label><input type="number" min={-500} max={499} className={inputClass} value={cx} onChange={(e) => setCx(Number(e.target.value) || 0)} /></div>
          <div><label className={labelClass}>Center Y</label><input type="number" min={-500} max={499} className={inputClass} value={cy} onChange={(e) => setCy(Number(e.target.value) || 0)} /></div>
          <div><label className={labelClass}>Radius</label><input type="number" min={1} max={9} className={inputClass} value={radius} onChange={(e) => setRadius(Number(e.target.value) || 1)} /></div>
          <div><label className={labelClass}>Item Code</label>
            <select className={inputClass} value={itemCode} onChange={(e) => setItemCode(e.target.value)}>
              {items.map((it) => <option key={it.code} value={it.code}>{it.name} ({it.code})</option>)}
            </select></div>
        </div>
        <button type="button" disabled={busy} onClick={() => act(async () => {
          const payload = { code, name, description: desc || null, centerX: cx, centerY: cy, radius, itemCode };
          if (editId) { await adminApi.updateMap(playerId, editId, payload); } else { await adminApi.createMap(playerId, payload); }
          reset(); setNotice(editId ? "Map updated" : "Map created");
        })} className={primaryBtn}>{editId ? "💾 Save" : "➕ Create Map"}</button>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">🧭 Maps ({maps.length})</span>
        {maps.map((m) => (
          <div key={m.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-100 truncate">{m.name}</div>
              <div className="text-[10px] text-gray-500 font-mono">{m.code}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="bg-blue-900/40 border border-blue-800 text-blue-200 px-2 py-0.5 rounded-full text-[10px]">📍 {m.centerX}:{m.centerY}</span>
                <span className="bg-green-900/40 border border-green-800 text-green-200 px-2 py-0.5 rounded-full text-[10px]">🔵 r{m.radius}</span>
                <span className="bg-amber-900/40 border border-amber-800 text-amber-200 px-2 py-0.5 rounded-full text-[10px]">{m.itemCode}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <button type="button" disabled={busy} onClick={() => { setEditId(m.id); setCode(m.code); setName(m.name); setDesc(m.description ?? ""); setCx(m.centerX); setCy(m.centerY); setRadius(m.radius); setItemCode(m.itemCode); }} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-lg transition">✏️</button>
              <button type="button" disabled={busy} onClick={() => act(async () => { await adminApi.deleteMap(playerId, m.id); }, "Deleted")} className={dangerBtn}>🗑</button>
            </div>
          </div>
        ))}
        {maps.length === 0 && <div className="text-center text-gray-600 text-xs py-4">No maps yet.</div>}
      </div>
    </div>
  );
}
