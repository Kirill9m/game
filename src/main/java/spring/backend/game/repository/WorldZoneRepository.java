package spring.backend.game.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import spring.backend.game.entity.WorldZoneEntity;

@Repository
public interface WorldZoneRepository extends JpaRepository<WorldZoneEntity, Long> {
    Optional<WorldZoneEntity> findFirstByOrderByIdAsc();
}
