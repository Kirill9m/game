package spring.backend.game.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@Builder
public class MoveResponse {
    private int positionX;
    private int positionY;
    private List<PlayerInfo> playersOnTile;
    private List<NpcInfoResponse> npcs;
    private Instant cooldown;
}