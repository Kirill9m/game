CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL,
    damage INTEGER NOT NULL,
    attack_range INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS player_inventory (
    id UUID PRIMARY KEY,
    player_id VARCHAR(255) NOT NULL,
    item_id UUID NOT NULL REFERENCES items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT uq_player_inventory_item UNIQUE (player_id, item_id)
);

DO $$
BEGIN
    IF to_regclass('public.players') IS NOT NULL THEN
        ALTER TABLE player_inventory
            ADD CONSTRAINT fk_player_inventory_player
            FOREIGN KEY (player_id) REFERENCES players(player_id);
    END IF;
END $$;

INSERT INTO items (id, code, name, type, damage, attack_range)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'KNIFE', 'Knife', 'WEAPON', 15, 1),
    ('10000000-0000-0000-0000-000000000002', 'PISTOL', 'Pistol', 'WEAPON', 25, 3)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    damage = EXCLUDED.damage,
    attack_range = EXCLUDED.attack_range;