package spring.backend.game.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import spring.backend.game.entity.PlayerWeaponProficiencyEntity;

public interface WeaponProficiencyRepository extends JpaRepository<PlayerWeaponProficiencyEntity, UUID> {
    Optional<PlayerWeaponProficiencyEntity> findByPlayerIdAndWeaponTypeCodeIgnoreCase(String playerId, String weaponTypeCode);

    List<PlayerWeaponProficiencyEntity> findByPlayerIdOrderByWeaponTypeCodeAsc(String playerId);

    List<PlayerWeaponProficiencyEntity> findByWeaponTypeCodeIgnoreCase(String weaponTypeCode);
}
