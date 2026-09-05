package spring.backend.game.service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import spring.backend.game.dto.LocationDtos;
import spring.backend.game.dto.MoveResponse;
import spring.backend.game.entity.LocationBuildingEntity;
import spring.backend.game.entity.LocationEntity;
import spring.backend.game.entity.QuestSystem.NpcEntity;
import spring.backend.game.repository.LocationBuildingRepository;
import spring.backend.game.repository.LocationRepository;
import spring.backend.game.repository.QuestSystem.NpcRepository;

/**
 * Manages the Location tab: areas with a background image, clickable buildings
 * and NPCs. Provides both player-facing reads and admin CRUD operations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;
    private final LocationBuildingRepository buildingRepository;
    private final NpcRepository npcRepository;
    private final MovementService movementService;

    @Transactional(readOnly = true)
    public List<LocationDtos.LocationDto> getAllLocations() {
        return locationRepository.findAllByOrderByCodeAsc().stream()
                .map(this::toLocationDto)
                .toList();
    }

    @Transactional
    public LocationDtos.LocationDto createLocation(String code, String name, int positionX, int positionY,
                                                   String backgroundImageUrl, boolean isStart) {
        String normalizedCode = requireNonBlank(code, "Location code is required").trim().toUpperCase(Locale.ROOT);
        if (locationRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new IllegalArgumentException("Location code already exists: " + normalizedCode);
        }
        LocationEntity location = locationRepository.save(LocationEntity.builder()
                .code(normalizedCode)
                .name(requireNonBlank(name, "Location name is required").trim())
                .positionX(positionX)
                .positionY(positionY)
                .backgroundImageUrl(normalizeUrl(backgroundImageUrl))
                .isStart(isStart)
                .build());
        return toLocationDto(location);
    }

    @Transactional
    public LocationDtos.LocationDto updateLocation(UUID locationId, String name, Integer positionX, Integer positionY,
                                                   String backgroundImageUrl, Boolean isStart) {
        LocationEntity location = getLocation(locationId);
        if (name != null && !name.isBlank()) {
            location.setName(name.trim());
        }
        if (positionX != null) {
            location.setPositionX(positionX);
        }
        if (positionY != null) {
            location.setPositionY(positionY);
        }
        if (backgroundImageUrl != null) {
            location.setBackgroundImageUrl(normalizeUrl(backgroundImageUrl));
        }
        if (isStart != null) {
            location.setStart(isStart);
        }
        return toLocationDto(locationRepository.save(location));
    }

    @Transactional
    public void deleteLocation(UUID locationId) {
        LocationEntity location = getLocation(locationId);

        // Detach NPCs living in this location (they become world NPCs again).
        for (NpcEntity npc : npcRepository.findByLocationId(locationId)) {
            npc.setLocationId(null);
            npc.setLocationX(null);
            npc.setLocationY(null);
            npcRepository.save(npc);
        }

        // Remove buildings that point to this location as their target.
        for (LocationBuildingEntity inbound : buildingRepository.findByTargetLocationId(locationId)) {
            inbound.setTargetLocation(null);
            buildingRepository.save(inbound);
        }

        buildingRepository.deleteAll(buildingRepository.findByLocationId(locationId));
        locationRepository.delete(location);
        log.info("Deleted location '{}'", location.getCode());
    }

    @Transactional
    public LocationDtos.LocationBuildingDto createBuilding(UUID locationId, String name, Integer x, Integer y,
                                                           Integer width, Integer height, String emoji,
                                                           UUID targetLocationId) {
        LocationEntity location = getLocation(locationId);
        LocationBuildingEntity building = LocationBuildingEntity.builder()
                .location(location)
                .name(requireNonBlank(name, "Building name is required").trim())
                .x(clampPercent(x, 0))
                .y(clampPercent(y, 0))
                .width(Math.max(1, clampPercent(width, 10)))
                .height(Math.max(1, clampPercent(height, 10)))
                .emoji(emoji == null ? null : emoji.trim())
                .targetLocation(targetLocationId == null ? null : getLocation(targetLocationId))
                .build();
        return toBuildingDto(buildingRepository.save(building));
    }

    @Transactional
    public LocationDtos.LocationBuildingDto updateBuilding(UUID buildingId, String name, Integer x, Integer y,
                                                           Integer width, Integer height, String emoji,
                                                           UUID targetLocationId) {
        LocationBuildingEntity building = getBuilding(buildingId);
        if (name != null && !name.isBlank()) {
            building.setName(name.trim());
        }
        if (x != null) {
            building.setX(clampPercent(x, building.getX()));
        }
        if (y != null) {
            building.setY(clampPercent(y, building.getY()));
        }
        if (width != null) {
            building.setWidth(Math.max(1, clampPercent(width, building.getWidth())));
        }
        if (height != null) {
            building.setHeight(Math.max(1, clampPercent(height, building.getHeight())));
        }
        if (emoji != null) {
            building.setEmoji(emoji.trim());
        }
        if (targetLocationId != null) {
            building.setTargetLocation(getLocation(targetLocationId));
        }
        return toBuildingDto(buildingRepository.save(building));
    }

    /**
     * Enters a location (a named "room"): the player's world position is moved
     * to the location's coordinates, so everyone inside the same location shares
     * a tile and can see/fight each other. The client returns to the previous
     * location by calling this method again with the parent location's id.
     */
    @Transactional
    public MoveResponse enterLocation(UUID locationId, String playerId) {
        LocationEntity location = getLocation(locationId);
        return movementService.teleportPlayer(playerId, location.getPositionX(), location.getPositionY());
    }

    @Transactional
    public void deleteBuilding(UUID buildingId) {
        LocationBuildingEntity building = getBuilding(buildingId);
        buildingRepository.delete(building);
        log.info("Deleted building '{}'", building.getName());
    }

    @Transactional
    public void placeNpc(UUID locationId, UUID npcId, Integer locationX, Integer locationY) {
        getLocation(locationId);
        NpcEntity npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new EntityNotFoundException("NPC not found: " + npcId));
        npc.setLocationId(locationId);
        npc.setLocationX(clampPercent(locationX, 50));
        npc.setLocationY(clampPercent(locationY, 50));
        npcRepository.save(npc);
        log.info("Placed NPC '{}' into location {}", npc.getCode(), locationId);
    }

    @Transactional
    public void removeNpc(UUID locationId, UUID npcId) {
        NpcEntity npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new EntityNotFoundException("NPC not found: " + npcId));
        if (locationId.equals(npc.getLocationId())) {
            npc.setLocationId(null);
            npc.setLocationX(null);
            npc.setLocationY(null);
            npcRepository.save(npc);
        }
    }

    private LocationEntity getLocation(UUID locationId) {
        return locationRepository.findById(locationId)
                .orElseThrow(() -> new EntityNotFoundException("Location not found: " + locationId));
    }

    private LocationBuildingEntity getBuilding(UUID buildingId) {
        return buildingRepository.findById(buildingId)
                .orElseThrow(() -> new EntityNotFoundException("Building not found: " + buildingId));
    }

    private static String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    private static String normalizeUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        return url.trim();
    }

    private static int clampPercent(Integer value, int fallback) {
        if (value == null) {
            return fallback;
        }
        return Math.max(0, Math.min(100, value));
    }

    private LocationDtos.LocationDto toLocationDto(LocationEntity location) {
        List<LocationDtos.LocationBuildingDto> buildings = buildingRepository.findByLocationId(location.getId())
                .stream()
                .map(this::toBuildingDto)
                .toList();
        List<LocationDtos.LocationNpcDto> npcs = npcRepository.findByLocationId(location.getId()).stream()
                .map(npc -> new LocationDtos.LocationNpcDto(npc.getId(), npc.getCode(), npc.getName(),
                        npc.getLocationX() == null ? 50 : npc.getLocationX(),
                        npc.getLocationY() == null ? 50 : npc.getLocationY()))
                .toList();
        return new LocationDtos.LocationDto(location.getId(), location.getCode(), location.getName(),
                location.getPositionX(), location.getPositionY(), location.getBackgroundImageUrl(),
                location.isStart(), buildings, npcs);
    }

    private LocationDtos.LocationBuildingDto toBuildingDto(LocationBuildingEntity building) {
        return new LocationDtos.LocationBuildingDto(building.getId(), building.getLocation().getId(),
                building.getName(), building.getX(), building.getY(), building.getWidth(), building.getHeight(),
                building.getEmoji(), building.getTargetLocation() == null ? null
                        : building.getTargetLocation().getId());
    }
}
