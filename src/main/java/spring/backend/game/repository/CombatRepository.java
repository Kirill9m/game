package spring.backend.game.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

import spring.backend.game.entity.CombatSessionEntity;

public interface CombatRepository extends JpaRepository<CombatSessionEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CombatSessionEntity c WHERE c.id = :id")
    java.util.Optional<CombatSessionEntity> findByIdForUpdate(@Param("id") UUID id);

    @Query("SELECT c FROM CombatSessionEntity c WHERE (c.player1Id = :playerId OR c.player2Id = :playerId) AND c.status = :status ORDER BY c.id")
    List<CombatSessionEntity> findActiveCombatsForPlayer(
            @Param("playerId") String playerId,
            @Param("status") String status);
}
