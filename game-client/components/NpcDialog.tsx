"use client";

import { useEffect, useState } from "react";
import { npcApi } from "@/services/npcApi";
import { NpcDialogue, NpcInfo } from "@/types/npc";

interface NpcDialogProps {
  npc: NpcInfo;
  playerId: string;
  onClose: () => void;
}

export default function NpcDialog({ npc, playerId, onClose }: NpcDialogProps) {
  const [dialogue, setDialogue] = useState<NpcDialogue | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setDialogue(null);
    setError("");
    void npcApi
      .talk(playerId, npc.code)
      .then((response) => {
        if (!cancelled) setDialogue(response);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Conversation failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [npc.code, playerId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <section className="w-full max-w-md rounded-xl border border-amber-700 bg-gray-900 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-400">Conversation</p>
            <h2 className="mt-1 text-xl font-bold text-white">{npc.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded border border-gray-600 px-2 py-1 text-gray-300 hover:bg-gray-800" aria-label="Close conversation">
            X
          </button>
        </div>
        {error && <p className="mt-4 rounded border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">{error}</p>}
        {!dialogue && !error && <p className="mt-5 text-sm text-gray-400">Listening...</p>}
        {dialogue && (
          <>
            <p className="mt-5 leading-6 text-gray-200">{dialogue.dialogue}</p>
            <div className="mt-5 space-y-3">
              {dialogue.quests.map((quest) => (
                <div key={quest.code} className="rounded-lg border border-emerald-700/60 bg-emerald-950/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-emerald-200">{quest.title}</h3>
                    <span className="text-xs uppercase text-emerald-400">{quest.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-300">{quest.description}</p>
                  <p className="mt-2 text-xs text-amber-300">Reward: {quest.reward}</p>
                </div>
              ))}
            </div>
            <button type="button" onClick={onClose} className="mt-5 w-full rounded-lg bg-amber-600 py-2 font-semibold text-white hover:bg-amber-500">
              Continue exploring
            </button>
          </>
        )}
      </section>
    </div>
  );
}
