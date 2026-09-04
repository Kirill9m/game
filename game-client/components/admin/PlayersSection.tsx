"use client";
import { useState } from "react";
import { adminApi } from "@/services/adminApi";
import type { AdminPlayer } from "@/types/admin";
import type { SectionProps } from "./types";
import { inputClass, labelClass, primaryBtn, dangerBtn } from "./ui";

interface Props extends SectionProps { players: AdminPlayer[]; weaponTypes: { id: string; code: string; name: string }[]; }

export default function PlayersSection({ playerId, busy, setError, setNotice, onRefresh, players }: Props) {
  const [editId, setEditId] = useState("");
  const [d, setD] = useState<Record<string, string>>({});

  const act = async (fn: () => Promise<void>, msg?: string) => {
    try { await fn(); if (msg) setNotice(msg); await onRefresh(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };
  const RoleBtn = ({ p }: { p: AdminPlayer }) => (
    <button type="button" disabled={busy} onClick={() => act(async () => { await adminApi.setPlayerRole(playerId, p.id, p.role === "ADMIN" ? "PLAYER" : "ADMIN"); }, "Role updated")}
      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-lg transition">{p.role === "ADMIN" ? "↓ Demote" : "↑ Promote"}</button>
  );

  return (<div className="flex flex-col gap-2">
    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">🛡️ Players ({players.length})</span>
    {players.map((p) => (<div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-start justify-between gap-2">
      {editId === p.id ? (<div className="flex flex-col gap-2 flex-1">
        <div className="grid grid-cols-3 gap-2">
          <div><label className={labelClass}>Username</label><input className={inputClass} value={d.username ?? ""} onChange={(e) => setD((v) => ({ ...v, username: e.target.value }))} /></div>
          <div><label className={labelClass}>Level</label><input type="number" className={inputClass} value={d.level ?? ""} onChange={(e) => setD((v) => ({ ...v, level: e.target.value }))} /></div>
          <div><label className={labelClass}>Gold</label><input type="number" className={inputClass} value={d.gold ?? ""} onChange={(e) => setD((v) => ({ ...v, gold: e.target.value }))} /></div>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={() => act(async () => { await adminApi.updatePlayer(playerId, editId, { username: d.username || undefined, level: d.level ? Number(d.level) : undefined, gold: d.gold ? Number(d.gold) : undefined }); setEditId(""); }, "Updated")} className={primaryBtn}>💾 Save</button>
          <button type="button" onClick={() => setEditId("")} className={dangerBtn}>✕</button>
        </div>
      </div>) : (<>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-100">{p.username ?? "—"}</div>
          <div className="text-[10px] text-gray-500 font-mono">{p.id}</div>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className="bg-amber-900/40 border border-amber-800 text-amber-200 px-2 py-0.5 rounded-full text-[10px]">💰 {p.gold}</span>
            <span className="bg-blue-900/40 border border-blue-800 text-blue-200 px-2 py-0.5 rounded-full text-[10px]">⭐ Lvl {p.level}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.role === "ADMIN" ? "bg-purple-900/60 border border-purple-700 text-purple-200" : "bg-gray-800 border border-gray-700 text-gray-300"}`}>{p.role}</span>
          </div>
          {p.proficiencies.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{p.proficiencies.map((pr) => <span key={pr.weaponTypeCode} className="bg-gray-800 border border-gray-700 text-gray-300 px-1.5 py-0.5 rounded text-[9px]">{pr.weaponTypeName} Lv{pr.level}</span>)}</div>}
        </div>
        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
          <RoleBtn p={p} />
          <button type="button" disabled={busy} onClick={() => { setEditId(p.id); setD({ username: p.username ?? "", level: String(p.level), gold: String(p.gold) }); }} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-lg transition">✏️</button>
          <button type="button" disabled={busy} onClick={() => act(async () => { if (!window.confirm("Delete?")) return; await adminApi.deletePlayer(playerId, p.id); }, "Deleted")} className={dangerBtn}>🗑</button>
        </div>
      </>)}</div>))}
  </div>);
}
