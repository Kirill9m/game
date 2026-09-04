export interface AdminPlayer {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  level: number;
  gold: number;
  questPoints: number;
  proficiencies: AdminProficiency[];
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
  weaponTypeCode: string | null;
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
  weaponTypeCode?: string | null;
  damage: number;
  attackRange: number;
  width: number;
  height: number;
}

/** A configurable weapon type; proficiency in it raises combat accuracy. */
export interface AdminWeaponType {
  id: string;
  code: string;
  name: string;
  accuracyPerLevel: number;
  maxAccuracy: number;
}

export interface CreateWeaponTypePayload {
  code: string;
  name: string;
  accuracyPerLevel?: number;
  maxAccuracy?: number;
}

export type UpdateWeaponTypePayload = Partial<CreateWeaponTypePayload>;

/** A character's proficiency level in one weapon type. */
export interface AdminProficiency {
  weaponTypeCode: string;
  weaponTypeName: string;
  level: number;
}

export interface SetProficiencyPayload {
  weaponTypeCode: string;
  level: number;
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
  /** Configured loot drops (items that fall on the combat board when killed). */
  lootDrops: EnemyLootDropPayload[];
}

/** One loot drop row configured for an enemy (item, chance %, min/max quantity). */
export interface EnemyLootDropPayload {
  itemCode: string;
  chance: number;
  minQuantity: number;
  maxQuantity: number;
}

export interface CreateEnemyTypePayload {
  code: string;
  name: string;
  maxHealth?: number;
  damage?: number;
  attackRange?: number;
  actionPoints?: number;
  movementRange?: number;
  lootDrops?: EnemyLootDropPayload[];
}

export interface UpdateEnemyTypePayload {
  name?: string;
  maxHealth?: number;
  damage?: number;
  attackRange?: number;
  actionPoints?: number;
  movementRange?: number;
  lootDrops?: EnemyLootDropPayload[];
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
  /** Obstacle types that may spawn when a combat starts on this cell. */
  obstacleTypes: AdminObstacleType[];
}

export interface UpsertWorldCellPayload {
  positionX: number;
  positionY: number;
  blocked: boolean;
  radiation: number;
  ambushChance: number;
  enemyTypeId: string | null;
  obstacleTypeIds: string[];
}

/** Admin view of a player map (world area opened from the inventory). */
export interface AdminGameMap {
  id: string;
  code: string;
  name: string;
  description: string | null;
  centerX: number;
  centerY: number;
  radius: number;
  itemCode: string;
}

export interface CreateGameMapPayload {
  code: string;
  name: string;
  description: string | null;
  centerX: number;
  centerY: number;
  radius: number;
  itemCode: string;
}

export type UpdateGameMapPayload = Partial<CreateGameMapPayload>;

/** A destructible combat obstacle type (configurable durability). */
export interface AdminObstacleType {
  id: string;
  code: string;
  name: string;
  maxHealth: number;
}

export interface CreateObstacleTypePayload {
  code: string;
  name: string;
  maxHealth?: number;
}

export interface UpdateObstacleTypePayload {
  name?: string;
  maxHealth?: number;
}

/** Update payload for the single world safe zone (village circle). */
export interface UpdateWorldZonePayload {
  name: string;
  centerX: number;
  centerY: number;
  radius: number;
}
