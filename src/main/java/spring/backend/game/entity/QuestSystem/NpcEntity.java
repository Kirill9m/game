package spring.backend.game.entity.QuestSystem;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@Table(name = "npcs")
public class NpcEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "position_x", nullable = false)
    private int positionX;

    @Column(name = "position_y", nullable = false)
    private int positionY;

    /**
     * When set, this NPC lives inside a location (Location tab) instead of on
     * the open world map. The {@link #locationX}/{@link #locationY} values are
     * percentages (0-100) of the location image.
     */
    @Column(name = "location_id")
    private UUID locationId;

    /**
     * When set, the NPC is only visible when the player entered through this
     * specific building (the building's target location must match this NPC's
     * locationId). This lets different buildings leading to the same location
     * show different sets of NPCs.
     */
    @Column(name = "building_id")
    private UUID buildingId;

    @Column(name = "location_x")
    private Integer locationX;

    @Column(name = "location_y")
    private Integer locationY;
}