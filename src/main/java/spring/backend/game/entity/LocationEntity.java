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
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A "location" is a visual area shown in the Location tab of the World View.
 * It has an optional background image, clickable buildings and NPCs. A building
 * can link to another location (e.g. a town square linking to an inn).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@Table(name = "locations")
public class LocationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    /** World-map cell this location is anchored to. */
    @Column(name = "position_x", nullable = false)
    private int positionX;

    @Column(name = "position_y", nullable = false)
    private int positionY;

    /** URL to the background image; when null the client draws a placeholder. */
    @Column(name = "background_image_url", length = 1000)
    private String backgroundImageUrl;

    /** The location shown first when the Location tab opens. */
    @Column(name = "is_start", nullable = false)
    private boolean isStart;
}
