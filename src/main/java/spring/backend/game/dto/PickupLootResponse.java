package spring.backend.game.dto;

import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PickupLootResponse {
    /** Field loot bag after the pickup (empty after it was deposited). */
    private List<InventoryItemResponse> lootBag;

    /** Loot piles still lying on the cell after the pickup. */
    private List<WorldLootResponse> fieldLoot;

    /** Main inventory after the pickup (refreshed when picked up in the city). */
    private List<InventoryItemResponse> inventory;

    /** Human readable message describing what happened. */
    private String notice;
}