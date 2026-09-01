package spring.backend.game.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class GameResponse {
    private UUID id;
    private String status;
    private UUID currentTurnPlayerId;
}
