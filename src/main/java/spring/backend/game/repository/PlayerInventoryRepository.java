package spring.backend.game.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import spring.backend.game.entity.PlayerInventoryEntity;

public interface PlayerInventoryRepository extends JpaRepository<PlayerInventoryEntity, UUID> {
    List<PlayerInventoryEntity> findByPlayerIdOrderByItemNameAsc(String playerId);

    @Query("SELECT COUNT(pi) > 0 FROM PlayerInventoryEntity pi WHERE pi.player.id = :playerId AND UPPER(pi.item.code) = UPPER(:itemCode)")
    boolean existsByPlayerAndItemCode(@Param("playerId") String playerId, @Param("itemCode") String itemCode);

    @Query("SELECT COUNT(pi) > 0 FROM PlayerInventoryEntity pi WHERE pi.player.id = :playerId AND UPPER(pi.item.code) = UPPER(:itemCode)")
    boolean existsByPlayerIdAndItemCodeIgnoreCase(@Param("playerId") String playerId, @Param("itemCode") String itemCode);
}