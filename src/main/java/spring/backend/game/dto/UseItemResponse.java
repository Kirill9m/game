package spring.backend.game.dto;

import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UseItemResponse {
    /** Player health after using the consumable. */
    private int health;
    /** How much health was actually restored (0 when already at max health). */
    private int healed;
    /** Updated inventory after the consumable was consumed. */
    private List<InventoryItemResponse> inventory;
}
