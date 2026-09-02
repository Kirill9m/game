CREATE TABLE IF NOT EXISTS world_zones (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    center_x INTEGER NOT NULL,
    center_y INTEGER NOT NULL,
    radius INTEGER NOT NULL CHECK (radius >= 0)
);

INSERT INTO world_zones (name, center_x, center_y, radius)
SELECT 'Blue Sanctuary', 4, 4, 3
WHERE NOT EXISTS (SELECT 1 FROM world_zones);
