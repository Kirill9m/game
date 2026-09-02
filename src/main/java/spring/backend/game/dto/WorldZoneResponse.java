package spring.backend.game.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class WorldZoneResponse {
    private String name;
    private int centerX;
    private int centerY;
    private int radius;
}
