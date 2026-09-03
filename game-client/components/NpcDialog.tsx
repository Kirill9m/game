"use client";

import { useEffect, useState } from "react";
import { npcApi } from "@/services/npcApi";

export interface DialogueChoiceDto {
  id: string;
  text: string;
  endsDialogue: boolean;
}

export interface DialogueNodeDto {
  id: string;
  npcName: string;
  text: string;
  choices: DialogueChoiceDto[];
}

interface NpcInfo {
  id: string;
  code: string;
  name: string;
}

interface NpcDialogProps {
  npc: NpcInfo;
  playerId: string;
  activeQuestId?: string; // ID of the current quest to track progress
  onClose: () => void;
}

export default function NpcDialog({
  npc,
  playerId,
  activeQuestId,
  onClose,
}: NpcDialogProps) {
  const [currentNode, setCurrentNode] = useState<DialogueNodeDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  // 1. Start the dialogue when the window opens
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    npcApi
      .startDialogue(npc.id, playerId)
      .then((node) => {
        if (!cancelled) {
          setCurrentNode(node);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to start dialogue",
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [npc.id, playerId]);

  // 2. Handle a dialogue choice click
  const handleSelectChoice = async (choiceId: string) => {
    try {
      setLoading(true);
      const nextNode = await npcApi.selectChoice(
        playerId,
        choiceId,
        activeQuestId,
      );

      if (!nextNode) {
        // Dialogue finished (204 No Content from the server)
        onClose();
      } else {
        setCurrentNode(nextNode);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit choice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <section className="w-full max-w-md rounded-xl border border-amber-700 bg-gray-900 p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-400">
              Dialogue
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">{npc.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-600 px-2 py-1 text-gray-300 hover:bg-gray-800"
            aria-label="Close dialogue"
          >
            ✕
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-4 rounded border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
            {error}
          </p>
        )}

        {/* Loading */}
        {loading && !currentNode && !error && (
          <p className="mt-5 text-sm text-gray-400">Listening to the character...</p>
        )}

        {/* Current NPC line and answer options */}
        {currentNode && (
          <>
            <p className="mt-5 leading-6 text-gray-200">{currentNode.text}</p>

            <div className="mt-5 space-y-2">
              {currentNode.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSelectChoice(choice.id)}
                  className="w-full rounded-lg border border-amber-700/60 bg-amber-950/30 p-3 text-left font-medium text-amber-200 transition hover:bg-amber-900/50 hover:text-white disabled:opacity-50"
                >
                  ➔ {choice.text}
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}