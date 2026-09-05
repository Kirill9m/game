package spring.backend.game.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import spring.backend.game.entity.PlayerEntity;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface PlayerRepository extends JpaRepository<PlayerEntity, String> {
    /** Legacy: all players on a tile regardless of location context. */
    List<PlayerEntity> findByPositionXAndPositionY(int positionX, int positionY);

    /** Players on the given tile who are NOT inside any building. */
    @Query("SELECT p FROM PlayerEntity p WHERE p.positionX = :x AND p.positionY = :y AND p.currentLocationId IS NULL")
    List<PlayerEntity> findOutsideByPosition(@Param("x") int x, @Param("y") int y);

    /** Players inside the given location (building). */
    @Query("SELECT p FROM PlayerEntity p WHERE p.currentLocationId = :locationId")
    List<PlayerEntity> findByCurrentLocationId(@Param("locationId") UUID locationId);

    /**
     * Players on the given tile, not inside a building, and considered online
     * (lastSeen within the allowed offline threshold).
     */
    @Query("SELECT p FROM PlayerEntity p WHERE p.positionX = :x AND p.positionY = :y "
            + "AND p.currentLocationId IS NULL AND (p.lastSeen IS NULL OR p.lastSeen >= :onlineSince)")
    List<PlayerEntity> findOnlineOutsideByPosition(@Param("x") int x, @Param("y") int y,
                                                   @Param("onlineSince") Instant onlineSince);

    /** Players inside the given location, filtered by online status. */
    @Query("SELECT p FROM PlayerEntity p WHERE p.currentLocationId = :locationId "
            + "AND (p.lastSeen IS NULL OR p.lastSeen >= :onlineSince)")
    List<PlayerEntity> findOnlineByCurrentLocationId(@Param("locationId") UUID locationId,
                                                     @Param("onlineSince") Instant onlineSince);
}
