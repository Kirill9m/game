package spring.backend.game.repository.QuestSystem;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.QuestSystem.DialogueNodeEntity;

public interface DialogueNodeRepository extends JpaRepository<DialogueNodeEntity, UUID> {
    Optional<DialogueNodeEntity> findByNpcIdAndIsStartTrue(UUID npcId);
}