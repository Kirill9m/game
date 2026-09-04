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
 * A configurable weapon type (e.g. KNIFE, PISTOL, RIFLE, SHOTGUN).
 * Each weapon type defines how much accuracy a character gains per level of
 * weapon proficiency ({@code accuracyPerLevel}) and the maximum accuracy bonus
 * that proficiency can provide ({@code maxAccuracy}). Managed from the admin
 * panel.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "weapon_types")
public class WeaponTypeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "accuracy_per_level", nullable = false)
    @Builder.Default
    private int accuracyPerLevel = 5;

    @Column(name = "max_accuracy", nullable = false)
    @Builder.Default
    private int maxAccuracy = 25;
}
