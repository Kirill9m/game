package spring.backend.game.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import spring.backend.game.entity.ObstacleTypeEntity;

@Repository
public interface ObstacleTypeRepository extends JpaRepository<ObstacleTypeEntity, UUID> {

    Optional<ObstacleTypeEntity> findByCodeIgnoreCase(String code);

    List<ObstacleTypeEntity> findAllByOrderByNameAsc();

    boolean existsByCodeIgnoreCase(String code);
}