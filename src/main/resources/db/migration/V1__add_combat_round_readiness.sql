DO $$
BEGIN
    IF to_regclass('public.combats') IS NOT NULL THEN
        ALTER TABLE combats ADD COLUMN IF NOT EXISTS p1_ready boolean NOT NULL DEFAULT false;
        ALTER TABLE combats ADD COLUMN IF NOT EXISTS p2_ready boolean NOT NULL DEFAULT false;
    END IF;
END $$;