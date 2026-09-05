package spring.backend.game.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.LocationEntity;

public interface LocationRepository extends JpaRepository<LocationEntity, UUID> {

    List<LocationEntity> findAllByOrderByCodeAsc();

    Optional<LocationEntity> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);
}
