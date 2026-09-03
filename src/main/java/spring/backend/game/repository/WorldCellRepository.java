package spring.backend.game.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import spring.backend.game.entity.WorldCellEntity;

@Repository
public interface WorldCellRepository extends JpaRepository<WorldCellEntity, Long> {

    Optional<WorldCellEntity> findByPositionXAndPositionY(int positionX, int positionY);

    List<WorldCellEntity> findAllByOrderByIdAsc();

    List<WorldCellEntity> findByEnemyTypeId(UUID enemyTypeId);
}