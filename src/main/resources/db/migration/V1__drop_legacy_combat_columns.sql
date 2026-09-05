-- Drops the legacy 1v1 combat columns that were replaced by the participant
-- based model (participants_data). Kept idempotent so it is safe on both an
-- existing dev database (old columns still present with NOT NULL constraints)
-- and a fresh test database (table not yet created by Hibernate ddl-auto).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'combats') THEN
        ALTER TABLE combats DROP COLUMN IF EXISTS player1_id;
        ALTER TABLE combats DROP COLUMN IF EXISTS player2_id;
        ALTER TABLE combats DROP COLUMN IF EXISTS p1_equipped_item_code;
        ALTER TABLE combats DROP COLUMN IF EXISTS p2_equipped_item_code;
        ALTER TABLE combats DROP COLUMN IF EXISTS current_turn_player_id;
        ALTER TABLE combats DROP COLUMN IF EXISTS p1_plan;
        ALTER TABLE combats DROP COLUMN IF EXISTS p2_plan;
        ALTER TABLE combats DROP COLUMN IF EXISTS p1_ready;
        ALTER TABLE combats DROP COLUMN IF EXISTS p2_ready;
        ALTER TABLE combats DROP COLUMN IF EXISTS p1_x;
        ALTER TABLE combats DROP COLUMN IF EXISTS p1_y;
        ALTER TABLE combats DROP COLUMN IF EXISTS p2_x;
        ALTER TABLE combats DROP COLUMN IF EXISTS p2_y;
        ALTER TABLE combats DROP COLUMN IF EXISTS p1_health;
        ALTER TABLE combats DROP COLUMN IF EXISTS p2_health;
        ALTER TABLE combats DROP COLUMN IF EXISTS winner_id;
        ALTER TABLE combats DROP COLUMN IF EXISTS p1_posture;
        ALTER TABLE combats DROP COLUMN IF EXISTS p2_posture;
    END IF;
END $$;
