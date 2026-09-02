CREATE TABLE IF NOT EXISTS npcs (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    position_x INTEGER NOT NULL,
    position_y INTEGER NOT NULL,
    dialogue VARCHAR(2000) NOT NULL
);

CREATE TABLE IF NOT EXISTS quests (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    reward VARCHAR(100) NOT NULL,
    giver_npc_code VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS player_quests (
    id UUID PRIMARY KEY,
    player_id VARCHAR(255) NOT NULL,
    quest_id UUID NOT NULL REFERENCES quests(id),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_player_quests_quest UNIQUE (player_id, quest_id)
);

DO $$
BEGIN
    IF to_regclass('public.players') IS NOT NULL THEN
        ALTER TABLE player_quests
            ADD CONSTRAINT fk_player_quests_player
            FOREIGN KEY (player_id) REFERENCES players(player_id);
    END IF;
END $$;

INSERT INTO npcs (id, code, name, position_x, position_y, dialogue)
VALUES (
    '20000000-0000-0000-0000-000000000001',
    'WORLD_GUIDE',
    'World Guide',
    0,
    0,
    'Welcome, traveler. This world is built on old roads, dangerous wilds, and the choices of those brave enough to explore them. Keep your weapons close, watch the terrain, and speak with the people you meet. Every journey begins with a first step.'
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    position_x = EXCLUDED.position_x,
    position_y = EXCLUDED.position_y,
    dialogue = EXCLUDED.dialogue;

INSERT INTO quests (id, code, title, description, reward, giver_npc_code)
VALUES (
    '30000000-0000-0000-0000-000000000001',
    'FIRST_MEETING',
    'First Meeting',
    'Speak with the World Guide and learn about the lands beyond the starting tile.',
    'A place in the world',
    'WORLD_GUIDE'
)
ON CONFLICT (code) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    reward = EXCLUDED.reward,
    giver_npc_code = EXCLUDED.giver_npc_code;
