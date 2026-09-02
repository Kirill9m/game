DO $$
BEGIN
    IF to_regclass('public.combats') IS NOT NULL
       AND to_regclass('public.enemy_types') IS NOT NULL THEN
        UPDATE combats
        SET enemy_type_id = (
            SELECT id FROM enemy_types WHERE code = 'WOLF'
        )
        WHERE player2_id = 'bot_wolf' AND enemy_type_id IS NULL;
    END IF;
END $$;