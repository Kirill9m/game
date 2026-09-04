package spring.backend.game.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.WeaponTypeEntity;

public interface WeaponTypeRepository extends JpaRepository<WeaponTypeEntity, UUID> {
    Optional<WeaponTypeEntity> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    List<WeaponTypeEntity> findAllByOrderByNameAsc();
}
