package spring.backend.game.entity;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
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
@Table(name = "enemy_types")
public class EnemyTypeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "max_health", nullable = false)
    private int maxHealth;

    @Column(nullable = false)
    private int damage;

    @Column(name = "attack_range", nullable = false)
    private int attackRange;

    @Column(name = "action_points", nullable = false)
    private int actionPoints;

    @Column(name = "movement_range", nullable = false)
    private int movementRange;

    /** Raw stored loot table (see {@link #setLootDrops}). Kept @JsonIgnore. */
    @Column(name = "loot_data", length = 4000, columnDefinition = "TEXT")
    @JsonIgnore
    private String lootData;

    @Transient
    @JsonIgnore
    private List<EnemyLootDrop> parsedLootDrops = null;

    /** Configured loot drops (served to clients, used by the combat system). */
    public List<EnemyLootDrop> getLootDrops() {
        if (parsedLootDrops == null) {
            parsedLootDrops = parseLootDrops(lootData);
        }
        return parsedLootDrops == null ? List.of() : parsedLootDrops;
    }

    public void setLootDrops(List<EnemyLootDrop> drops) {
        parsedLootDrops = drops == null ? List.of() : drops;
        lootData = writeLootDrops(parsedLootDrops);
    }

    /**
     * Loot table is stored as {@code ITEMCODE|chance|min|max} lines separated
     * by newlines — same plain text pattern as the combat obstacles.
     */
    private static List<EnemyLootDrop> parseLootDrops(String data) {
        if (data == null || data.isBlank()) {
            return List.of();
        }
        List<EnemyLootDrop> result = new ArrayList<>();
        for (String line : data.split("\\n", -1)) {
            String[] parts = line.split("\\|", -1);
            if (parts.length != 4) {
                continue;
            }
            try {
                int chance = Integer.parseInt(parts[1].trim());
                int minQuantity = Math.max(1, Integer.parseInt(parts[2].trim()));
                int maxQuantity = Math.max(minQuantity, Integer.parseInt(parts[3].trim()));
                result.add(new EnemyLootDrop(
                        parts[0].trim().toUpperCase(),
                        Math.max(0, Math.min(100, chance)),
                        minQuantity,
                        maxQuantity));
            } catch (NumberFormatException ignored) {
                // Skip malformed lines instead of losing the whole table.
            }
        }
        return result;
    }

    private static String writeLootDrops(List<EnemyLootDrop> drops) {
        if (drops == null || drops.isEmpty()) {
            return "";
        }
        StringBuilder builder = new StringBuilder();
        for (EnemyLootDrop drop : drops) {
            if (drop == null || drop.itemCode() == null || drop.itemCode().isBlank()) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append('\n');
            }
            builder.append(drop.itemCode().trim().toUpperCase()).append('|')
                    .append(Math.max(0, Math.min(100, drop.chance()))).append('|')
                    .append(Math.max(1, drop.minQuantity())).append('|')
                    .append(Math.max(Math.max(1, drop.minQuantity()), drop.maxQuantity()));
        }
        return builder.toString();
    }
}
