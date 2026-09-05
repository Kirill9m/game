"use client";

import { AnimatePresence, motion } from "framer-motion";
import InventoryPanel from "./InventoryPanel";
import type { InventoryItem } from "@/types/game";

interface Props {
  open: boolean;
  inventory: InventoryItem[];
  playerId: string;
  onClose: () => void;
  onItemsChange: (items: InventoryItem[]) => void;
}

export default function MobileCombatInventory({
  open,
  inventory,
  playerId,
  onClose,
  onItemsChange,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            className="relative w-full h-[68dvh] rounded-t-3xl border-t border-amber-500/40 bg-gray-900 p-3 flex flex-col"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            <div className="flex items-center justify-between shrink-0 border-b border-gray-800 pb-2 mb-2">
              <span className="text-xs uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
                🎒 Combat Inventory
              </span>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 active:scale-95 transition"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <InventoryPanel
                items={inventory}
                playerId={playerId}
                onItemsChange={onItemsChange}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
