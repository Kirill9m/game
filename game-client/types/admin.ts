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

export interface AdminEnemyType {
  id: string;
  code: string;
  name: string;
  maxHealth: number;
  damage: number;
  attackRange: number;
  actionPoints: number;
  movementRange: number;
}

export interface CreateEnemyTypePayload {
  code: string;
  name: string;
  maxHealth?: number;
  damage?: number;
  attackRange?: number;
  actionPoints?: number;
  movementRange?: number;
}

export interface UpdateEnemyTypePayload {
  name?: string;
  maxHealth?: number;
  damage?: number;
  attackRange?: number;
  actionPoints?: number;
  movementRange?: number;
}

export interface UpdatePlayerPayload {
  username?: string;
  level?: number;
  gold?: number;
  health?: number;
  strength?: number;
  agility?: number;
  stamina?: number;
  energy?: number;
  positionX?: number;
  positionY?: number;
}

export interface AdminWorldCell {
  id: string;
  positionX: number;
  positionY: number;
  blocked: boolean;
  radiation: number;
  ambushChance: number;
  enemyType: AdminEnemyType | null;
}

export interface UpsertWorldCellPayload {
  positionX: number;
  positionY: number;
  blocked: boolean;
  radiation: number;
  ambushChance: number;
  enemyTypeId: string | null;
}
