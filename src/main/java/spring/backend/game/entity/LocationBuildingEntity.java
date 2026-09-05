package spring.backend.game.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A clickable building placed on a location's background image. Clicking it
 * navigates the player to the {@link #targetLocation} (another location).
 * Coordinates/sizes are percentages (0-100) of the location image, with x/y
 * representing the centre of the building.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@Table(name = "location_buildings")
public class LocationBuildingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", nullable = false)
    private LocationEntity location;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private int x;

    @Column(nullable = false)
    private int y;

    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    /** Optional emoji/icon shown over the building marker. */
    @Column(length = 50)
    private String emoji;

    /**
     * URL to the building's own background image. When set and a player enters
     * this building, the Location tab will display this image instead of the
     * target location's background, giving each building its own visual identity
     * (e.g. an interior photo). Null falls back to the target location's image.
     */
    @Column(name = "background_image_url", length = 1000)
    private String backgroundImageUrl;

    /** The location opened when the building is entered (nullable = decorative). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_location_id")
    private LocationEntity targetLocation;
}
