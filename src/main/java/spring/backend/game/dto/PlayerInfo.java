package spring.backend.game.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class PlayerInfo {
    private String playerId;
    private String username;
    /** False when the player hasn't sent a heartbeat in the last 5 minutes. */
    private boolean online;
}
