package spring.backend.game.repository.QuestSystem;

import java.util.List;
import java.util.UUID;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.QuestSystem.NpcEntity;

public interface NpcRepository extends JpaRepository<NpcEntity, UUID> {
    List<NpcEntity> findByPositionXAndPositionY(int positionX, int positionY);

    /** NPCs standing on a world cell (location-bound NPCs are hidden). */
    List<NpcEntity> findByPositionXAndPositionYAndLocationIdIsNull(int positionX, int positionY);

    List<NpcEntity> findByLocationId(UUID locationId);

    Optional<NpcEntity> findByCodeIgnoreCase(String code);
}
