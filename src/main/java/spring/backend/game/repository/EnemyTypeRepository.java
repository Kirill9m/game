package spring.backend.game.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.EnemyTypeEntity;

public interface EnemyTypeRepository extends JpaRepository<EnemyTypeEntity, UUID> {
    Optional<EnemyTypeEntity> findByCodeIgnoreCase(String code);

    List<EnemyTypeEntity> findAllByOrderByNameAsc();
}
