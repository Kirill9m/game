package spring.backend.game.repository.QuestSystem;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.QuestSystem.PlayerQuestEntity;
import spring.backend.game.entity.QuestSystem.QuestStatus;

public interface PlayerQuestRepository extends JpaRepository<PlayerQuestEntity, UUID> {
    Optional<PlayerQuestEntity> findByPlayerIdAndQuestId(String playerId, UUID questId);

    List<PlayerQuestEntity> findByPlayerId(String playerId);

    List<PlayerQuestEntity> findByPlayerIdAndStatus(String playerId, QuestStatus status);

    List<PlayerQuestEntity> findByQuestId(UUID questId);
}