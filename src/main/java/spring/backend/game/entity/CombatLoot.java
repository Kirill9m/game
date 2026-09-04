package spring.backend.game.entity;

/**
 * A loot pile lying on a combat board cell. Dropped when an enemy (or a PvP
 * opponent) dies — the surviving player must walk onto the cell to collect it
 * into their field loot bag (outside the city) or inventory (inside the city).
 *
 * @param x        board column (0..BOARD_SIZE-1)
 * @param y        board row (0..BOARD_SIZE-1)
 * @param itemCode inventory item code
 * @param itemName display name
 * @param quantity how many copies this pile holds
 */
public record CombatLoot(
        int x,
        int y,
        String itemCode,
        String itemName,
        int quantity) {
}