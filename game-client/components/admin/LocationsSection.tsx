"use client";
import { useRef, useState } from "react";
import { adminApi } from "@/services/adminApi";
import type { AdminLocation, AdminLocationBuilding, AdminNpc } from "@/types/admin";
import type { SectionProps } from "./types";
import { inputClass, labelClass, primaryBtn, dangerBtn, secondaryBtn } from "./ui";

interface Props extends SectionProps {
  locations: AdminLocation[];
  npcs: AdminNpc[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export default function LocationsSection({
  playerId, busy, setError, setNotice, onRefresh, locations, npcs,
}: Props) {
  const [selectedId, setSelectedId] = useState("");
  const selected = locations.find((l) => l.id === selectedId) ?? null;

  // Create location form
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [bgUrl, setBgUrl] = useState("");
  const [isStart, setIsStart] = useState(false);

  // Edit selected location
  const [editName, setEditName] = useState("");
  const [editPosX, setEditPosX] = useState(0);
  const [editPosY, setEditPosY] = useState(0);
  const [editBg, setEditBg] = useState("");
  const [editIsStart, setEditIsStart] = useState(false);

  // Building editor (buildingId === null means "add new")
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [bName, setBName] = useState("");
  const [bEmoji, setBEmoji] = useState("🏠");
  const [bX, setBX] = useState(50);
  const [bY, setBY] = useState(50);
  const [bW, setBW] = useState(20);
  const [bH, setBH] = useState(25);
  const [bBg, setBBg] = useState("");
  const [bTarget, setBTarget] = useState("");

  // NPC placement
  const [npcId, setNpcId] = useState("");
  const [npcX, setNpcX] = useState(50);
  const [npcY, setNpcY] = useState(50);
  const [npcBuildingId, setNpcBuildingId] = useState("");

  const previewRef = useRef<HTMLDivElement | null>(null);

  const act = async (fn: () => Promise<void>, msg?: string) => {
    setError(""); setNotice("");
    try { await fn(); if (msg) setNotice(msg); await onRefresh(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };

  const resetBuildingDraft = () => {
    setBuildingId(null); setBName(""); setBEmoji("🏠");
    setBX(50); setBY(50); setBW(20); setBH(25); setBBg(""); setBTarget("");
  };

  const selectLocation = (loc: AdminLocation) => {
    setSelectedId(loc.id);
    setEditName(loc.name);
    setEditPosX(loc.positionX);
    setEditPosY(loc.positionY);
    setEditBg(loc.backgroundImageUrl ?? "");
    setEditIsStart(loc.isStart);
    resetBuildingDraft();
  };

  const selectBuilding = (b: AdminLocationBuilding) => {
    setBuildingId(b.id); setBName(b.name); setBEmoji(b.emoji ?? "🏠");
    setBX(b.x); setBY(b.y); setBW(b.width); setBH(b.height);
    setBBg(b.backgroundImageUrl ?? "");
    setBTarget(b.targetLocationId ?? "");
  };

  const onPreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    setBX(clamp(((e.clientX - rect.left) / rect.width) * 100));
    setBY(clamp(((e.clientY - rect.top) / rect.height) * 100));
  };

  const saveBuilding = () => act(async () => {
    if (!selected) return;
    if (!bName.trim()) throw new Error("Building name required");
    const payload = {
      name: bName.trim(),
      x: clamp(bX),
      y: clamp(bY),
      width: Math.max(1, clamp(bW)),
      height: Math.max(1, clamp(bH)),
      emoji: bEmoji.trim() || null,
      backgroundImageUrl: bBg.trim() || null,
      targetLocationId: bTarget || null,
    };
    if (buildingId) await adminApi.updateLocationBuilding(playerId, buildingId, payload);
    else await adminApi.createLocationBuilding(playerId, selected.id, payload);
    setNotice(buildingId ? "Building updated" : "Building created");
    resetBuildingDraft();
  });

  const saveLocation = () => act(async () => {
    if (!selected) return;
    await adminApi.updateLocation(playerId, selected.id, {
      name: editName, positionX: editPosX, positionY: editPosY,
      backgroundImageUrl: editBg || null, isStart: editIsStart,
    });
    setNotice("Location saved");
  });

  const createLocation = () => act(async () => {
    if (!code.trim() || !name.trim()) throw new Error("Code and name required");
    const created = await adminApi.createLocation(playerId, {
      code: code.trim(), name: name.trim(), positionX: posX, positionY: posY,
      backgroundImageUrl: bgUrl || null, isStart,
    });
    setCode(""); setName(""); setBgUrl(""); setIsStart(false);
    selectLocation(created);
    setNotice("Location created");
  });

  const placeNpc = () => act(async () => {
    if (!selected || !npcId) return;
    await adminApi.placeLocationNpc(playerId, selected.id, npcId, {
      locationX: clamp(npcX), locationY: clamp(npcY),
      buildingId: npcBuildingId || null,
    });
    setNotice("NPC placed");
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Location list */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
          🗺️ Locations ({locations.length})
        </span>
        <div className="flex flex-wrap gap-1.5">
          {locations.map((loc) => (
            <button key={loc.id} type="button" onClick={() => selectLocation(loc)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition ${selectedId === loc.id ? "bg-emerald-900/60 border-emerald-600 text-emerald-200" : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"}`}>
              {loc.isStart ? "🏁 " : ""}{loc.name} [{loc.positionX}:{loc.positionY}]
            </button>
          ))}
          {locations.length === 0 && (
            <span className="text-[11px] text-gray-600">None yet — create the first location below.</span>
          )}
        </div>
      </div>

      {/* Create location */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">➕ Create Location</span>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelClass}>Code</label><input className={inputClass} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="TOWN" /></div>
          <div><label className={labelClass}>Name</label><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Town" /></div>
          <div><label className={labelClass}>Map X</label><input type="number" className={inputClass} value={posX} onChange={(e) => setPosX(Number(e.target.value) || 0)} /></div>
          <div><label className={labelClass}>Map Y</label><input type="number" className={inputClass} value={posY} onChange={(e) => setPosY(Number(e.target.value) || 0)} /></div>
          <div className="col-span-2"><label className={labelClass}>Background image URL</label><input className={inputClass} value={bgUrl} onChange={(e) => setBgUrl(e.target.value)} placeholder="https://…/town.png" /></div>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={isStart} onChange={(e) => setIsStart(e.target.checked)} className="rounded" /> Start location (opened first in the tab)</label>
        <button type="button" disabled={busy} onClick={createLocation} className={primaryBtn}>➕ Create Location</button>
      </div>

      {selected && (
        <>
          {/* Edit selected location */}
          <div className="bg-gray-900 border border-emerald-900/60 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">✏️ {selected.name}</span>
              <button type="button" disabled={busy} onClick={() => act(async () => {
                await adminApi.deleteLocation(playerId, selected.id);
                setSelectedId(""); setBuildingId(null);
              }, "Location deleted")} className={dangerBtn}>🗑 Delete</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelClass}>Name</label><input className={inputClass} value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
              <div><label className={labelClass}>Background URL</label><input className={inputClass} value={editBg} onChange={(e) => setEditBg(e.target.value)} placeholder="https://…" /></div>
              <div><label className={labelClass}>Map X</label><input type="number" className={inputClass} value={editPosX} onChange={(e) => setEditPosX(Number(e.target.value) || 0)} /></div>
              <div><label className={labelClass}>Map Y</label><input type="number" className={inputClass} value={editPosY} onChange={(e) => setEditPosY(Number(e.target.value) || 0)} /></div>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={editIsStart} onChange={(e) => setEditIsStart(e.target.checked)} className="rounded" /> Start location</label>
            <button type="button" disabled={busy} onClick={saveLocation} className={primaryBtn}>💾 Save Location</button>
          </div>

          {/* Preview + building editor */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">🏛️ Buildings</span>
              <span className="text-[10px] text-gray-500">Click the map to place a new building</span>
            </div>
            <div
              ref={previewRef}
              onClick={onPreviewClick}
              className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-950 cursor-crosshair"
            >
              {selected.backgroundImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.backgroundImageUrl} alt={selected.name} className="absolute inset-0 h-full w-full object-cover pointer-events-none" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black" />
              )}
              {selected.buildings.map((b) => (
                <button key={b.id} type="button" onClick={(e) => { e.stopPropagation(); selectBuilding(b); }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center gap-0.5 rounded border text-white transition ${buildingId === b.id ? "border-emerald-400 bg-emerald-800/80 ring-2 ring-emerald-400" : "border-amber-300/50 bg-amber-900/70 hover:bg-amber-800/80"}`}
                  style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.width}%`, height: `${b.height}%` }}>
                  <span className="text-lg leading-none">{b.emoji || "🏠"}</span>
                  <span className="text-[8px] font-bold uppercase px-1 leading-tight">{b.name}</span>
                </button>
              ))}
              {selected.npcs.map((n) => (
                <button key={n.id} type="button" onClick={(e) => { e.stopPropagation(); act(async () => {
                  await adminApi.removeLocationNpc(playerId, selected.id, n.id);
                }, `Removed ${n.name}`); }}
                  className="absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-sky-300 bg-sky-700 text-sm"
                  style={{ left: `${n.locationX}%`, top: `${n.locationY}%` }}
                  title={`Remove ${n.name}`}>👤</button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelClass}>Name</label><input className={inputClass} value={bName} onChange={(e) => setBName(e.target.value)} placeholder="Inn" /></div>
              <div><label className={labelClass}>Emoji</label><input className={inputClass} value={bEmoji} onChange={(e) => setBEmoji(e.target.value)} placeholder="🏨" /></div>
              <div><label className={labelClass}>X %</label><input type="number" className={inputClass} value={bX} onChange={(e) => setBX(Number(e.target.value) || 0)} /></div>
              <div><label className={labelClass}>Y %</label><input type="number" className={inputClass} value={bY} onChange={(e) => setBY(Number(e.target.value) || 0)} /></div>
              <div><label className={labelClass}>Width %</label><input type="number" className={inputClass} value={bW} onChange={(e) => setBW(Number(e.target.value) || 1)} /></div>
              <div><label className={labelClass}>Height %</label><input type="number" className={inputClass} value={bH} onChange={(e) => setBH(Number(e.target.value) || 1)} /></div>
              <div className="col-span-2"><label className={labelClass}>Background image URL</label><input className={inputClass} value={bBg} onChange={(e) => setBBg(e.target.value)} placeholder="https://..." /></div>
              {bBg.trim() && (
                <div className="col-span-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={bBg.trim()}
                    alt="Building preview"
                    className="w-full h-32 object-cover rounded-lg border border-gray-700"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}
              <div className="col-span-2"><label className={labelClass}>Enter → location</label>
                <select className={inputClass} value={bTarget} onChange={(e) => setBTarget(e.target.value)}>
                  <option value="">(none — decorative)</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={saveBuilding} className={primaryBtn}>
                {buildingId ? "💾 Update Building" : "➕ Add Building"}
              </button>
              {buildingId && (
                <button type="button" disabled={busy} onClick={() => act(async () => {
                  await adminApi.deleteLocationBuilding(playerId, buildingId);
                  resetBuildingDraft();
                }, "Building deleted")} className={dangerBtn}>🗑</button>
              )}
              <button type="button" onClick={resetBuildingDraft} className={secondaryBtn}>New</button>
            </div>
          </div>

          {/* NPC placement */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">👥 Characters in {selected.name}</span>
            <div className="flex gap-2 items-end">
              <div className="flex-1"><label className={labelClass}>NPC</label>
                <select className={inputClass} value={npcId} onChange={(e) => setNpcId(e.target.value)}>
                  <option value="">— Select NPC —</option>
                  {npcs.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.code}){n.locationId ? (n.locationId === selected.id ? " · here" : " · in location") : " · world"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-40"><label className={labelClass}>In Building</label>
                <select className={inputClass} value={npcBuildingId} onChange={(e) => setNpcBuildingId(e.target.value)}>
                  <option value="">(location-wide)</option>
                  {selected.buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} {b.emoji || "🏠"}</option>
                  ))}
                </select>
              </div>
              <div className="w-20"><label className={labelClass}>X %</label><input type="number" className={inputClass} value={npcX} onChange={(e) => setNpcX(Number(e.target.value) || 0)} /></div>
              <div className="w-20"><label className={labelClass}>Y %</label><input type="number" className={inputClass} value={npcY} onChange={(e) => setNpcY(Number(e.target.value) || 0)} /></div>
              <button type="button" disabled={busy || !npcId} onClick={placeNpc} className={primaryBtn}>Place</button>
            </div>
            {selected.npcs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {selected.npcs.map((n) => (
                  <span key={n.id} className="flex items-center gap-1.5 text-[11px] bg-sky-950/60 border border-sky-800 text-sky-200 px-2 py-1 rounded-full">
                    👤 {n.name}
                    <button type="button" disabled={busy} onClick={() => act(async () => {
                      await adminApi.removeLocationNpc(playerId, selected.id, n.id);
                    }, `Removed ${n.name}`)} className="text-red-300 hover:text-red-100">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

