package spring.backend.game.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A character's weapon proficiency: how skilled a player is with a particular
 * weapon type. The level affects combat accuracy (see CombatService). One row
 * per player per weapon type, managed from the admin panel.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "player_weapon_proficiencies",
        uniqueConstraints = @UniqueConstraint(columnNames = { "player_id", "weapon_type_code" }))
public class PlayerWeaponProficiencyEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "player_id", nullable = false, length = 255)
    private String playerId;

    @Column(name = "weapon_type_code", nullable = false, length = 50)
    private String weaponTypeCode;

    @Column(nullable = false)
    @Builder.Default
    private int level = 0;
}
