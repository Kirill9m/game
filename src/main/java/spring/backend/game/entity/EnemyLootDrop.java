package spring.backend.game.entity;

/**
 * One configured loot drop entry of an enemy type. When the enemy dies in
 * combat the server rolls {@code chance} (0..100); on success it drops
 * between minQuantity and maxQuantity copies of the item on the combat board
 * that the winner must walk to and pick up.
 *
 * @param itemCode    inventory item code (see {@code ItemEntity})
 * @param chance     drop chance in percent (0..100)
 * @param minQuantity minimal copies dropped (>= 1)
 * @param maxQuantity maximal copies dropped (>= minQuantity)
 */
public record EnemyLootDrop(
        String itemCode,
        int chance,
        int minQuantity,
        int maxQuantity) {
}