"use client";

import { motion } from "framer-motion";
import { Position, Posture } from "./types";

interface CharacterTokenProps {
  /** Which fighter this token represents — p1 or p2. */
  playerKey: "p1" | "p2";
  position: Position;
  posture: Posture;
  /** Label shown above the token. */
  label: string;
  /** Whether this token currently is the animation target (hit flash). */
  isActive: boolean;
  /** Whether this token belongs to the current player (blue palette). */
  isYou?: boolean;
}

/** The fraction of the board where the center of cell (x, y) lives. */
const cellCenter = (coord: number) => `${(coord + 0.5) * 10}%`;

export function CharacterToken({
  position,
  posture,
  label,
  isActive,
  isYou = false,
}: CharacterTokenProps) {
  const postureClass = `combat-posture-${posture.toLowerCase()}`;

  return (
    <motion.div
      className="combat-marker-wrap"
      style={{ left: cellCenter(position.x), top: cellCenter(position.y) }}
      initial={{ left: cellCenter(position.x), top: cellCenter(position.y) }}
      animate={{ left: cellCenter(position.x), top: cellCenter(position.y) }}
      transition={{ type: "spring", stiffness: 200, damping: 22, mass: 1.1 }}
      aria-hidden="true"
    >
      <div
        className={`combat-marker-figure ${postureClass} ${isActive ? "combat-marker-active" : ""} ${isYou ? "combat-marker-you" : "combat-marker-foe"}`}
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