package spring.backend.game.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.GameMapResponse;
import spring.backend.game.dto.WorldBoundsResponse;
import spring.backend.game.dto.WorldCellResponse;
import spring.backend.game.dto.WorldLootResponse;
import spring.backend.game.dto.WorldZoneResponse;
import spring.backend.game.service.GameMapService;
import spring.backend.game.service.LootService;
import spring.backend.game.service.WorldCellService;
import spring.backend.game.service.WorldConstants;
import spring.backend.game.service.WorldZoneService;

@RestController
@RequestMapping("/api/v1/world")
@RequiredArgsConstructor
public class WorldController {
    private final WorldZoneService worldZoneService;
    private final WorldCellService worldCellService;
    private final GameMapService gameMapService;
    private final LootService lootService;

    @GetMapping("/safe-zone")
    public ResponseEntity<WorldZoneResponse> getSafeZone() {
        return ResponseEntity.ok(worldZoneService.getSafeZone());
    }

    /** Public per-cell danger settings (blocked / radiation / ambush) for the world map. */
    @GetMapping("/cells")
    public ResponseEntity<List<WorldCellResponse>> getWorldCells() {
        return ResponseEntity.ok(worldCellService.getPublicCells());
    }

    /** World geometry (1000x1000, extends into negative coordinates). */
    @GetMapping("/bounds")
    public ResponseEntity<WorldBoundsResponse> getWorldBounds() {
        return ResponseEntity.ok(new WorldBoundsResponse(
                WorldConstants.WORLD_MIN, WorldConstants.WORLD_MAX,
                WorldConstants.WORLD_MIN, WorldConstants.WORLD_MAX,
                WorldConstants.WORLD_SIZE));
    }

    /** All known player maps (each is opened by its inventory item). */
    @GetMapping("/maps")
    public ResponseEntity<List<GameMapResponse>> getMaps() {
        return ResponseEntity.ok(gameMapService.getAllMaps());
    }

    /** The map bound to the given inventory item code (e.g. WORLD_MAP). */
    @GetMapping("/maps/item/{itemCode}")
    public ResponseEntity<GameMapResponse> getMapByItem(@PathVariable String itemCode) {
        return ResponseEntity.ok(gameMapService.getMapByItemCode(itemCode));
    }

    /** Loot piles inside a circular area (drawn on the world map). */
    @GetMapping("/loot")
    public ResponseEntity<List<WorldLootResponse>> getLootAround(
            @RequestParam int centerX,
            @RequestParam int centerY,
            @RequestParam int radius) {
        return ResponseEntity.ok(lootService.getFieldLootAround(centerX, centerY, radius));
    }
}
