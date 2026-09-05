package spring.backend.game.dto;

import java.util.UUID;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NpcInfoResponse {
    private UUID id;
    private String code;
    private String name;
    private int positionX;
    private int positionY;

    /** Percentage position on the location image (0-100), for NPCs inside a building. */
    private Integer locationX;

    /** Percentage position on the location image (0-100), for NPCs inside a building. */
    private Integer locationY;
}
