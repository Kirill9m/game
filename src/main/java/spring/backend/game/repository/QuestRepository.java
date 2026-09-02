package spring.backend.game.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.QuestEntity;

public interface QuestRepository extends JpaRepository<QuestEntity, UUID> {
    Optional<QuestEntity> findByCodeIgnoreCase(String code);

    java.util.List<QuestEntity> findByGiverNpcCodeIgnoreCase(String giverNpcCode);
}
