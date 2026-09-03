package spring.backend.game.repository.QuestSystem;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.QuestSystem.DialogueChoiceEntity;

public interface DialogueChoiceRepository extends JpaRepository<DialogueChoiceEntity, UUID> {
}