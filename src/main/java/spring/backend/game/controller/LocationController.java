package spring.backend.game.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.LocationDtos;
import spring.backend.game.dto.MoveResponse;
import spring.backend.game.service.LocationService;

/**
 * Public read endpoint for the Location tab of the World View. Returns every
 * location (areas, buildings and NPCs) so the client can render the hub image
 * and navigate between locations.
 */
@RestController
@RequestMapping("/api/v1/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @GetMapping
    public List<LocationDtos.LocationDto> getLocations() {
        return locationService.getAllLocations();
    }

    /**
     * Enters a named location ("room"): the player is teleported to that
     * location's world coordinates, sharing a tile with everyone else inside the
     * same location (PvP allowed outside the safe zone). Passing the previous
     * location's id returns the player back to it.
     */
    @PostMapping("/{locationId}/enter")
    public MoveResponse enterLocation(@PathVariable UUID locationId, @RequestParam String playerId) {
        return locationService.enterLocation(locationId, playerId);
    }
}
