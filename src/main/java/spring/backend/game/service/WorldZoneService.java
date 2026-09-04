package spring.backend.game.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.WorldZoneResponse;
import spring.backend.game.entity.WorldZoneEntity;
import spring.backend.game.repository.WorldZoneRepository;

@Service
@RequiredArgsConstructor
public class WorldZoneService {
    private final WorldZoneRepository worldZoneRepository;

    public WorldZoneResponse getSafeZone() {
        WorldZoneEntity zone = worldZoneRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new IllegalStateException("Safe zone is not configured"));
        return toResponse(zone);
    }

    public boolean isInsideSafeZone(int x, int y) {
        WorldZoneEntity zone = worldZoneRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new IllegalStateException("Safe zone is not configured"));
        long distanceX = (long) x - zone.getCenterX();
        long distanceY = (long) y - zone.getCenterY();
        return distanceX * distanceX + distanceY * distanceY <= (long) zone.getRadius() * zone.getRadius();
    }

    /**
     * Create or update the single safe zone (there is only one zone, used as the
     * village). When no zone is configured yet, a new one is created.
     */
    @Transactional
    public WorldZoneResponse updateSafeZone(String name, int centerX, int centerY, int radius) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Safe zone name is required");
        }
        if (radius <= 0) {
            throw new IllegalArgumentException("Safe zone radius must be positive");
        }
        WorldZoneEntity zone = worldZoneRepository.findFirstByOrderByIdAsc().orElseGet(() ->
                WorldZoneEntity.builder().build());
        zone.setName(name.trim());
        zone.setCenterX(centerX);
        zone.setCenterY(centerY);
        zone.setRadius(radius);
        return toResponse(worldZoneRepository.save(zone));
    }

    /**
     * True when the cell is outside the safe zone. When no safe zone is
     * configured at all, every cell is considered outside (dangerous).
     */
    public boolean isOutsideSafeZone(int x, int y) {
        return worldZoneRepository.findFirstByOrderByIdAsc()
                .map(zone -> {
                    long distanceX = (long) x - zone.getCenterX();
                    long distanceY = (long) y - zone.getCenterY();
                    return distanceX * distanceX + distanceY * distanceY
                            > (long) zone.getRadius() * zone.getRadius();
                })
                .orElse(true);
    }

    private WorldZoneResponse toResponse(WorldZoneEntity zone) {
        return WorldZoneResponse.builder()
                .name(zone.getName())
                .centerX(zone.getCenterX())
                .centerY(zone.getCenterY())
                .radius(zone.getRadius())
                .build();
    }
}