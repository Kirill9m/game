package spring.backend.game.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class MoveResponse {
    private int positionX;
    private int positionY;
    private List<PlayerInfo> playersOnTile;
    private List<NpcInfoResponse> npcs;
    private Instant cooldown;

    /** Player health after the move (radiation may have reduced it). */
    private int health;

    /** Health lost to radiation on this step (0 when the cell is clean). */
    private int radiationDamage;

    /** True when an enemy ambush triggered and a combat session was started. */
    private boolean combatStarted;

    /** Id of the combat session created by the ambush (null when no ambush). */
    private UUID combatId;

    /** Name of the ambushing enemy (null when no ambush). */
    private String enemyName;

    /** Loot piles lying on the target cell. */
    private List<WorldLootResponse> fieldLoot;

    /** Main inventory after the move (marked field loot is secured on city entry). */
    private List<InventoryItemResponse> inventory;

    /** True when entering the city secured the player's marked field loot. */
    private boolean lootDeposited;

    /** How many marked items were secured (0 when nothing changed). */
    private int lootDepositedCount;

    /** True when the target cell is inside the city (safe zone). */
    private boolean inSafeZone;
}