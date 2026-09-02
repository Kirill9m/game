package spring.backend.game.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.PlayerQuestEntity;

public interface PlayerQuestRepository extends JpaRepository<PlayerQuestEntity, UUID> {
    List<PlayerQuestEntity> findByPlayerId(String playerId);

    Optional<PlayerQuestEntity> findByPlayerIdAndQuestCodeIgnoreCase(String playerId, String questCode);
}
