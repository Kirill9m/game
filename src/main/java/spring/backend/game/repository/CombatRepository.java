package spring.backend.game.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import spring.backend.game.entity.CombatSessionEntity;

public interface CombatRepository extends JpaRepository<CombatSessionEntity, UUID> {
    @Query("SELECT c FROM CombatSessionEntity c WHERE (c.player1Id = :playerId OR c.player2Id = :playerId) AND c.status = :status")
    Optional<CombatSessionEntity> findActiveCombatForPlayer(
            @Param("playerId") String playerId,
            @Param("status") String status);
}
