package spring.backend.game.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
public class PlayerInfo {
    private String playerId;
    private String username;
}
