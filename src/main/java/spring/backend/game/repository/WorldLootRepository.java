package spring.backend.game.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.WorldLootEntity;

public interface WorldLootRepository extends JpaRepository<WorldLootEntity, UUID> {
    List<WorldLootEntity> findByPositionXAndPositionYOrderByCreatedAtAsc(int positionX, int positionY);

    List<WorldLootEntity> findByPositionXBetweenAndPositionYBetween(
            int minX, int maxX, int minY, int maxY);

    void deleteByOwnerId(String ownerId);
}