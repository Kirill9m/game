package spring.backend.game.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.UUID;

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
    private String role;
    private List<PlayerInfo> playersOnTile;
    private List<NpcInfoResponse> npcs;

    /** Loot piles lying on the player's current cell. */
    private List<WorldLootResponse> fieldLoot;

    /** True when the player is inside the city (safe zone). */
    private boolean inSafeZone;

    /** When non-null, the player is inside this location/building. */
    private UUID currentLocationId;

    /** Players inside the same location/building as the player. */
    private List<PlayerInfo> playersInLocation;
}