package spring.backend.game.dto;

import java.util.List;

/**
 * The client picks which loot piles to take. Piles are addressed by their
 * zero-based index inside the combat's {@code loot} array, and the player must
 * be standing on the pile's cell or an adjacent cell.
 */
public record CombatLootPickupRequest(List<Integer> pileIndexes) {
    public CombatLootPickupRequest {
        pileIndexes = pileIndexes == null ? List.of() : List.copyOf(pileIndexes);
    }
}