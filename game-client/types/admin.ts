export interface AdminPlayer {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  level: number;
  gold: number;
  questPoints: number;
}

export interface AdminNpc {
  id: string;
  code: string;
  name: string;
  positionX: number;
  positionY: number;
}

export interface AdminDialogueChoice {
  id: string;
  text: string;
  nextNodeId: string | null;
}

export interface AdminDialogueNode {
  id: string;
  npcId: string;
  text: string;
  isStart: boolean;
  choices: AdminDialogueChoice[];
}

export interface AdminQuest {
  id: string;
  code: string;
  title: string;
  rewardExp: number;
  rewardGold: number;
  rewardItemCode: string | null;
  requiredNpcs: AdminNpc[];
}

export interface AdminItem {
  id: string;
  code: string;
  name: string;
  type: string;
  damage: number;
  attackRange: number;
  width: number;
  height: number;
}

export interface CreateNpcPayload {
  code: string;
  name: string;
  positionX: number;
  positionY: number;
}

export interface CreateQuestPayload {
  code: string;
  title: string;
  rewardExp: number;
  rewardGold: number;
  rewardItemCode: string;
  requiredNpcIds: string[];
}

export interface CreateDialogueNodePayload {
  npcId: string;
  text: string;
  isStart: boolean;
  choices: { text: string; nextNodeId: string | null }[];
}

export interface CreateItemPayload {
  code: string;
  name: string;
  type: string;
  damage: number;
  attackRange: number;
  width: number;
  height: number;
}