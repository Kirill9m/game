package spring.backend.game.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import spring.backend.game.entity.GameMapEntity;

@Repository
public interface GameMapRepository extends JpaRepository<GameMapEntity, UUID> {

    Optional<GameMapEntity> findByCodeIgnoreCase(String code);

    Optional<GameMapEntity> findByItemCodeIgnoreCase(String itemCode);

    List<GameMapEntity> findAllByOrderByNameAsc();

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByItemCodeIgnoreCase(String itemCode);
}