package spring.backend.game.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.PlayerLootBagEntity;

public interface PlayerLootBagRepository extends JpaRepository<PlayerLootBagEntity, UUID> {
    List<PlayerLootBagEntity> findByPlayerIdOrderByItemNameAsc(String playerId);
}