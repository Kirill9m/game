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
     * Enters a location (building/room). The player's world position stays the
     * same, but their currentLocationId is set so that only other players inside
     * the same building are visible. Pass an empty/blank locationId to exit the
     * current location (clears currentLocationId).
     */
    @PostMapping("/enter")
    public MoveResponse enterLocation(@RequestParam String locationId, @RequestParam String playerId) {
        UUID parsed = locationId.isBlank() ? null : UUID.fromString(locationId);
        return locationService.enterLocation(parsed, playerId);
    }
}
