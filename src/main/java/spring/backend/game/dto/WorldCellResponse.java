package spring.backend.game.dto;

import lombok.Builder;
import lombok.Getter;

/**
 * Public per-cell world settings used by the client world map.
 */
@Getter
@Builder
public class WorldCellResponse {
    private int positionX;
    private int positionY;
    private boolean blocked;
    private int radiation;
    private int ambushChance;
    private String enemyName;
}