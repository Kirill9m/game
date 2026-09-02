CREATE TABLE IF NOT EXISTS enemy_types (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    max_health INTEGER NOT NULL,
    damage INTEGER NOT NULL,
    attack_range INTEGER NOT NULL,
    action_points INTEGER NOT NULL,
    movement_range INTEGER NOT NULL
);

DO $$
BEGIN
    IF to_regclass('public.combats') IS NOT NULL THEN
        ALTER TABLE combats
            ADD COLUMN IF NOT EXISTS enemy_type_id UUID REFERENCES enemy_types(id);
    END IF;
END $$;

INSERT INTO enemy_types (id, code, name, max_health, damage, attack_range, action_points, movement_range)
VALUES
    ('00000000-0000-0000-0000-000000000001', 'WOLF', 'Wolf', 500, 20, 1, 5, 5),
    ('00000000-0000-0000-0000-000000000002', 'BEAR', 'Bear', 800, 40, 1, 3, 2),
    ('00000000-0000-0000-0000-000000000003', 'ARCHER', 'Archer', 250, 35, 5, 4, 3)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    max_health = EXCLUDED.max_health,
    damage = EXCLUDED.damage,
    attack_range = EXCLUDED.attack_range,
    action_points = EXCLUDED.action_points,
    movement_range = EXCLUDED.movement_range;
