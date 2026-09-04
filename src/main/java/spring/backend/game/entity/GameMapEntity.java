package spring.backend.game.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A player-viewable map. Each map is bound to an inventory item (by item code)
 * and shows a circular area of the world centered at {@code (centerX, centerY)}
 * with the given radius. Different maps can show completely different regions
 * of the world, so players can buy/find several maps and open them from the
 * inventory.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "game_maps")
public class GameMapEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 255)
    private String description;

    /** X coordinate of the map center (world coordinates, may be negative). */
    @Column(name = "center_x", nullable = false)
    private int centerX;

    /** Y coordinate of the map center (world coordinates, may be negative). */
    @Column(name = "center_y", nullable = false)
    private int centerY;

    /** How many world cells around the center are visible on this map. */
    @Column(nullable = false)
    private int radius;

    /** Inventory item code that opens this map (e.g. WORLD_MAP). */
    @Column(name = "item_code", nullable = false, unique = true, length = 50)
    private String itemCode;
}