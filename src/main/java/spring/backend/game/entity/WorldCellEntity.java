package spring.backend.game.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Per-cell world settings configured from the admin panel:
 * blocking, radiation damage and enemy ambush chance.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "world_cells", uniqueConstraints = @UniqueConstraint(columnNames = { "position_x", "position_y" }))
public class WorldCellEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "position_x", nullable = false)
    private int positionX;

    @Column(name = "position_y", nullable = false)
    private int positionY;

    /** When true players cannot step onto this cell. */
    @Column(nullable = false)
    @Builder.Default
    private boolean blocked = false;

    /** Health damage applied when a player steps onto this cell. */
    @Column(nullable = false)
    @Builder.Default
    private int radiation = 0;

    /** Percent chance (0..100) that an enemy ambush triggers when entering. */
    @Column(name = "ambush_chance", nullable = false)
    @Builder.Default
    private int ambushChance = 0;

    /** Enemy type used for the ambush (null = no ambush). */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "enemy_type_id")
    private EnemyTypeEntity enemyType;
}