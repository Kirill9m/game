package spring.backend.game.dto;

/**
 * World geometry exposed to the client so the map can render a viewport
 * over the full 1000x1000 world (which extends into negative coordinates).
 */
public record WorldBoundsResponse(int minX, int maxX, int minY, int maxY, int size) {
}
