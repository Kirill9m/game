"use client";

import { motion } from "framer-motion";
import { Position, Posture } from "./types";

interface CharacterTokenProps {
  position: Position;
  posture: Posture;
  /** Label shown above the token. */
  label: string;
  /** Whether this token currently is the animation target (hit flash). */
  isActive: boolean;
  /** CSS palette class, e.g. "combat-marker-you" or "combat-marker-team-a". */
  colorClass: string;
  /** Downed fighters render faded out. */
  down?: boolean;
}

/** The fraction of the board where the center of cell (x, y) lives. */
const cellCenter = (coord: number) => `${(coord + 0.5) * 10}%`;

export function CharacterToken({
  position,
  posture,
  label,
  isActive,
  colorClass,
  down = false,
}: CharacterTokenProps) {
  const postureClass = `combat-posture-${posture.toLowerCase()}`;

  return (
    <motion.div
      className={`combat-marker-wrap ${down ? "combat-marker-down" : ""}`}
      style={{ left: cellCenter(position.x), top: cellCenter(position.y) }}
      initial={{ left: cellCenter(position.x), top: cellCenter(position.y) }}
      animate={{ left: cellCenter(position.x), top: cellCenter(position.y) }}
      transition={{ type: "spring", stiffness: 200, damping: 22, mass: 1.1 }}
      aria-hidden="true"
    >
      <div
        className={`combat-marker-figure ${postureClass} ${isActive ? "combat-marker-active" : ""} ${colorClass}`}
      >
        <span className="combat-marker-shadow" />
        <div className="combat-marker-stance">
          <motion.div
            className="combat-marker-body"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 340, damping: 22 }}
          >
            <span className="tk-helmet" />
            <span className="tk-body">
              <span className="tk-visor" />
            </span>
            <span className="tk-gun" />
            <span className="tk-leg-l" />
            <span className="tk-leg-r" />
          </motion.div>
        </div>
        <span className="combat-marker-label">{label}</span>
      </div>
    </motion.div>
  );
}
