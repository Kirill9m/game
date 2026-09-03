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
    private int gold;
    private int questPoints;
    private int health;
    private int level;
    private int strength;
    private int energy;
    private int agility;
    private int stamina;
    private List<PlayerInfo> playersOnTile;
    private List<NpcInfoResponse> npcs;
}