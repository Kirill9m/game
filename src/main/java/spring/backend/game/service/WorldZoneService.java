package spring.backend.game.service;

import org.springframework.stereotype.Service;

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

    private WorldZoneResponse toResponse(WorldZoneEntity zone) {
        return WorldZoneResponse.builder()
                .name(zone.getName())
                .centerX(zone.getCenterX())
                .centerY(zone.getCenterY())
                .radius(zone.getRadius())
                .build();
    }
}
