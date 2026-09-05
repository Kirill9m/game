package spring.backend.game.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "players")
public class PlayerEntity {

    @Id
    @Column(name = "player_id", unique = true, nullable = false)
    private String id;

    private String username;

    private String avatarUrl;

    @Column(name = "position_x", nullable = false)
    private int positionX;

    @Column(name = "position_y", nullable = false)
    private int positionY;

    @Column(name = "turn_order", nullable = false)
    private int turnOrder;

    private Instant cooldown;

    @Column(name = "gold", columnDefinition = "integer default 0")
    @Builder.Default
    private int gold = 0;

    @Column(name = "quest_points", columnDefinition = "integer default 0")
    @Builder.Default
    private int questPoints = 0;

    @Column(name = "health", columnDefinition = "integer default 100")
    @Builder.Default
    private int health = 100;

    @Column(name = "level", columnDefinition = "integer default 1")
    @Builder.Default
    private int level = 1;

    @Column(name = "strength", columnDefinition = "integer default 5")
    @Builder.Default
    private int strength = 5;

    @Column(name = "energy", columnDefinition = "integer default 10")
    @Builder.Default
    private int energy = 10;

    @Column(name = "agility", columnDefinition = "integer default 5")
    @Builder.Default
    private int agility = 5;

    @Column(name = "stamina", columnDefinition = "integer default 10")
    @Builder.Default
    private int stamina = 10;

    @Column(name = "role", nullable = false, columnDefinition = "varchar(20) default 'PLAYER'")
    @Builder.Default
    private String role = ROLE_PLAYER;

    /** Marks that the one-time starter items were already granted to this player. */
    @Column(name = "starter_items_granted", nullable = false, columnDefinition = "boolean default false")
    @Builder.Default
    private boolean starterItemsGranted = false;

    /**
     * When set, the player is inside this location (building). Players outside
     * (null) cannot see players inside and vice versa. Movement clears this field.
     */
    @Column(name = "current_location_id")
    private UUID currentLocationId;

    /**
     * When set, the player entered the current location through this specific
     * building. Used to filter NPCs: those with a matching buildingId are shown
     * alongside location-wide NPCs. Cleared when exiting or moving.
     */
    @Column(name = "current_building_id")
    private UUID currentBuildingId;

    /**
     * Last time the player made any request to the server.
     * Used to determine online/offline status (offline if absent for >5 min).
     */
    @Column(name = "last_seen")
    private Instant lastSeen;

    public static final String ROLE_PLAYER = "PLAYER";
    public static final String ROLE_ADMIN = "ADMIN";

    public void addGold(int amount) {
        this.gold += amount;
    }

    public void addQuestPoints(int amount) {
        this.questPoints += amount;
    }

    public int getMoney() {
        return this.gold;
    }

    public void setMoney(int money) {
        this.gold = money;
    }
}