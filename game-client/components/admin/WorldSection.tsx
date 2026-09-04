"use client";
import { useState } from "react";
import { adminApi } from "@/services/adminApi";
import type { AdminEnemyType, AdminObstacleType, AdminWorldCell } from "@/types/admin";
import type { WorldZone } from "@/types/game";
import type { SectionProps } from "./types";
import { inputClass, labelClass, primaryBtn, dangerBtn, WORLD_MIN, WORLD_MAX, VIEW_SIZE, VIEW_HALF } from "./ui";

interface Props extends SectionProps {
  section: "world" | "zone"; worldCells: AdminWorldCell[]; safeZone: WorldZone | null;
  enemies: AdminEnemyType[]; obstacleTypes: AdminObstacleType[];
  setWorldCells: (c: AdminWorldCell[]) => void; setSafeZone: (z: WorldZone | null) => void;
}

export default function WorldSection({ playerId, busy, setError, setNotice, onRefresh, section, worldCells, safeZone, enemies, obstacleTypes, setSafeZone }: Props) {
  const [viewOrigin, setViewOrigin] = useState({ x: 0, y: 0 });
  const [jumpX, setJumpX] = useState(0); const [jumpY, setJumpY] = useState(0);
  const [sel, setSel] = useState({ x: 0, y: 0 });
  const [cBlocked, setBlocked] = useState(false); const [cRad, setRad] = useState(0);
  const [cAmbush, setAmbush] = useState(0); const [cEnemyId, setEnemyId] = useState("");
  const [cObstacleIds, setObstacleIds] = useState<string[]>([]);
  const [zName, setZName] = useState("Village"); const [zX, setZX] = useState(0);
  const [zY, setZY] = useState(0); const [zR, setZR] = useState(4);

  const act = async (fn: () => Promise<void>, msg?: string) => {
    try { await fn(); if (msg) setNotice(msg); await onRefresh(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };
  const clampView = (x: number, y: number) => ({ x: Math.max(WORLD_MIN, Math.min(WORLD_MAX - VIEW_SIZE + 1, x)), y: Math.max(WORLD_MIN, Math.min(WORLD_MAX - VIEW_SIZE + 1, y)) });
  const moveView = (dx: number, dy: number) => setViewOrigin((o) => clampView(o.x + dx, o.y + dy));
  const selectCell = (x: number, y: number) => {
    setSel({ x, y }); const ex = worldCells.find((c) => c.positionX === x && c.positionY === y);
    setBlocked(ex?.blocked ?? false); setRad(ex?.radiation ?? 0); setAmbush(ex?.ambushChance ?? 0);
    setEnemyId(ex?.enemyType?.id ?? ""); setObstacleIds(ex?.obstacleTypes?.map((o) => o.id) ?? []);
  };
  const jumpTo = (x: number, y: number) => { const cx = Math.max(WORLD_MIN, Math.min(WORLD_MAX, x)); const cy = Math.max(WORLD_MIN, Math.min(WORLD_MAX, y)); setJumpX(cx); setJumpY(cy); setViewOrigin(clampView(cx - VIEW_HALF, cy - VIEW_HALF)); selectCell(cx, cy); };

  if (section === "zone") return (<div className="flex flex-col gap-3"><div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">🏘️ Safe Zone</span>
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2"><label className={labelClass}>Name</label><input className={inputClass} value={zName} onChange={(e) => setZName(e.target.value)} /></div>
      <div><label className={labelClass}>Center X</label><input type="number" className={inputClass} value={zX} onChange={(e) => setZX(Number(e.target.value) || 0)} /></div>
      <div><label className={labelClass}>Center Y</label><input type="number" className={inputClass} value={zY} onChange={(e) => setZY(Number(e.target.value) || 0)} /></div>
      <div className="col-span-2"><label className={labelClass}>Radius</label><input type="number" min={1} className={inputClass} value={zR} onChange={(e) => setZR(Math.max(1, Number(e.target.value) || 1))} /></div>
    </div>
    <button type="button" disabled={busy} onClick={() => act(async () => { const u = await adminApi.updateSafeZone(playerId, { name: zName, centerX: zX, centerY: zY, radius: zR }); setSafeZone(u); setNotice("Zone updated"); })} className={primaryBtn}>💾 Save</button>
  </div></div>);

  // WORLD minimap + cell editor
  return (<div className="flex flex-col gap-3">
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">🗺️ World Cells</span>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => moveView(0, 1)} className="h-8 w-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-200 text-xs flex items-center justify-center">▲</button>
          <button type="button" onClick={() => moveView(-1, 0)} className="h-8 w-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-200 text-xs flex items-center justify-center">◀</button>
          <button type="button" onClick={() => setViewOrigin({ x: 0, y: 0 })} className="h-8 w-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-200 text-xs flex items-center justify-center">🏠</button>
          <button type="button" onClick={() => moveView(1, 0)} className="h-8 w-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-200 text-xs flex items-center justify-center">▶</button>
          <button type="button" onClick={() => moveView(0, -1)} className="h-8 w-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-200 text-xs flex items-center justify-center">▼</button>
        </div>
        <div className="flex items-center gap-1.5">
          <input type="number" className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-100" value={jumpX} onChange={(e) => setJumpX(Number(e.target.value) || 0)} />
          <span className="text-xs text-gray-500">:</span>
          <input type="number" className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-100" value={jumpY} onChange={(e) => setJumpY(Number(e.target.value) || 0)} />
          <button type="button" disabled={busy} onClick={() => jumpTo(jumpX, jumpY)} className={primaryBtn}>Go</button>
        </div>
      </div>
      <div className="w-full max-w-[320px] aspect-square overflow-hidden rounded-md border border-gray-700 bg-gray-950 p-1">
        <div className="grid h-full w-full gap-px bg-gray-950" style={{ gridTemplateColumns: `repeat(${VIEW_SIZE}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${VIEW_SIZE}, minmax(0, 1fr))` }}>
          {Array.from({ length: VIEW_SIZE * VIEW_SIZE }, (_, idx) => { const x = viewOrigin.x + (idx % VIEW_SIZE); const y = viewOrigin.y + (VIEW_SIZE - 1 - Math.floor(idx / VIEW_SIZE)); const st = worldCells.find((c) => c.positionX === x && c.positionY === y); const inS = safeZone && ((x - safeZone.centerX) ** 2 + (y - safeZone.centerY) ** 2 <= safeZone.radius ** 2); const isSel = sel.x === x && sel.y === y; let bg = inS ? "bg-blue-800/50" : "bg-red-900/40"; let icon = ""; if (st?.blocked) { bg = "bg-gray-800"; icon = "🚫"; } else if ((st?.radiation ?? 0) > 0) { bg = "bg-lime-800/70"; icon = "☢️"; } if ((st?.ambushChance ?? 0) > 0 && !st?.blocked) { bg = icon ? bg : "bg-orange-800/70"; icon = icon || "👹"; }
            return (<button key={`${x}:${y}`} type="button" onClick={() => selectCell(x, y)} className={`relative flex items-center justify-center transition ${bg} ${isSel ? "ring-2 ring-blue-400 z-10" : "hover:ring-1 hover:ring-gray-400"}`} title={`[${x}:${y}]`}><span className="text-[8px] text-gray-500 absolute top-0.5 left-1">{icon}</span></button>); })}
        </div>
      </div>
    </div>
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">📍 Cell [{sel.x}:{sel.y}]</span>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={cBlocked} onChange={(e) => setBlocked(e.target.checked)} /> Blocked</label>
        <div><label className={labelClass}>Radiation</label><input type="number" min={0} className={inputClass} value={cRad} onChange={(e) => setRad(Number(e.target.value) || 0)} /></div>
        <div><label className={labelClass}>Ambush %</label><input type="number" min={0} max={100} className={inputClass} value={cAmbush} onChange={(e) => setAmbush(Number(e.target.value) || 0)} /></div>
        <div><label className={labelClass}>Enemy</label><select className={inputClass} value={cEnemyId} onChange={(e) => setEnemyId(e.target.value)}><option value="">(none)</option>{enemies.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}</select></div>
      </div>
      <div><label className={labelClass}>Obstacles</label><div className="flex flex-wrap gap-1 mt-1">{obstacleTypes.map((ob) => <button key={ob.id} type="button" onClick={() => setObstacleIds((prev) => prev.includes(ob.id) ? prev.filter((id) => id !== ob.id) : [...prev, ob.id])} className={`text-[10px] px-2 py-0.5 rounded-full border transition ${cObstacleIds.includes(ob.id) ? "bg-green-900/60 border-green-700 text-green-200" : "bg-gray-800 border-gray-700 text-gray-400"}`}>{ob.name}</button>)}</div></div>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => act(async () => { if (cEnemyId && cAmbush <= 0) throw new Error("Ambush > 0 required with enemy"); await adminApi.upsertWorldCell(playerId, { positionX: sel.x, positionY: sel.y, blocked: cBlocked, radiation: cRad, ambushChance: cEnemyId ? cAmbush : 0, enemyTypeId: cEnemyId || null, obstacleTypeIds: cObstacleIds }); setNotice("Cell saved"); })} className={primaryBtn}>💾 Save</button>
        <button type="button" disabled={busy} onClick={() => act(async () => { const cell = worldCells.find((c) => c.positionX === sel.x && c.positionY === sel.y); if (cell) await adminApi.deleteWorldCell(playerId, String(cell.id)); setNotice("Removed"); })} className={dangerBtn}>🗑</button>
      </div>
    </div>
  </div>);
}

