export interface NpcInfo {
  id: string;
  code: string;
  name: string;
  positionX: number;
  positionY: number;
  /** Percentage position on the location image (0-100), for NPCs inside a building. */
  locationX?: number | null;
  /** Percentage position on the location image (0-100), for NPCs inside a building. */
  locationY?: number | null;
}

export interface QuestInfo {
  code: string;
  title: string;
  description: string;
  reward: string;
  status: "AVAILABLE" | "ACTIVE" | "COMPLETED";
}

export interface NpcDialogue {
  code: string;
  name: string;
  dialogue: string;
  quests: QuestInfo[];
}
