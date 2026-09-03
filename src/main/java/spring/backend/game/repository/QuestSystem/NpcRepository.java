package spring.backend.game.repository.QuestSystem;

import java.util.List;
import java.util.UUID;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.QuestSystem.NpcEntity;

public interface NpcRepository extends JpaRepository<NpcEntity, UUID> {
    List<NpcEntity> findByPositionXAndPositionY(int positionX, int positionY);

    Optional<NpcEntity> findByCodeIgnoreCase(String code);
}
