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

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "items")
public class ItemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 30)
    private String type;

    /** Optional weapon type (e.g. "PISTOL", "KNIFE", "RIFLE") used for proficiency-based accuracy. */
    @Column(name = "weapon_type_code", length = 50)
    private String weaponTypeCode;

    @Column(nullable = false)
    private int damage;

    @Column(name = "attack_range", nullable = false)
    private int attackRange;

    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    /** Flat damage reduction provided while this armor piece is equipped (0 for weapons/utility). */
    @Column(nullable = false, columnDefinition = "integer default 0")
    @Builder.Default
    private int defense = 0;

    /** Armor slot (HELMET, BODY, LEGS, FEET); {@code null} for weapons and utility items. */
    @Column(name = "equipment_slot", length = 20)
    private String equipmentSlot;
}
