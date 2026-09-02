package spring.backend.game.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NpcInfoResponse {
    private String code;
    private String name;
    private int positionX;
    private int positionY;
}
