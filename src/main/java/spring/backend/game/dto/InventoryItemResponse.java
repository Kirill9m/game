package spring.backend.game.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class InventoryItemResponse {
    private String code;
    private String name;
    private String type;
    private int damage;
    private int attackRange;
    private int quantity;
}
