/** Local UI types for the admin panel (not API contracts). */

export type Section =
  | "quests"
  | "dialogues"
  | "items"
  | "weapons"
  | "enemies"
  | "players"
  | "world"
  | "zone"
  | "maps"
  | "obstacles"
  | "hunt";

export interface ChoiceDraft {
  text: string;
  nextNodeId: string;
}

export interface LootRowDraft {
  itemCode: string;
  chance: number;
  minQuantity: number;
  maxQuantity: number;
}

/** Props shared by every admin section component. */
export interface SectionProps {
  playerId: string;
  busy: boolean;
  setError: (msg: string) => void;
  setNotice: (msg: string) => void;
  onRefresh: () => Promise<void>;
}
