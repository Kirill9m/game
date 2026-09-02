DO $$
BEGIN
    IF to_regclass('public.combats') IS NOT NULL THEN
        ALTER TABLE combats ADD COLUMN IF NOT EXISTS p1_posture varchar(20) NOT NULL DEFAULT 'STANDING';
        ALTER TABLE combats ADD COLUMN IF NOT EXISTS p2_posture varchar(20) NOT NULL DEFAULT 'STANDING';
    END IF;
END $$;
