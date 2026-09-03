package spring.backend.game.repository.QuestSystem;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.QuestSystem.QuestEntity;


public interface QuestRepository extends JpaRepository<QuestEntity, UUID> {
    Optional<QuestEntity> findByCode(String code);
}