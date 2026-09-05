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

    @Query("SELECT c FROM CombatSessionEntity c WHERE c.status = :status AND c.participantsData LIKE CONCAT('%', :playerId, '%') ORDER BY c.id")
    List<CombatSessionEntity> findActiveCombatsForPlayer(
            @Param("playerId") String playerId,
            @Param("status") String status);

    List<CombatSessionEntity> findByEnemyTypeId(UUID enemyTypeId);

    @Query("SELECT c FROM CombatSessionEntity c WHERE c.participantsData LIKE CONCAT('%', :playerId, '%')")
    List<CombatSessionEntity> findByParticipant(@Param("playerId") String playerId);

    @Query("SELECT c FROM CombatSessionEntity c WHERE c.status = :status ORDER BY c.id")
    List<CombatSessionEntity> findByStatus(@Param("status") String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CombatSessionEntity c WHERE c.status = :status AND c.turnDeadlineMillis > 0 AND c.turnDeadlineMillis < :now")
    List<CombatSessionEntity> findExpiredTurnsForUpdate(
            @Param("status") String status,
            @Param("now") long now);
}
