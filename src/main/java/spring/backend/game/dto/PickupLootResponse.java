package spring.backend.game.dto;

import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PickupLootResponse {
    /** Loot piles still lying on the cell after the pickup. */
    private List<WorldLootResponse> fieldLoot;

    /** Main inventory after the pickup (picked up items are marked outside the city). */
    private List<InventoryItemResponse> inventory;

    /** Human readable message describing what happened. */
    private String notice;
}