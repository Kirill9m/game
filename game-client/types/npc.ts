export interface NpcInfo {
  id: string;
  code: string;
  name: string;
  positionX: number;
  positionY: number;
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
