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
 * A destructible combat obstacle type. Admins configure the code, display name
 * and durability (maxHealth) from the admin panel. Each location (game map)
 * picks which obstacle types may appear there; every combat session spawns a
 * random set of them.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "obstacle_types")
public class ObstacleTypeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    /** How much weapon damage the obstacle can absorb before breaking. */
    @Column(name = "max_health", nullable = false)
    private int maxHealth;
}