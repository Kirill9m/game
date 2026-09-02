DO $$
BEGIN
    IF to_regclass('public.combats') IS NOT NULL THEN
        ALTER TABLE combats ADD COLUMN IF NOT EXISTS last_round_actions_data varchar(4000);
    END IF;
END $$;