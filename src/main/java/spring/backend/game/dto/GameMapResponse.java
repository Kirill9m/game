package spring.backend.game.dto;

import java.util.UUID;

/**
 * Public view of a player map. Contains everything the client needs to render
 * the map (name, center, radius) and the inventory item code that opens it.
 */
public record GameMapResponse(
        UUID id,
        String code,
        String name,
        String description,
        int centerX,
        int centerY,
        int radius,
        String itemCode) {
}