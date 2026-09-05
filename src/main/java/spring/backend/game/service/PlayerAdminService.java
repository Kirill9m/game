package spring.backend.game.service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import spring.backend.game.config.AdminProperties;
import spring.backend.game.dto.AdminDtos;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.entity.PlayerWeaponProficiencyEntity;
import spring.backend.game.entity.WeaponTypeEntity;
import spring.backend.game.entity.QuestSystem.PlayerQuestEntity;
import spring.backend.game.entity.QuestSystem.QuestLogEntryEntity;
import spring.backend.game.repository.CombatRepository;
import spring.backend.game.repository.PlayerInventoryRepository;
import spring.backend.game.repository.PlayerRepository;
import spring.backend.game.repository.WeaponProficiencyRepository;
import spring.backend.game.repository.WeaponTypeRepository;
import spring.backend.game.repository.WorldLootRepository;
import spring.backend.game.repository.QuestSystem.PlayerQuestRepository;
import spring.backend.game.repository.QuestSystem.QuestLogEntryRepository;

/**
 * Admin operations for players: role management, bootstrapping the first admin,
 * profile updates, deletion and weapon proficiency tuning.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PlayerAdminService {

    private final AdminProperties adminProperties;
    private final PlayerRepository playerRepository;
    private final PlayerInventoryRepository playerInventoryRepository;
    private final CombatRepository combatRepository;
    private final WorldLootRepository worldLootRepository;
    private final WeaponProficiencyRepository weaponProficiencyRepository;
    private final WeaponTypeRepository weaponTypeRepository;
    private final PlayerQuestRepository playerQuestRepository;
    private final QuestLogEntryRepository questLogEntryRepository;

    /** Promotes every configured admin player id to the ADMIN role. */
    @Transactional
    public void promoteConfiguredAdmins() {
        for (String id : adminProperties.getAdminPlayerIds()) {
            playerRepository.findById(id).ifPresent(player -> {
                if (!PlayerEntity.ROLE_ADMIN.equals(player.getRole())) {
                    player.setRole(PlayerEntity.ROLE_ADMIN);
                    playerRepository.save(player);
                    log.info("Player '{}' promoted to ADMIN from configuration", id);
                }
            });
        }
    }

    /** Bootstrap promotion using the secret code (for the very first admin). */
    @Transactional
    public AdminDtos.AdminPlayerDto bootstrapAdmin(String playerId, String code) {
        if (code == null || code.isBlank() || !code.equals(adminProperties.getBootstrapCode())) {
            throw new IllegalArgumentException("Invalid admin bootstrap code");
        }
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + playerId));
        player.setRole(PlayerEntity.ROLE_ADMIN);
        playerRepository.save(player);
        log.info("Player '{}' promoted to ADMIN via bootstrap code", playerId);
        return toPlayerDto(player);
    }

    @Transactional
    public AdminDtos.AdminPlayerDto setPlayerRole(String targetPlayerId, String role) {
        PlayerEntity player = playerRepository.findById(targetPlayerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + targetPlayerId));
        String normalized = role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
        if (!PlayerEntity.ROLE_ADMIN.equals(normalized) && !PlayerEntity.ROLE_PLAYER.equals(normalized)) {
            throw new IllegalArgumentException("Role must be ADMIN or PLAYER");
        }
        player.setRole(normalized);
        return toPlayerDto(playerRepository.save(player));
    }

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminPlayerDto> getAllPlayers() {
        return playerRepository.findAll().stream()
                .map(this::toPlayerDto)
                .toList();
    }

    /** Update player stats/profile. Only provided (non-null) fields are applied. */
    @Transactional
    public AdminDtos.AdminPlayerDto updatePlayer(String targetPlayerId, AdminDtos.UpdatePlayerRequest request) {
        PlayerEntity player = playerRepository.findById(targetPlayerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + targetPlayerId));
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (request.username() != null) {
            String name = request.username().trim();
            if (name.isEmpty()) {
                throw new IllegalArgumentException("Username cannot be empty");
            }
            player.setUsername(name);
        }
        if (request.level() != null) {
            player.setLevel(Math.max(1, request.level()));
        }
        if (request.gold() != null) {
            player.setGold(Math.max(0, request.gold()));
        }
        if (request.health() != null) {
            player.setHealth(Math.max(0, request.health()));
        }
        if (request.strength() != null) {
            player.setStrength(Math.max(0, request.strength()));
        }
        if (request.agility() != null) {
            player.setAgility(Math.max(0, request.agility()));
        }
        if (request.stamina() != null) {
            player.setStamina(Math.max(0, request.stamina()));
        }
        if (request.energy() != null) {
            player.setEnergy(Math.max(0, request.energy()));
        }
        if (request.positionX() != null) {
            player.setPositionX(request.positionX());
        }
        if (request.positionY() != null) {
            player.setPositionY(request.positionY());
        }
        log.info("Admin updated player {}", targetPlayerId);
        return toPlayerDto(playerRepository.save(player));
    }

    /** Delete a player together with inventory, quest progress and combat history. */
    @Transactional
    public void deletePlayer(String targetPlayerId) {
        PlayerEntity player = playerRepository.findById(targetPlayerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + targetPlayerId));

        playerInventoryRepository.deleteAll(playerInventoryRepository.findByPlayerIdOrderByItemNameAsc(targetPlayerId));
        worldLootRepository.deleteByOwnerId(targetPlayerId);

        for (PlayerQuestEntity playerQuest : playerQuestRepository.findByPlayerId(targetPlayerId)) {
            List<QuestLogEntryEntity> logs =
                    questLogEntryRepository.findByPlayerQuestIdOrderByTimestampAsc(playerQuest.getId());
            questLogEntryRepository.deleteAll(logs);
            playerQuestRepository.delete(playerQuest);
        }

        combatRepository.deleteAll(combatRepository.findByParticipant(targetPlayerId));

        playerRepository.delete(player);
        log.info("Admin deleted player {}", targetPlayerId);
    }

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminProficiencyDto> getPlayerProficiencies(String playerId) {
        playerRepository.findById(playerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + playerId));
        return weaponProficiencyRepository.findByPlayerIdOrderByWeaponTypeCodeAsc(playerId).stream()
                .map(this::toProficiencyDto)
                .toList();
    }

    @Transactional
    public List<AdminDtos.AdminProficiencyDto> setPlayerProficiency(String playerId, String weaponTypeCode, Integer level) {
        playerRepository.findById(playerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + playerId));
        String normalizedCode = normalizeWeaponTypeCode(weaponTypeCode);
        if (normalizedCode == null) {
            throw new IllegalArgumentException("Unknown weapon type: " + weaponTypeCode);
        }
        int clampedLevel = Math.max(0, level == null ? 0 : level);
        weaponProficiencyRepository.findByPlayerIdAndWeaponTypeCodeIgnoreCase(playerId, normalizedCode)
                .ifPresentOrElse(
                        existing -> {
                            existing.setLevel(clampedLevel);
                            weaponProficiencyRepository.save(existing);
                        },
                        () -> weaponProficiencyRepository.save(PlayerWeaponProficiencyEntity.builder()
                                .playerId(playerId)
                                .weaponTypeCode(normalizedCode)
                                .level(clampedLevel)
                                .build()));
        return getPlayerProficiencies(playerId);
    }

    private String normalizeWeaponTypeCode(String weaponTypeCode) {
        if (weaponTypeCode == null || weaponTypeCode.isBlank()) {
            return null;
        }
        WeaponTypeEntity weaponType = weaponTypeRepository.findByCodeIgnoreCase(weaponTypeCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Unknown weapon type: " + weaponTypeCode));
        return weaponType.getCode();
    }

    private AdminDtos.AdminPlayerDto toPlayerDto(PlayerEntity player) {
        List<AdminDtos.AdminProficiencyDto> proficiencies = weaponProficiencyRepository
                .findByPlayerIdOrderByWeaponTypeCodeAsc(player.getId()).stream()
                .map(this::toProficiencyDto)
                .toList();
        return new AdminDtos.AdminPlayerDto(player.getId(), player.getUsername(), player.getAvatarUrl(),
                player.getRole(), player.getLevel(), player.getGold(), player.getQuestPoints(), proficiencies);
    }

    private AdminDtos.AdminProficiencyDto toProficiencyDto(PlayerWeaponProficiencyEntity proficiency) {
        String weaponTypeName = weaponTypeRepository.findByCodeIgnoreCase(proficiency.getWeaponTypeCode())
                .map(WeaponTypeEntity::getName)
                .orElse(proficiency.getWeaponTypeCode());
        return new AdminDtos.AdminProficiencyDto(proficiency.getWeaponTypeCode(), weaponTypeName, proficiency.getLevel());
    }
}

