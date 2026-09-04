package spring.backend.game.service;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.GameMapResponse;
import spring.backend.game.entity.GameMapEntity;
import spring.backend.game.repository.GameMapRepository;
import spring.backend.game.repository.ItemRepository;

/**
 * Player maps: definitions of world areas that can be opened from the
 * inventory. Each map is bound to an inventory item code. Public lookups live
 * here; admin create/update/delete is exposed through the admin controller.
 */
@Service
@RequiredArgsConstructor
public class GameMapService {

    /** Maps never show more than 19x19 cells (fits the 20x20 client grid). */
    private static final int MAX_RADIUS = 9;

    private final GameMapRepository mapRepository;
    private final ItemRepository itemRepository;

    // --- Public lookups ---

    @Transactional(readOnly = true)
    public List<GameMapResponse> getAllMaps() {
        return mapRepository.findAllByOrderByNameAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GameMapResponse getMapByItemCode(String itemCode) {
        if (itemCode == null || itemCode.isBlank()) {
            throw new IllegalArgumentException("itemCode is required");
        }
        GameMapEntity map = mapRepository.findByItemCodeIgnoreCase(itemCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("No map found for item: " + itemCode));
        return toResponse(map);
    }
// --- Admin management ---

    @Transactional
    public GameMapResponse createMap(String code, String name, String description,
                                     int centerX, int centerY, int radius, String itemCode) {
        String normalizedCode = requireNonBlank(code, "Map code is required").trim()
                .toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_]", "_");
        if (mapRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new IllegalArgumentException("Map code already exists: " + normalizedCode);
        }
        String normalizedItem = requireNonBlank(itemCode, "Item code is required").trim()
                .toUpperCase(Locale.ROOT);
        ensureItemBindingFree(normalizedItem, null);

        GameMapEntity map = mapRepository.save(GameMapEntity.builder()
                .code(normalizedCode)
                .name(requireNonBlank(name, "Map name is required").trim())
                .description(cleanDescription(description))
                .centerX(clampCenter(centerX))
                .centerY(clampCenter(centerY))
                .radius(clampRadius(radius))
                .itemCode(normalizedItem)
                .build());
        return toResponse(map);
    }

    @Transactional
    public GameMapResponse updateMap(UUID mapId, String code, String name, String description,
                                     Integer centerX, Integer centerY, Integer radius, String itemCode) {
        GameMapEntity map = mapRepository.findById(mapId)
                .orElseThrow(() -> new EntityNotFoundException("Map not found: " + mapId));

        if (code != null && !code.isBlank()) {
            String normalizedCode = code.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_]", "_");
            if (!normalizedCode.equalsIgnoreCase(map.getCode())
                    && mapRepository.existsByCodeIgnoreCase(normalizedCode)) {
                throw new IllegalArgumentException("Map code already exists: " + normalizedCode);
            }
            map.setCode(normalizedCode);
        }
        if (name != null && !name.isBlank()) {
            map.setName(name.trim());
        }
        if (description != null) {
            map.setDescription(cleanDescription(description));
        }
        if (centerX != null) {
            map.setCenterX(clampCenter(centerX));
        }
        if (centerY != null) {
            map.setCenterY(clampCenter(centerY));
        }
        if (radius != null) {
            map.setRadius(clampRadius(radius));
        }
        if (itemCode != null && !itemCode.isBlank()) {
            String normalizedItem = itemCode.trim().toUpperCase(Locale.ROOT);
            ensureItemBindingFree(normalizedItem, map);
            map.setItemCode(normalizedItem);
        }
        return toResponse(mapRepository.save(map));
    }

    @Transactional
    public void deleteMap(UUID mapId) {
        GameMapEntity map = mapRepository.findById(mapId)
                .orElseThrow(() -> new EntityNotFoundException("Map not found: " + mapId));
        mapRepository.delete(map);
    }
// --- helpers ---

    private void ensureItemBindingFree(String itemCode, GameMapEntity current) {
        if (!itemRepository.findByCodeIgnoreCase(itemCode).isPresent()) {
            throw new IllegalArgumentException(
                    "Item not found: " + itemCode + ". Create the item in the Items tab first.");
        }
        Optional<GameMapEntity> bound = mapRepository.findByItemCodeIgnoreCase(itemCode);
        if (bound.isPresent() && (current == null || !bound.get().getId().equals(current.getId()))) {
            throw new IllegalArgumentException("Another map is already bound to item: " + itemCode);
        }
    }

    private GameMapResponse toResponse(GameMapEntity map) {
        return new GameMapResponse(
                map.getId(),
                map.getCode(),
                map.getName(),
                map.getDescription(),
                map.getCenterX(),
                map.getCenterY(),
                map.getRadius(),
                map.getItemCode());
    }

    private static String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    private static String cleanDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        return description.trim();
    }

    private static int clampRadius(int radius) {
        return Math.max(1, Math.min(MAX_RADIUS, radius));
    }

    private static int clampCenter(int center) {
        return Math.max(WorldConstants.WORLD_MIN, Math.min(WorldConstants.WORLD_MAX, center));
    }
}