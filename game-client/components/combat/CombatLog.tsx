"use client";

import { motion } from "framer-motion";

interface CombatLogProps {
  entries: string[];
}

export function CombatLog({ entries }: CombatLogProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="w-full bg-gray-900/80 p-3 rounded-xl border border-gray-700/70 h-28 overflow-y-auto text-xs space-y-1 backdrop-blur-sm"
    >
      <p className="font-semibold text-gray-500">Combat Log</p>
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
    </motion.div>
  );
}