"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface CombatLogProps {
  entries: string[];
}

export function CombatLog({ entries }: CombatLogProps) {
  const [expanded, setExpanded] = useState(false);
  const latest = entries[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="w-full shrink-0"
    >
      {/* Compact toggle — a single row that does not eat combat space */}
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full flex items-center gap-2 rounded-xl border border-gray-700/70 bg-gray-900/80 px-3 py-1.5 text-[11px] backdrop-blur-sm"
      >
        <span className="font-semibold uppercase tracking-wider text-gray-500 shrink-0">
          📜 Log
        </span>
        <span className="flex-1 truncate text-left text-gray-300">
          {latest || "No events yet."}
        </span>
        <span className="shrink-0 text-gray-500">{expanded ? "▾" : "▸"}</span>
      </button>

      {expanded && (
        <div className="mt-1 h-24 overflow-y-auto space-y-1 rounded-xl border border-gray-700/70 bg-gray-900/80 px-3 py-2 text-xs backdrop-blur-sm">
          {entries.length === 0 && (
            <p className="text-gray-600 italic">No events yet.</p>
          )}
          {entries.map((entry, index) => (
            <motion.p
              key={`${entry}-${index}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.3) }}
              className="text-gray-300"
            >
              {entry}
            </motion.p>
          ))}
        </div>
      )}
    </motion.div>
  );
}