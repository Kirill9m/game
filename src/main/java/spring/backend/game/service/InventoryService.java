package spring.backend.game.service;

import java.util.List;

import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.InventoryItemResponse;
import spring.backend.game.dto.UseItemResponse;
import spring.backend.game.entity.ItemEntity;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.entity.PlayerInventoryEntity;
import spring.backend.game.repository.ItemRepository;
import spring.backend.game.repository.PlayerInventoryRepository;
import spring.backend.game.repository.PlayerRepository;

@Service
@RequiredArgsConstructor
public class InventoryService {
    // На старте инвентарь пустой, предметы выдаются в награду за квесты (например, за квест знакомства).
    // Расходники для восстановления здоровья выдаются сразу, чтобы механика была доступна с первых минут.
    private static final List<String> STARTER_ITEMS = List.of("MEDKIT", "BANDAGE");
    private static final int MAX_PLAYER_HEALTH = 100;

    private final ItemRepository itemRepository;
    private final PlayerInventoryRepository inventoryRepository;
    private final PlayerRepository playerRepository;

    @Transactional
    public void ensureStarterItems(String playerId) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found"));
        if (player.isStarterItemsGranted()) {
            return;
        }
        for (String itemCode : STARTER_ITEMS) {
            if (inventoryRepository.existsByPlayerIdAndItemCodeIgnoreCase(playerId, itemCode)) {
                continue;
            }
            ItemEntity item = itemRepository.findByCodeIgnoreCase(itemCode)
                    .orElseThrow(() -> new RuntimeException("Item not found: " + itemCode));
                inventoryRepository.save(PlayerInventoryEntity.builder()
                    .player(player)
                    .item(item)
                    .quantity(1)
                    .gridX(gridXFor(item.getCode()))
                    .gridY(gridYFor(item.getCode()))
                    .equipped(false)
                    .build());
        }
        player.setStarterItemsGranted(true);
        playerRepository.save(player);
    }

    @Transactional
    public List<InventoryItemResponse> getInventory(String playerId) {
        ensureStarterItems(playerId);
        return inventoryRepository.findByPlayerIdOrderByItemNameAsc(playerId).stream()
                .map(entry -> InventoryItemResponse.builder()
                        .code(entry.getItem().getCode())
                        .name(entry.getItem().getName())
                        .type(entry.getItem().getType())
                        .weaponTypeCode(entry.getItem().getWeaponTypeCode())
                        .damage(entry.getItem().getDamage())
                        .attackRange(entry.getItem().getAttackRange())
                        .quantity(entry.getQuantity())
                        .width(entry.getItem().getWidth())
                        .height(entry.getItem().getHeight())
                        .gridX(entry.getGridX())
                        .gridY(entry.getGridY())
                        .equipped(entry.isEquipped())
                        .defense(entry.getItem().getDefense())
                        .equipmentSlot(entry.getItem().getEquipmentSlot())
                        .heal(entry.getItem().getHeal())
                        .marked(entry.isMarked())
                        .build())
                .toList();
    }

    /**
     * Toggles the equipped state of an item. Only one item can be equipped per
     * equipment group: a single weapon, or a single armor piece per slot
     * (HELMET, BODY, LEGS, FEET). Equipping a new item automatically unequips
     * any other item from the same group.
     */
    @Transactional
    public List<InventoryItemResponse> equipItem(String playerId, String itemCode) {
        List<PlayerInventoryEntity> inventory = inventoryRepository.findByPlayerIdOrderByItemNameAsc(playerId);
        PlayerInventoryEntity selected = inventory.stream()
                .filter(entry -> entry.getItem().getCode().equalsIgnoreCase(itemCode))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Item not found in inventory"));
        String group = equipmentGroup(selected.getItem());
        boolean newEquipped = !selected.isEquipped();
        for (PlayerInventoryEntity entry : inventory) {
            if (entry.getItem().getCode().equalsIgnoreCase(itemCode)) {
                entry.setEquipped(newEquipped);
            } else if (equipmentGroup(entry.getItem()).equals(group)) {
                entry.setEquipped(false);
            }
        }
        return getInventory(playerId);
    }

    private String equipmentGroup(ItemEntity item) {
        String type = item.getType() == null ? "" : item.getType().toUpperCase();
        if ("WEAPON".equals(type)) {
            return "WEAPON";
        }
        String slot = item.getEquipmentSlot() == null ? "" : item.getEquipmentSlot().toUpperCase();
        return type + ":" + slot;
    }

    @Transactional
    public List<InventoryItemResponse> moveItem(String playerId, String itemCode, int gridX, int gridY) {
        List<PlayerInventoryEntity> inventory = inventoryRepository
                .findByPlayerIdOrderByItemNameAsc(playerId).stream()
                .filter(entry -> entry.getItem().getCode().equalsIgnoreCase(itemCode))
            .toList();
        PlayerInventoryEntity item = inventory.stream()
            .findFirst()
            .orElseThrow(() -> new RuntimeException("Item not found in inventory"));
        if (gridX < 0 || gridY < 0 || gridX + item.getItem().getWidth() > 8 || gridY + item.getItem().getHeight() > 6) {
            throw new IllegalArgumentException("Item does not fit in inventory");
        }
        boolean overlaps = inventoryRepository.findByPlayerIdOrderByItemNameAsc(playerId).stream()
            .filter(other -> other != item)
            .anyMatch(other -> rectanglesOverlap(
                gridX, gridY, item.getItem().getWidth(), item.getItem().getHeight(),
                other.getGridX(), other.getGridY(), other.getItem().getWidth(), other.getItem().getHeight()));
        if (overlaps) {
            throw new IllegalArgumentException("That inventory space is occupied");
        }
        item.setGridX(gridX);
        item.setGridY(gridY);
        return getInventory(playerId);
    }

        private boolean rectanglesOverlap(
            int firstX, int firstY, int firstWidth, int firstHeight,
            int secondX, int secondY, int secondWidth, int secondHeight) {
        return firstX < secondX + secondWidth
            && firstX + firstWidth > secondX
            && firstY < secondY + secondHeight
            && firstY + firstHeight > secondY;
        }

    private int gridXFor(String itemCode) {
        if ("PISTOL".equalsIgnoreCase(itemCode)) return 2;
        if ("WORLD_MAP".equalsIgnoreCase(itemCode)) return 5;
        if ("MEDKIT".equalsIgnoreCase(itemCode)) return 6;
        if ("BANDAGE".equalsIgnoreCase(itemCode)) return 7;
        return 0;
    }

    private int gridYFor(String itemCode) {
        return 0;
    }

    @Transactional
    public void addItem(String playerId, String itemCode) {
        addItem(playerId, itemCode, 1);
    }

    @Transactional
    public void addItem(String playerId, String itemCode, int quantity) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found: " + playerId));
        ItemEntity item = itemRepository.findByCodeIgnoreCase(itemCode)
                .orElseThrow(() -> new RuntimeException("Item not found: " + itemCode));
        boolean added = tryAddItem(player, item, quantity);
        if (!added) {
            throw new IllegalStateException("Inventory is full — free some space first");
        }
    }

    /**
     * Adds {@code quantity} of the item to the main inventory when there is a
     * free slot (existing stacks are merged first). Returns {@code false} when
     * the inventory grid has no room and nothing happens.
     */
    public boolean tryAddItem(PlayerEntity player, ItemEntity item, int quantity) {
        return tryAddItem(player, item, quantity, false);
    }

    /**
     * Adds {@code quantity} of the item to the main inventory, marking the
     * resulting stack as field loot when {@code marked} is {@code true}. When an
     * existing stack is merged, it becomes marked as well. Returns {@code false}
     * when the inventory grid has no room and nothing happens.
     */
    public boolean tryAddItem(PlayerEntity player, ItemEntity item, int quantity, boolean marked) {
        var existingItems = inventoryRepository.findByPlayerIdOrderByItemNameAsc(player.getId());
        var existingItem = existingItems.stream()
                .filter(e -> e.getItem().getCode().equalsIgnoreCase(item.getCode()))
                .findFirst()
                .orElse(null);

        if (existingItem != null) {
            existingItem.setQuantity(existingItem.getQuantity() + quantity);
            if (marked) {
                existingItem.setMarked(true);
            }
            inventoryRepository.save(existingItem);
            return true;
        }

        for (int y = 0; y < 10; y++) {
            for (int x = 0; x <= 8 - item.getWidth(); x++) {
                final int checkX = x;
                final int checkY = y;
                boolean overlaps = existingItems.stream().anyMatch(other ->
                        rectanglesOverlap(checkX, checkY, item.getWidth(), item.getHeight(),
                                other.getGridX(), other.getGridY(), other.getItem().getWidth(), other.getItem().getHeight()));
                if (!overlaps) {
                    inventoryRepository.save(PlayerInventoryEntity.builder()
                            .player(player)
                            .item(item)
                            .quantity(quantity)
                            .gridX(checkX)
                            .gridY(checkY)
                            .equipped(false)
                            .marked(marked)
                            .build());
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Uses a consumable item outside of combat: restores the player's health by
     * the item's {@code heal} amount (capped at max health) and consumes one
     * unit of the item. Returns the new health, the amount healed and the
     * updated inventory.
     */
    @Transactional
    public UseItemResponse useItem(String playerId, String itemCode) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found: " + playerId));
        PlayerInventoryEntity entry = inventoryRepository.findByPlayerIdOrderByItemNameAsc(playerId).stream()
                .filter(e -> e.getItem().getCode().equalsIgnoreCase(itemCode))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Item not found in inventory"));
        ItemEntity item = entry.getItem();
        if (!"CONSUMABLE".equalsIgnoreCase(item.getType())) {
            throw new IllegalArgumentException("This item cannot restore health");
        }
        int healAmount = item.getHeal();
        if (healAmount <= 0) {
            throw new IllegalArgumentException("This item has no healing effect");
        }
        int before = player.getHealth();
        if (before >= MAX_PLAYER_HEALTH) {
            throw new IllegalArgumentException("You are already at full health");
        }
        int newHealth = Math.min(MAX_PLAYER_HEALTH, before + healAmount);
        int healed = newHealth - before;
        player.setHealth(newHealth);
        playerRepository.save(player);

        if (entry.getQuantity() <= 1) {
            inventoryRepository.delete(entry);
        } else {
            entry.setQuantity(entry.getQuantity() - 1);
            inventoryRepository.save(entry);
        }
        return UseItemResponse.builder()
                .health(newHealth)
                .healed(healed)
                .inventory(getInventory(playerId))
                .build();
    }
}
