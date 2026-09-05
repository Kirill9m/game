package spring.backend.game.service;

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
import spring.backend.game.entity.ItemEntity;
import spring.backend.game.entity.WeaponTypeEntity;
import spring.backend.game.repository.ItemRepository;
import spring.backend.game.repository.PlayerInventoryRepository;
import spring.backend.game.repository.WeaponProficiencyRepository;
import spring.backend.game.repository.WeaponTypeRepository;

/**
 * Admin operations for items and weapon types, including the random item
 * generator and giving items directly to a player.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ItemAdminService {

    /** Name pools for the random item generator. */
    private static final List<String> WEAPON_PREFIXES = List.of(
            "Rusty", "Iron", "Steel", "Silver", "Enchanted", "Cursed", "Dragonbone", "Runed");
    private static final List<String> WEAPON_NAMES = List.of(
            "Sword", "Axe", "Dagger", "Spear", "Mace", "Halberd", "Scimitar", "Warhammer");
    private static final List<String> ARMOR_NAMES = List.of(
            "Vest", "Tunic", "Cuirass", "Brigandine", "Cloak", "Gauntlets", "Boots", "Shield");
    private static final List<String> UTILITY_NAMES = List.of(
            "Health Potion", "Lockpick", "Torch", "Rope", "Scroll", "Amulet", "Talisman", "Whetstone");
    private static final List<String> CONSUMABLE_NAMES = List.of(
            "Medkit", "Bandage", "Stimpack", "Healing Salve", "Herbal Remedy", "Antidote");
    private static final List<String> ITEM_PREFIXES = List.of(
            "Simple", "Fine", "Rare", "Ancient", "Traveler's", "Hunter's", "Wanderer's", "Mystic");

    /** Valid armor equipment slots, in the order used by the random generator. */
    private static final List<String> ARMOR_SLOTS = List.of("HELMET", "BODY", "LEGS", "FEET");

    private final ItemRepository itemRepository;
    private final PlayerInventoryRepository playerInventoryRepository;
    private final WeaponTypeRepository weaponTypeRepository;
    private final WeaponProficiencyRepository weaponProficiencyRepository;
    private final InventoryService inventoryService;
    private final Random random = new Random();

    // --- ITEM MANAGEMENT ---

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminItemDto> getAllItems() {
        return itemRepository.findAll().stream()
                .map(this::toItemDto)
                .toList();
    }

    @Transactional
    public AdminDtos.AdminItemDto createItem(String code, String name, String type, String weaponTypeCode,
                                             int damage, int attackRange,
                                             int width, int height, int defense, String equipmentSlot, int heal) {
        String normalizedCode = requireNonBlank(code, "Item code is required").trim().toUpperCase(Locale.ROOT);
        if (itemRepository.findByCodeIgnoreCase(normalizedCode).isPresent()) {
            throw new IllegalArgumentException("Item code already exists: " + normalizedCode);
        }
        String normalizedType = type == null || type.isBlank() ? "UTILITY" : type.trim().toUpperCase(Locale.ROOT);
        String normalizedSlot = equipmentSlot == null || equipmentSlot.isBlank()
                ? null
                : equipmentSlot.trim().toUpperCase(Locale.ROOT);
        if ("ARMOR".equals(normalizedType)) {
            if (normalizedSlot == null || !ARMOR_SLOTS.contains(normalizedSlot)) {
                throw new IllegalArgumentException(
                        "ARMOR items require an equipmentSlot of " + String.join(", ", ARMOR_SLOTS));
            }
        } else {
            normalizedSlot = null;
        }
        int normalizedHeal = "CONSUMABLE".equals(normalizedType) ? Math.max(0, heal) : 0;
        if ("CONSUMABLE".equals(normalizedType) && normalizedHeal <= 0) {
            throw new IllegalArgumentException("CONSUMABLE items require a heal amount greater than 0");
        }
        ItemEntity item = itemRepository.save(ItemEntity.builder()
                .code(normalizedCode)
                .name(requireNonBlank(name, "Item name is required").trim())
                .type(normalizedType)
                .weaponTypeCode(normalizeWeaponTypeCode(weaponTypeCode))
                .damage(Math.max(0, damage))
                .attackRange(Math.max(0, attackRange))
                .width(Math.max(1, width))
                .height(Math.max(1, height))
                .defense("ARMOR".equals(normalizedType) ? Math.max(0, defense) : 0)
                .equipmentSlot(normalizedSlot)
                .heal(normalizedHeal)
                .build());
        return toItemDto(item);
    }

    /**
     * Item generator: creates an item with a random name, type and stats.
     * Types: WEAPON (damage + short range), ARMOR (defense + equipment slot),
     * CONSUMABLE (heals health), UTILITY.
     */
    @Transactional
    public AdminDtos.AdminItemDto generateRandomItem() {
        String type = switch (random.nextInt(4)) {
            case 0 -> "WEAPON";
            case 1 -> "ARMOR";
            case 2 -> "CONSUMABLE";
            default -> "UTILITY";
        };
        String name;
        int damage = 0;
        int attackRange = 0;
        int width = 1;
        int height = 1;
        int defense = 0;
        int heal = 0;
        String equipmentSlot = null;
        switch (type) {
            case "WEAPON" -> {
                name = WEAPON_PREFIXES.get(random.nextInt(WEAPON_PREFIXES.size())) + " "
                        + WEAPON_NAMES.get(random.nextInt(WEAPON_NAMES.size()));
                damage = 3 + random.nextInt(13); // 3..15
                attackRange = 1 + random.nextInt(3); // 1..3
            }
            case "ARMOR" -> {
                name = ITEM_PREFIXES.get(random.nextInt(ITEM_PREFIXES.size())) + " "
                        + ARMOR_NAMES.get(random.nextInt(ARMOR_NAMES.size()));
                equipmentSlot = ARMOR_SLOTS.get(random.nextInt(ARMOR_SLOTS.size()));
                defense = 1 + random.nextInt(5); // 1..5 damage reduction
            }
            case "CONSUMABLE" -> {
                name = ITEM_PREFIXES.get(random.nextInt(ITEM_PREFIXES.size())) + " "
                        + CONSUMABLE_NAMES.get(random.nextInt(CONSUMABLE_NAMES.size()));
                heal = 15 + random.nextInt(36); // 15..50 health restored
            }
            default -> {
                name = ITEM_PREFIXES.get(random.nextInt(ITEM_PREFIXES.size())) + " "
                        + UTILITY_NAMES.get(random.nextInt(UTILITY_NAMES.size()));
                // Utility items occasionally occupy a 2x1 slot
                if (random.nextInt(4) == 0) {
                    width = 2;
                }
            }
        }
        String code = "ITEM_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        String weaponTypeCode = "WEAPON".equals(type) ? randomWeaponTypeCode() : null;
        AdminDtos.AdminItemDto created = createItem(code, name, type, weaponTypeCode, damage, attackRange, width, height, defense, equipmentSlot, heal);
        log.info("Generated random item '{}' ({}, {})", created.name(), created.code(), type);
        return created;
    }

    @Transactional
    public void deleteItem(UUID itemId) {
        ItemEntity item = itemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Item not found: " + itemId));

        // Remove the item from all inventories first
        playerInventoryRepository.deleteAll(playerInventoryRepository.findByItemId(itemId));

        itemRepository.delete(item);
        log.info("Admin deleted item {}", item.getCode());
    }

    /**
     * Gives an item directly to a player's inventory. Stacks with an existing
     * copy of the item or places it in the first free grid slot; throws when the
     * inventory has no room.
     */
    @Transactional
    public AdminDtos.AdminItemDto giveItemToPlayer(String targetPlayerId, String itemCode, Integer quantity) {
        String normalizedCode = requireNonBlank(itemCode, "Item code is required")
                .trim().toUpperCase(Locale.ROOT);
        ItemEntity item = itemRepository.findByCodeIgnoreCase(normalizedCode)
                .orElseThrow(() -> new IllegalArgumentException("Item not found: " + normalizedCode));
        int qty = Math.max(1, quantity == null ? 1 : quantity);
        inventoryService.addItem(targetPlayerId, item.getCode(), qty);
        log.info("Admin gave {}x '{}' to player {}", qty, item.getCode(), targetPlayerId);
        return toItemDto(item);
    }

    private String randomWeaponTypeCode() {
        List<WeaponTypeEntity> weaponTypes = weaponTypeRepository.findAll();
        return weaponTypes.isEmpty() ? null : weaponTypes.get(random.nextInt(weaponTypes.size())).getCode();
    }

    // --- WEAPON TYPE MANAGEMENT ---

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminWeaponTypeDto> getAllWeaponTypes() {
        return weaponTypeRepository.findAllByOrderByNameAsc().stream()
                .map(this::toWeaponTypeDto)
                .toList();
    }

    @Transactional
    public AdminDtos.AdminWeaponTypeDto createWeaponType(String code, String name, Integer accuracyPerLevel, Integer maxAccuracy) {
        String normalizedCode = requireNonBlank(code, "Weapon type code is required").trim().toUpperCase(Locale.ROOT);
        if (weaponTypeRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new IllegalArgumentException("Weapon type code already exists: " + normalizedCode);
        }
        WeaponTypeEntity weaponType = weaponTypeRepository.save(WeaponTypeEntity.builder()
                .code(normalizedCode)
                .name(requireNonBlank(name, "Weapon type name is required").trim())
                .accuracyPerLevel(Math.max(0, accuracyPerLevel == null ? 5 : accuracyPerLevel))
                .maxAccuracy(Math.max(0, maxAccuracy == null ? 25 : maxAccuracy))
                .build());
        log.info("Admin created weapon type '{}' ({})", weaponType.getName(), weaponType.getCode());
        return toWeaponTypeDto(weaponType);
    }

    @Transactional
    public AdminDtos.AdminWeaponTypeDto updateWeaponType(UUID weaponTypeId, String name, Integer accuracyPerLevel, Integer maxAccuracy) {
        WeaponTypeEntity weaponType = weaponTypeRepository.findById(weaponTypeId)
                .orElseThrow(() -> new EntityNotFoundException("Weapon type not found: " + weaponTypeId));
        if (name != null && !name.isBlank()) {
            weaponType.setName(name.trim());
        }
        if (accuracyPerLevel != null) {
            weaponType.setAccuracyPerLevel(Math.max(0, accuracyPerLevel));
        }
        if (maxAccuracy != null) {
            weaponType.setMaxAccuracy(Math.max(0, maxAccuracy));
        }
        weaponTypeRepository.save(weaponType);
        log.info("Admin updated weapon type '{}' ({})", weaponType.getName(), weaponType.getCode());
        return toWeaponTypeDto(weaponType);
    }

    @Transactional
    public void deleteWeaponType(UUID weaponTypeId) {
        WeaponTypeEntity weaponType = weaponTypeRepository.findById(weaponTypeId)
                .orElseThrow(() -> new EntityNotFoundException("Weapon type not found: " + weaponTypeId));
        // Remove related proficiencies and clear the reference on items
        weaponProficiencyRepository.deleteAll(weaponProficiencyRepository.findByWeaponTypeCodeIgnoreCase(weaponType.getCode()));
        itemRepository.findAll().forEach(item -> {
            if (weaponType.getCode().equalsIgnoreCase(item.getWeaponTypeCode())) {
                item.setWeaponTypeCode(null);
            }
        });
        weaponTypeRepository.delete(weaponType);
        log.info("Admin deleted weapon type '{}'", weaponType.getCode());
    }

    // --- DTO MAPPERS ---

    private AdminDtos.AdminItemDto toItemDto(ItemEntity item) {
        return new AdminDtos.AdminItemDto(item.getId(), item.getCode(), item.getName(), item.getType(),
                item.getWeaponTypeCode(), item.getDamage(), item.getAttackRange(), item.getWidth(), item.getHeight(),
                item.getDefense(), item.getEquipmentSlot(), item.getHeal());
    }

    private AdminDtos.AdminWeaponTypeDto toWeaponTypeDto(WeaponTypeEntity weaponType) {
        return new AdminDtos.AdminWeaponTypeDto(weaponType.getId(), weaponType.getCode(), weaponType.getName(),
                weaponType.getAccuracyPerLevel(), weaponType.getMaxAccuracy());
    }

    private String normalizeWeaponTypeCode(String weaponTypeCode) {
        if (weaponTypeCode == null || weaponTypeCode.isBlank()) {
            return null;
        }
        WeaponTypeEntity weaponType = weaponTypeRepository.findByCodeIgnoreCase(weaponTypeCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Unknown weapon type: " + weaponTypeCode));
        return weaponType.getCode();
    }

    private static String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }
}

