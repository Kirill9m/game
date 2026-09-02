package spring.backend.game.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class PlayerLoginResponse {
    private String id;
    private String username;
    private String avatarUrl;
    private int positionX;
    private int positionY;
    private List<PlayerInfo> playersOnTile;
}