"use client";

import NpcDialog from "./NpcDialog";
import type { NpcInfo } from "@/types/npc";

interface Props {
  npc: NpcInfo;
  playerId: string;
  onClose: () => void;
}

export default function NpcDialogModal({ npc, playerId, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-2xl">
        <NpcDialog npc={npc} playerId={playerId} onClose={onClose} />
      </div>
    </div>
  );
}
