package spring.backend.game.dto;

import java.util.List;
import java.util.UUID;

/**
 * Request/response payloads for the Location system (Location tab of the World
 * View). These records are shared between the admin endpoints and the
 * player-facing read endpoint.
 */
public final class LocationDtos {

    private LocationDtos() {
    }

    // --- RESPONSES ---

    public record LocationDto(
            UUID id,
            String code,
            String name,
            int positionX,
            int positionY,
            String backgroundImageUrl,
            boolean isStart,
            List<LocationBuildingDto> buildings,
            List<LocationNpcDto> npcs) {
    }

    public record LocationBuildingDto(
            UUID id,
            UUID locationId,
            String name,
            int x,
            int y,
            int width,
            int height,
            String emoji,
            String backgroundImageUrl,
            UUID targetLocationId) {
    }

    public record LocationNpcDto(
            UUID id,
            String code,
            String name,
            int locationX,
            int locationY,
            UUID buildingId) {
    }

    // --- REQUESTS ---

    public record CreateLocationRequest(
            String code,
            String name,
            Integer positionX,
            Integer positionY,
            String backgroundImageUrl,
            Boolean isStart) {
    }

    public record UpdateLocationRequest(
            String name,
            Integer positionX,
            Integer positionY,
            String backgroundImageUrl,
            Boolean isStart) {
    }

    public record CreateLocationBuildingRequest(
            String name,
            Integer x,
            Integer y,
            Integer width,
            Integer height,
            String emoji,
            String backgroundImageUrl,
            UUID targetLocationId) {
    }

    public record UpdateLocationBuildingRequest(
            String name,
            Integer x,
            Integer y,
            Integer width,
            Integer height,
            String emoji,
            String backgroundImageUrl,
            UUID targetLocationId) {
    }

    public record PlaceLocationNpcRequest(
            Integer locationX,
            Integer locationY,
            UUID buildingId) {
    }
}
