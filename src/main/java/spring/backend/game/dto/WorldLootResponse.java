package spring.backend.game.dto;

import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WorldLootResponse {
    private UUID id;
    private String itemCode;
    private String itemName;
    private int quantity;
    private String ownerId;
    private String ownerName;
    private int positionX;
    private int positionY;
}