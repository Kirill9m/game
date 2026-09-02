package spring.backend.game.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.PlayerInventoryEntity;

public interface PlayerInventoryRepository extends JpaRepository<PlayerInventoryEntity, UUID> {
    List<PlayerInventoryEntity> findByPlayerIdOrderByItemNameAsc(String playerId);

    boolean existsByPlayerIdAndItemCodeIgnoreCase(String playerId, String itemCode);
}
