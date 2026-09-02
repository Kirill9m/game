ALTER TABLE items ADD COLUMN IF NOT EXISTS width INTEGER NOT NULL DEFAULT 1;
ALTER TABLE items ADD COLUMN IF NOT EXISTS height INTEGER NOT NULL DEFAULT 1;
ALTER TABLE player_inventory ADD COLUMN IF NOT EXISTS grid_x INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_inventory ADD COLUMN IF NOT EXISTS grid_y INTEGER NOT NULL DEFAULT 0;
ALTER TABLE player_inventory ADD COLUMN IF NOT EXISTS equipped BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE items SET width = 1, height = 2 WHERE code = 'KNIFE';
UPDATE items SET width = 2, height = 2 WHERE code = 'PISTOL';

INSERT INTO items (id, code, name, type, damage, attack_range, width, height)
VALUES ('10000000-0000-0000-0000-000000000003', 'WORLD_MAP', 'World Map', 'UTILITY', 0, 0, 2, 2)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    damage = EXCLUDED.damage,
    attack_range = EXCLUDED.attack_range,
    width = EXCLUDED.width,
    height = EXCLUDED.height;

UPDATE player_inventory inventory
SET grid_x = CASE items.code WHEN 'PISTOL' THEN 2 WHEN 'WORLD_MAP' THEN 5 ELSE 0 END,
    grid_y = 0
FROM items
WHERE inventory.item_id = items.id;