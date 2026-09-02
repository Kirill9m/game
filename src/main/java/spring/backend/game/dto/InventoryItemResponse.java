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
    private int width;
    private int height;
    private int gridX;
    private int gridY;
    private boolean equipped;
}
