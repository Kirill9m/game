package spring.backend.game.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.LocationBuildingEntity;

public interface LocationBuildingRepository extends JpaRepository<LocationBuildingEntity, UUID> {

    List<LocationBuildingEntity> findByLocationId(UUID locationId);

    List<LocationBuildingEntity> findByTargetLocationId(UUID targetLocationId);
}
