package spring.backend.game.entity;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "combats")
public class CombatSessionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String player1Id;
    private String player2Id;

    @Column(name = "p1_equipped_item_code", length = 50)
    private String p1EquippedItemCode;

    @Column(name = "p2_equipped_item_code", length = 50)
    private String p2EquippedItemCode;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enemy_type_id")
    private EnemyTypeEntity enemyType;

    private String currentTurnPlayerId;

    @Column(length = 4000)
    private String p1Plan;

    @Column(length = 4000)
    private String p2Plan;

    @Builder.Default
    private boolean p1Ready = false;

    @Builder.Default
    private boolean p2Ready = false;

    @Builder.Default
    private int actionPoints = 3;

    @Builder.Default
    private int p1X = 0;

    @Builder.Default
    private int p1Y = 0;

    @Builder.Default
    private int p2X = 5;

    @Builder.Default
    private int p2Y = 5;

    @Builder.Default
    private int p1Health = 100;

    @Builder.Default
    private int p2Health = 100;

    private String winnerId;

    @Builder.Default
    private String status = "IN_PROGRESS";

    /**
     * Optimistic-lock counter. Hibernate bumps it on every save, so clients can
     * drop stale polling responses that arrive after a newer combat state.
     */
    @Version
    private Long version;

    @Builder.Default
    private String p1Posture = "STANDING";

    @Builder.Default
    private String p2Posture = "STANDING";

    @Column(length = 4000)
    @JsonIgnore
    private String lastRoundActionsData;

    @Transient
    @Builder.Default
    private String[] lastRoundActions = new String[0];

    public String[] getLastRoundActions() {
        if (lastRoundActions.length == 0 && lastRoundActionsData != null && !lastRoundActionsData.isBlank()) {
            lastRoundActions = lastRoundActionsData.split("\\n", -1);
        }
        return lastRoundActions;
    }

    public void setLastRoundActions(String[] actions) {
        lastRoundActions = actions == null ? new String[0] : actions;
        lastRoundActionsData = String.join("\n", lastRoundActions);
    }

@Column(name = "obstacles_data", length = 4000)
    @JsonIgnore
    private String obstaclesData;

    @Transient
    private List<CombatObstacle> obstacles;

    @Transient
    @JsonIgnore
    private boolean obstaclesParsed = false;

    /** Destructible obstacles currently placed on this combat board. */
    public List<CombatObstacle> getObstacles() {
        if (!obstaclesParsed) {
            obstacles = parseObstacles(obstaclesData);
            obstaclesParsed = true;
        }
        return obstacles == null ? List.of() : obstacles;
    }

    public void setObstacles(List<CombatObstacle> newObstacles) {
        obstacles = newObstacles == null ? new ArrayList<>() : new ArrayList<>(newObstacles);
        obstaclesData = writeObstacles(obstacles);
        obstaclesParsed = true;
    }

    @Column(name = "loot_data", length = 4000)
    @JsonIgnore
    private String lootData;

    @Transient
    private List<CombatLoot> loot;

    @Transient
    @JsonIgnore
    private boolean lootParsed = false;

    /**
     * Loot piles lying on this combat board (dropped by a defeated enemy or
     * PvP opponent). The winner collects them by walking onto the cell.
     */
    public List<CombatLoot> getLoot() {
        if (!lootParsed) {
            loot = parseCombatLoot(lootData);
            lootParsed = true;
        }
        return loot == null ? List.of() : loot;
    }

    public void setLoot(List<CombatLoot> newLoot) {
        loot = newLoot == null ? new ArrayList<>() : new ArrayList<>(newLoot);
        lootData = writeCombatLoot(loot);
        lootParsed = true;
    }

    /** Stored as {@code x|y|itemCode|itemName|quantity} lines (same pattern as obstacles). */
    private static List<CombatLoot> parseCombatLoot(String data) {
        if (data == null || data.isBlank()) {
            return List.of();
        }
        List<CombatLoot> result = new ArrayList<>();
        for (String line : data.split("\\n", -1)) {
            String[] parts = line.split("\\|", -1);
            if (parts.length != 5) {
                continue;
            }
            try {
                result.add(new CombatLoot(
                        Integer.parseInt(parts[0].trim()),
                        Integer.parseInt(parts[1].trim()),
                        parts[2].trim(),
                        parts[3].trim(),
                        Integer.parseInt(parts[4].trim())));
            } catch (NumberFormatException ignored) {
                // Skip malformed lines instead of losing the whole board.
            }
        }
        return result;
    }

    private static String writeCombatLoot(List<CombatLoot> value) {
        StringBuilder builder = new StringBuilder();
        for (CombatLoot pile : value) {
            if (builder.length() > 0) {
                builder.append('\n');
            }
            builder.append(pile.x()).append('|')
                    .append(pile.y()).append('|')
                    .append(pile.itemCode()).append('|')
                    .append(pile.itemName().replace('|', '/').replace('\n', ' ')).append('|')
                    .append(pile.quantity());
        }
        return builder.toString();
    }

    /**
     * Obstacles are stored as "x|y|code|name|maxHealth|currentHealth" lines
     * separated by newlines — same plain text pattern as lastRoundActions.
     * Newlines and pipes in the display name are sanitised so the format is
     * always parseable regardless of what an admin typed.
     */
    private static List<CombatObstacle> parseObstacles(String data) {
        if (data == null || data.isBlank()) {
            return List.of();
        }
        List<CombatObstacle> result = new ArrayList<>();
        for (String line : data.split("\n", -1)) {
            String[] parts = line.split("\\|", -1);
            if (parts.length != 6) {
                continue;
            }
            try {
                result.add(new CombatObstacle(
                        Integer.parseInt(parts[0].trim()),
                        Integer.parseInt(parts[1].trim()),
                        parts[2].trim(),
                        parts[3].trim(),
                        Integer.parseInt(parts[4].trim()),
                        Integer.parseInt(parts[5].trim())));
            } catch (NumberFormatException ignored) {
                // Skip malformed lines instead of losing the whole board.
            }
        }
        return result;
    }

    private static String writeObstacles(List<CombatObstacle> value) {
        StringBuilder builder = new StringBuilder();
        for (CombatObstacle obstacle : value) {
            if (builder.length() > 0) {
                builder.append('\n');
            }
            builder.append(obstacle.x()).append('|')
                    .append(obstacle.y()).append('|')
                    .append(obstacle.code()).append('|')
                    .append(obstacle.name().replace('|', '/').replace('\n', ' ')).append('|')
                    .append(obstacle.maxHealth()).append('|')
                    .append(obstacle.currentHealth());
        }
        return builder.toString();
    }

    @Transient
    public String getEnemyTypeCode() {
        return enemyType == null ? null : enemyType.getCode();
    }

    @Transient
    public String getEnemyName() {
        return enemyType == null ? null : enemyType.getName();
    }
}
