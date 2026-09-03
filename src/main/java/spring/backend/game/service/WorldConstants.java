package spring.backend.game.service;

/**
 * World geometry constants. The world is a 1000x1000 grid that extends into
 * negative coordinates: valid X/Y range is WORLD_MIN..WORLD_MAX.
 */
public final class WorldConstants {
    public static final int WORLD_SIZE = 1000;
    public static final int WORLD_MIN = -500;
    public static final int WORLD_MAX = 499;

    private WorldConstants() {
    }
}
