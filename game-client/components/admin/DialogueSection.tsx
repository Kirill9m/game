"use client";
import { useState } from "react";
import { adminApi } from "@/services/adminApi";
import type { AdminDialogueNode, AdminNpc } from "@/types/admin";
import type { SectionProps, ChoiceDraft } from "./types";
import { inputClass, labelClass, primaryBtn, dangerBtn } from "./ui";

interface Props extends SectionProps {
  npcs: AdminNpc[]; dialogueNodes: AdminDialogueNode[];
  selectedNpcId: string; onSelectNpc: (id: string) => void;
}
export default function DialogueSection({ playerId, busy, setError, setNotice, onRefresh, npcs, dialogueNodes, selectedNpcId, onSelectNpc }: Props) {
  const [nodeText, setNodeText] = useState("");
  const [nodeIsStart, setNodeIsStart] = useState(false);
  const [choices, setChoices] = useState<ChoiceDraft[]>([]);
  const [npcCode, setNpcCode] = useState("");
  const [npcName, setNpcName] = useState("");
  const [npcX, setNpcX] = useState(0);
  const [npcY, setNpcY] = useState(0);

  const act = async (fn: () => Promise<void>, msg?: string) => {
    try { await fn(); if (msg) setNotice(msg); await onRefresh(); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : "Failed"); }
  };
  const selectedNpc = npcs.find((n) => n.id === selectedNpcId);
  const nodeNameById = new Map(npcs.map((n) => [n.id, n.name]));

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
        <label className={labelClass}>NPC</label>
        <div className="flex gap-1.5">
          <select className={inputClass} value={selectedNpcId} onChange={(e) => onSelectNpc(e.target.value)}>
            <option value="">— Select NPC —</option>
            {npcs.map((n) => <option key={n.id} value={n.id}>{n.name} ({n.code}) [{n.positionX}:{n.positionY}]</option>)}
          </select>
          {selectedNpc && <button type="button" disabled={busy} onClick={() => act(async () => { await adminApi.deleteNpc(playerId, selectedNpc.id); onSelectNpc(""); }, "NPC deleted")} className={dangerBtn}>🗑</button>}
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">➕ Create NPC</span>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelClass}>Code</label><input className={inputClass} value={npcCode} onChange={(e) => setNpcCode(e.target.value.toUpperCase())} placeholder="MERCHANT" /></div>
          <div><label className={labelClass}>Name</label><input className={inputClass} value={npcName} onChange={(e) => setNpcName(e.target.value)} placeholder="Merchant" /></div>
          <div><label className={labelClass}>X</label><input type="number" className={inputClass} value={npcX} onChange={(e) => setNpcX(Number(e.target.value) || 0)} /></div>
          <div><label className={labelClass}>Y</label><input type="number" className={inputClass} value={npcY} onChange={(e) => setNpcY(Number(e.target.value) || 0)} /></div>
        </div>
        <button type="button" disabled={busy} onClick={() => act(async () => {
          if (!npcCode.trim() || !npcName.trim()) throw new Error("Code and name required");
          await adminApi.createNpc(playerId, { code: npcCode.trim(), name: npcName.trim(), positionX: npcX, positionY: npcY });
          setNpcCode(""); setNpcName(""); setNotice("NPC created");
        })} className={primaryBtn}>➕ Create NPC</button>
      </div>
      {selectedNpc && (<>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">💬 Nodes for {selectedNpc.name} ({dialogueNodes.length})</span>
          {dialogueNodes.map((node) => (
            <div key={node.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {node.isStart && <span className="text-[9px] font-bold uppercase bg-green-900/50 border border-green-700 text-green-300 px-1.5 py-0.5 rounded-full mr-1.5">START</span>}
                  <span className="text-xs text-gray-200">{node.text}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!node.isStart && <button type="button" disabled={busy} onClick={() => act(async () => { await adminApi.setStartNode(playerId, node.id); }, "Start updated")} className="bg-green-950 hover:bg-green-800 border border-green-800 text-green-200 text-[10px] font-bold px-2 py-1 rounded-lg transition">★</button>}
                  <button type="button" disabled={busy} onClick={() => act(async () => { await adminApi.deleteDialogueNode(playerId, node.id); }, "Deleted")} className={dangerBtn}>🗑</button>
                </div>
              </div>
              {node.choices.length > 0 && <div className="mt-2 flex flex-col gap-1 border-t border-gray-800 pt-2">
                {node.choices.map((c) => <div key={c.id} className="text-[11px] text-gray-400 flex gap-1.5"><span className="text-blue-400">→</span><span className="text-gray-300">{c.text}</span><span className="text-gray-600">{c.nextNodeId ? `(→ ${nodeNameById.get(c.nextNodeId) ?? "node"})` : "(ends)"}</span></div>)}
              </div>}
            </div>
          ))}
          {dialogueNodes.length === 0 && <div className="text-center text-gray-600 text-xs py-3">No dialogue yet.</div>}
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">➕ Add Node</span>
          <div><label className={labelClass}>NPC text</label><textarea className={`${inputClass} min-h-[60px]`} value={nodeText} onChange={(e) => setNodeText(e.target.value)} placeholder="Hello traveler!" /></div>
          <label className="flex items-center gap-2 text-xs text-gray-300"><input type="checkbox" checked={nodeIsStart} onChange={(e) => setNodeIsStart(e.target.checked)} className="rounded" /> Start node</label>
          {choices.map((c, i) => (<div key={i} className="flex gap-1.5 items-end">
            <div className="flex-1"><label className={labelClass}>Choice text</label><input className={inputClass} value={c.text} onChange={(e) => setChoices((prev) => prev.map((ch, j) => j === i ? { ...ch, text: e.target.value } : ch))} /></div>
            <div className="w-32"><label className={labelClass}>Next node</label><select className={inputClass} value={c.nextNodeId} onChange={(e) => setChoices((prev) => prev.map((ch, j) => j === i ? { ...ch, nextNodeId: e.target.value } : ch))}><option value="">(end)</option>{dialogueNodes.map((n) => <option key={n.id} value={n.id}>{n.text.slice(0, 30)}</option>)}</select></div>
            <button type="button" onClick={() => setChoices((prev) => prev.filter((_, j) => j !== i))} className={dangerBtn}>✕</button>
          </div>))}
          <button type="button" onClick={() => setChoices((prev) => [...prev, { text: "", nextNodeId: "" }])} className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-lg transition">➕ Choice</button>
          <button type="button" disabled={busy} onClick={() => act(async () => {
            if (!nodeText.trim()) throw new Error("Text required");
            await adminApi.createDialogueNode(playerId, { npcId: selectedNpcId, text: nodeText.trim(), isStart: nodeIsStart, choices: choices.filter((c) => c.text.trim()).map((c) => ({ text: c.text.trim(), nextNodeId: c.nextNodeId || null })) });
            setNodeText(""); setNodeIsStart(false); setChoices([]); setNotice("Node added");
          })} className={primaryBtn}>➕ Add Node</button>
        </div>
      </>)}
    </div>
  );
}
