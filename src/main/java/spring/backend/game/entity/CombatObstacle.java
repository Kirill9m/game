package spring.backend.game.entity;

/**
 * A single destructible obstacle placed on a combat board. Serialised into the
 * {@code obstacles_data} column of a combat session and sent to clients so the
 * board can render obstacles (with their remaining durability).
 *
 * @param x             board column (0..BOARD_SIZE-1)
 * @param y             board row (0..BOARD_SIZE-1)
 * @param code          obstacle type code (e.g. CRATE, WALL)
 * @param name          display name
 * @param maxHealth     full durability
 * @param currentHealth remaining durability; at 0 the obstacle is destroyed and
 *                      its cell becomes passable
 */
public record CombatObstacle(
        int x,
        int y,
        String code,
        String name,
        int maxHealth,
        int currentHealth) {

    public boolean isAlive() {
        return currentHealth > 0;
    }
}