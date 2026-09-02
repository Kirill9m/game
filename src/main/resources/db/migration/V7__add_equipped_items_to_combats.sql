DO $$
BEGIN
  IF to_regclass('public.combats') IS NOT NULL THEN
    ALTER TABLE combats
      ADD COLUMN IF NOT EXISTS p1_equipped_item_code VARCHAR(50),
      ADD COLUMN IF NOT EXISTS p2_equipped_item_code VARCHAR(50);

    UPDATE combats
    SET p1_equipped_item_code = 'PISTOL'
    WHERE p1_equipped_item_code IS NULL;

    UPDATE combats
    SET p2_equipped_item_code = 'PISTOL'
    WHERE p2_equipped_item_code IS NULL
      AND enemy_type_id IS NULL;
  END IF;
END $$;
