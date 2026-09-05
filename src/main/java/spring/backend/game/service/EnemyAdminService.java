package spring.backend.game.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.UUID;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import spring.backend.game.dto.AdminDtos;
import spring.backend.game.entity.CombatSessionEntity;
import spring.backend.game.entity.EnemyLootDrop;
import spring.backend.game.entity.EnemyTypeEntity;
import spring.backend.game.entity.ItemEntity;
import spring.backend.game.repository.CombatRepository;
import spring.backend.game.repository.EnemyTypeRepository;
import spring.backend.game.repository.ItemRepository;

/**
 * Admin operations for enemy types, including the random enemy generator.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EnemyAdminService {

    /** Name pools for the random enemy generator. */
    private static final List<String> ENEMY_NAMES = List.of(
            "Goblin", "Wolf", "Bandit", "Skeleton", "Orc Brute", "Swamp Slime",
            "Cave Spider", "Wraith", "Marauder", "Imp", "Scavenger", "Beast");
    private static final List<String> ENEMY_TITLES = List.of(
            "Scout", "Warrior", "Stalker", "Champion", "Elder", "Runts",
            "Alpha", "Rogue", "Brute", "Hunter", "Seer", "Fiend");

    private final EnemyTypeRepository enemyTypeRepository;
    private final ItemRepository itemRepository;
    private final CombatRepository combatRepository;
    private final WorldCellService worldCellService;
    private final Random random = new Random();

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminEnemyTypeDto> getAllEnemyTypes() {
        return enemyTypeRepository.findAllByOrderByNameAsc().stream()
                .map(this::toEnemyTypeDto)
                .toList();
    }

    @Transactional
    public AdminDtos.AdminEnemyTypeDto createEnemyType(AdminDtos.CreateEnemyTypeRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        String normalizedCode = requireNonBlank(request.code(), "Enemy code is required")
                .trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_]", "_");
        if (enemyTypeRepository.findByCodeIgnoreCase(normalizedCode).isPresent()) {
            throw new IllegalArgumentException("Enemy code already exists: " + normalizedCode);
        }
        EnemyTypeEntity enemy = enemyTypeRepository.save(EnemyTypeEntity.builder()
                .code(normalizedCode)
                .name(requireNonBlank(request.name(), "Enemy name is required").trim())
                .maxHealth(clampMin1(request.maxHealth(), 30))
                .damage(clampMin0(request.damage(), 5))
                .attackRange(clampMin0(request.attackRange(), 1))
                .actionPoints(clampMin1(request.actionPoints(), 3))
                .movementRange(clampMin1(request.movementRange(), 2))
                .build());
        enemy.setLootDrops(toLootDrops(request.lootDrops()));
        enemyTypeRepository.save(enemy);
        log.info("Admin created enemy type {}", enemy.getCode());
        return toEnemyTypeDto(enemy);
    }

    @Transactional
    public AdminDtos.AdminEnemyTypeDto updateEnemyType(UUID enemyId, AdminDtos.UpdateEnemyTypeRequest request) {
        EnemyTypeEntity enemy = enemyTypeRepository.findById(enemyId)
                .orElseThrow(() -> new EntityNotFoundException("Enemy type not found: " + enemyId));
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (request.name() != null && !request.name().isBlank()) {
            enemy.setName(request.name().trim());
        }
        if (request.maxHealth() != null) {
            enemy.setMaxHealth(clampMin1(request.maxHealth(), 1));
        }
        if (request.damage() != null) {
            enemy.setDamage(clampMin0(request.damage(), 0));
        }
        if (request.attackRange() != null) {
            enemy.setAttackRange(clampMin0(request.attackRange(), 0));
        }
        if (request.actionPoints() != null) {
            enemy.setActionPoints(clampMin1(request.actionPoints(), 1));
        }
        if (request.movementRange() != null) {
            enemy.setMovementRange(clampMin1(request.movementRange(), 1));
        }
        if (request.lootDrops() != null) {
            enemy.setLootDrops(toLootDrops(request.lootDrops()));
        }
        return toEnemyTypeDto(enemyTypeRepository.save(enemy));
    }

    @Transactional
    public void deleteEnemyType(UUID enemyId) {
        EnemyTypeEntity enemy = enemyTypeRepository.findById(enemyId)
                .orElseThrow(() -> new EntityNotFoundException("Enemy type not found: " + enemyId));

        // Detach combat sessions that reference this enemy type, then remove them
        List<CombatSessionEntity> sessions = combatRepository.findByEnemyTypeId(enemyId);
        combatRepository.deleteAll(sessions);

        // Detach world cells that use this enemy type for ambushes
        worldCellService.detachEnemyType(enemyId);

        enemyTypeRepository.delete(enemy);
        log.info("Admin deleted enemy type {} ({} combat sessions removed)", enemy.getCode(), sessions.size());
    }

    /**
     * Enemy generator: creates an enemy type with a random name and combat
     * stats within reasonable ranges. Difficulty 1 (weak) .. 3 (boss-like).
     */
    @Transactional
    public AdminDtos.AdminEnemyTypeDto generateRandomEnemy(int difficulty) {
        int tier = Math.min(3, Math.max(1, difficulty));
        String name = ENEMY_NAMES.get(random.nextInt(ENEMY_NAMES.size())) + " "
                + ENEMY_TITLES.get(random.nextInt(ENEMY_TITLES.size()));
        String code = "ENEMY_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);

        int maxHealth = 20 + tier * 20 + random.nextInt(21); // tier1: 40..60, tier2: 60..80, tier3: 80..100
        int damage = 2 + tier * 2 + random.nextInt(5); // tier1: 4..8, tier2: 6..10, tier3: 8..12
        int attackRange = 1 + random.nextInt(tier + 1); // melee..ranged for higher tiers
        int actionPoints = 2 + random.nextInt(2) + (tier >= 2 ? 1 : 0); // 2..5
        int movementRange = 1 + random.nextInt(3); // 1..3

        // Randomised loot table: 0..2 drops of existing weapon items.
        List<AdminDtos.EnemyLootDropDto> lootDrops = new ArrayList<>();
        List<ItemEntity> weaponItems = itemRepository.findAll().stream()
                .filter(item -> "WEAPON".equalsIgnoreCase(item.getType()))
                .toList();
        if (!weaponItems.isEmpty()) {
            int dropCount = random.nextInt(3); // 0..2
            for (int index = 0; index < dropCount; index++) {
                ItemEntity weapon = weaponItems.get(random.nextInt(weaponItems.size()));
                lootDrops.add(new AdminDtos.EnemyLootDropDto(
                        weapon.getCode(), 40 + random.nextInt(51), 1, 1));
            }
        }

        AdminDtos.AdminEnemyTypeDto created = createEnemyType(new AdminDtos.CreateEnemyTypeRequest(
                code, name, maxHealth, damage, attackRange, actionPoints, movementRange, lootDrops));
        log.info("Generated random enemy '{}' ({}, difficulty {})", created.name(), created.code(), tier);
        return created;
    }

    private static int clampMin0(Integer value, int fallback) {
        return Math.max(0, value == null ? fallback : value);
    }

    private static int clampMin1(Integer value, int fallback) {
        return Math.max(1, value == null ? fallback : value);
    }

    private AdminDtos.AdminEnemyTypeDto toEnemyTypeDto(EnemyTypeEntity enemy) {
        List<AdminDtos.EnemyLootDropDto> drops = enemy.getLootDrops().stream()
                .map(drop -> new AdminDtos.EnemyLootDropDto(
                        drop.itemCode(), drop.chance(), drop.minQuantity(), drop.maxQuantity()))
                .toList();
        return new AdminDtos.AdminEnemyTypeDto(enemy.getId(), enemy.getCode(), enemy.getName(),
                enemy.getMaxHealth(), enemy.getDamage(), enemy.getAttackRange(),
                enemy.getActionPoints(), enemy.getMovementRange(), drops);
    }

    private List<EnemyLootDrop> toLootDrops(List<AdminDtos.EnemyLootDropDto> drops) {
        if (drops == null || drops.isEmpty()) {
            return List.of();
        }
        return drops.stream()
                .filter(drop -> drop != null && drop.itemCode() != null && !drop.itemCode().isBlank())
                .map(drop -> new EnemyLootDrop(
                        drop.itemCode().trim().toUpperCase(Locale.ROOT),
                        Math.max(0, Math.min(100, drop.chance() == null ? 100 : drop.chance())),
                        Math.max(1, drop.minQuantity() == null ? 1 : drop.minQuantity()),
                        Math.max(1, drop.maxQuantity() == null ? 1 : drop.maxQuantity())))
                .toList();
    }

    private static String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }
}

