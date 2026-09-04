package spring.backend.game.service;

import java.util.List;

import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.InventoryItemResponse;
import spring.backend.game.entity.ItemEntity;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.entity.PlayerInventoryEntity;
import spring.backend.game.repository.ItemRepository;
import spring.backend.game.repository.PlayerInventoryRepository;
import spring.backend.game.repository.PlayerRepository;

@Service
@RequiredArgsConstructor
public class InventoryService {
    // На старте инвентарь пустой, предметы выдаются в награду за квесты (например, за квест знакомства)
    private static final List<String> STARTER_ITEMS = List.of();

    private final ItemRepository itemRepository;
    private final PlayerInventoryRepository inventoryRepository;
    private final PlayerRepository playerRepository;

    @Transactional
    public void ensureStarterItems(String playerId) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found"));
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
        return "PISTOL".equalsIgnoreCase(itemCode) ? 2 : "WORLD_MAP".equalsIgnoreCase(itemCode) ? 5 : 0;
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
        var existingItems = inventoryRepository.findByPlayerIdOrderByItemNameAsc(player.getId());
        var existingItem = existingItems.stream()
                .filter(e -> e.getItem().getCode().equalsIgnoreCase(item.getCode()))
                .findFirst()
                .orElse(null);

        if (existingItem != null) {
            existingItem.setQuantity(existingItem.getQuantity() + quantity);
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
                            .build());
                    return true;
                }
            }
        }
        return false;
    }
}