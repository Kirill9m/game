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

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enemy_type_id")
    private EnemyTypeEntity enemyType;

    @Builder.Default
    private int actionPoints = 3;

    /**
     * The team that won the combat (a team string, not a player id). {@code null}
     * while the combat is still contested, or when everybody died (draw). When a
     * team wins the combat stays open (status {@code IN_PROGRESS}) so the survivors
     * can collect the dropped loot; it flips to {@code FINISHED} once the loot is
     * taken.
     */
    private String winnerTeam;

    /**
     * Epoch millis when the current turn expires. When the deadline passes, the
     * server auto-submits an empty plan for every fighter that has not acted yet
     * and resolves the round. {@code 0} means no deadline (not started/finished).
     */
    @Builder.Default
    private long turnDeadlineMillis = 0;

    @Builder.Default
    private String status = "IN_PROGRESS";

    /**
     * Optimistic-lock counter. Hibernate bumps it on every save, so clients can
     * drop stale polling responses that arrive after a newer combat state.
     */
    @Version
    private Long version;

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

    @Column(name = "participants_data", length = 8000)
    @JsonIgnore
    private String participantsData;

    @Transient
    private List<CombatParticipant> participants;

    @Transient
    @JsonIgnore
    private boolean participantsParsed = false;

    /** Every fighter and spectator taking part in (or watching) this combat. */
    public List<CombatParticipant> getParticipants() {
        if (!participantsParsed) {
            participants = parseParticipants(participantsData);
            participantsParsed = true;
        }
        if (participants == null) {
            participants = new ArrayList<>();
        }
        return participants;
    }

    public void setParticipants(List<CombatParticipant> newParticipants) {
        participants = newParticipants == null ? new ArrayList<>() : new ArrayList<>(newParticipants);
        participantsData = writeParticipants(participants);
        participantsParsed = true;
    }

    /** Finds a participant by player id, or {@code null} when not present. */
    public CombatParticipant findParticipant(String playerId) {
        if (playerId == null) {
            return null;
        }
        return getParticipants().stream()
                .filter(p -> playerId.equals(p.getPlayerId()))
                .findFirst()
                .orElse(null);
    }

    /** The fighters only (spectators excluded). */
    public List<CombatParticipant> fighters() {
        return getParticipants().stream()
                .filter(CombatParticipant::isFighter)
                .toList();
    }

    private static List<CombatParticipant> parseParticipants(String data) {
        if (data == null || data.isBlank()) {
            return new ArrayList<>();
        }
        List<CombatParticipant> result = new ArrayList<>();
        for (String line : data.split("\n", -1)) {
            String[] parts = line.split("\\|", -1);
            if (parts.length < 10) {
                continue;
            }
            try {
                result.add(CombatParticipant.builder()
                        .playerId(parts[0])
                        .team(parts[1])
                        .role(parts[2])
                        .x(Integer.parseInt(parts[3].trim()))
                        .y(Integer.parseInt(parts[4].trim()))
                        .health(Integer.parseInt(parts[5].trim()))
                        .posture(parts[6].isBlank() ? "STANDING" : parts[6])
                        .equippedItemCode("-".equals(parts[7]) ? null : parts[7])
                        .ready(Boolean.parseBoolean(parts[8]))
                        .plan("-".equals(parts[9]) ? null : parts[9])
                        .build());
            } catch (NumberFormatException ignored) {
                // Skip malformed lines instead of losing the whole board.
            }
        }
        return result;
    }

    private static String writeParticipants(List<CombatParticipant> value) {
        StringBuilder builder = new StringBuilder();
        for (CombatParticipant participant : value) {
            if (builder.length() > 0) {
                builder.append('\n');
            }
            builder.append(sanitise(participant.getPlayerId())).append('|')
                    .append(sanitise(participant.getTeam())).append('|')
                    .append(sanitise(participant.getRole())).append('|')
                    .append(participant.getX()).append('|')
                    .append(participant.getY()).append('|')
                    .append(participant.getHealth()).append('|')
                    .append(sanitise(participant.getPosture())).append('|')
                    .append(participant.getEquippedItemCode() == null ? "-" : sanitise(participant.getEquippedItemCode())).append('|')
                    .append(participant.isReady()).append('|')
                    .append(participant.getPlan() == null ? "-" : sanitise(participant.getPlan()));
        }
        return builder.toString();
    }

    private static String sanitise(String value) {
        if (value == null) {
            return "";
        }
        return value.replace('|', '/').replace('\n', ' ');
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
