package spring.backend.game.repository.QuestSystem;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.QuestSystem.QuestLogEntryEntity;

public interface QuestLogEntryRepository extends JpaRepository<QuestLogEntryEntity, UUID> {
    List<QuestLogEntryEntity> findByPlayerQuestIdOrderByTimestampAsc(UUID playerQuestId);
}