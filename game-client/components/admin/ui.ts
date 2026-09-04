/** Shared Tailwind class constants for the admin panel. */

export const inputClass =
  "w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500";

export const labelClass =
  "block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1";

export const primaryBtn =
  "bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-3 py-1.5 rounded-lg transition";

export const dangerBtn =
  "bg-red-950 hover:bg-red-800 border border-red-800 text-red-200 text-[10px] font-bold px-2 py-1 rounded-lg transition";

export const secondaryBtn =
  "bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-[10px] font-bold px-2 py-1 rounded-lg transition";

/** World-editor constants matching WorldConstants on the backend. */
export const WORLD_SIZE = 1000;
export const WORLD_MIN = -500;
export const WORLD_MAX = WORLD_MIN + WORLD_SIZE - 1;
export const VIEW_SIZE = 10;
export const VIEW_HALF = Math.floor(VIEW_SIZE / 2);
