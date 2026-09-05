package spring.backend.game.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.PickupLootResponse;
import spring.backend.game.dto.WorldLootResponse;
import spring.backend.game.entity.ItemEntity;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.entity.PlayerInventoryEntity;
import spring.backend.game.entity.WorldLootEntity;
import spring.backend.game.repository.ItemRepository;
import spring.backend.game.repository.PlayerInventoryRepository;
import spring.backend.game.repository.PlayerRepository;
import spring.backend.game.repository.WorldLootRepository;

/**
 * Field loot mechanics:
 * <ul>
 *   <li>Loot collected outside the city (safe zone) goes straight into the main
 *       inventory but is marked as field loot.</li>
 *   <li>Re-entering the city clears the mark, securing the items.</li>
 *   <li>Being defeated outside the city (PvE) destroys the marked items.</li>
 *   <li>Being killed by another player (PvP) drops the marked items as loot.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class LootService {
    private final PlayerRepository playerRepository;
    private final ItemRepository itemRepository;
    private final PlayerInventoryRepository playerInventoryRepository;
    private final WorldLootRepository worldLootRepository;
    private final WorldZoneService worldZoneService;
    private final InventoryService inventoryService;

    /** Marked (field loot) inventory entries currently held by the player. */
    @Transactional
    public List<PlayerInventoryEntity> getMarkedItems(String playerId) {
        return playerInventoryRepository.findByPlayerIdAndMarkedTrueOrderByItemNameAsc(playerId);
    }

    /** Loot piles lying on the given world cell. */
    public List<WorldLootResponse> getFieldLoot(int x, int y) {
        return worldLootRepository.findByPositionXAndPositionYOrderByCreatedAtAsc(x, y).stream()
                .map(this::toResponse)
                .toList();
    }

    /** Loot piles inside a circular area (for map rendering). */
    public List<WorldLootResponse> getFieldLootAround(int centerX, int centerY, int radius) {
        return worldLootRepository
                .findByPositionXBetweenAndPositionYBetween(centerX - radius, centerX + radius,
                        centerY - radius, centerY + radius)
                .stream()
                .filter(pile -> {
                    long distanceX = (long) pile.getPositionX() - centerX;
                    long distanceY = (long) pile.getPositionY() - centerY;
                    return distanceX * distanceX + distanceY * distanceY <= (long) radius * radius;
                })
                .map(this::toResponse)
                .toList();
    }

    private WorldLootResponse toResponse(WorldLootEntity pile) {
        return WorldLootResponse.builder()
                .id(pile.getId())
                .itemCode(pile.getItem().getCode())
                .itemName(pile.getItem().getName())
                .quantity(pile.getQuantity())
                .ownerId(pile.getOwnerId())
                .ownerName(pile.getOwnerId() == null ? null
                        : playerRepository.findById(pile.getOwnerId())
                                .map(PlayerEntity::getUsername)
                                .orElse(null))
                .positionX(pile.getPositionX())
                .positionY(pile.getPositionY())
                .build();
    }

    /**
     * Adds loot straight to the player's inventory. Outside the city the item is
     * marked as field loot; inside the city it is added normally. When the
     * inventory grid is full the item is dropped as a world loot pile instead.
     */
    @Transactional
    public void addLootToPlayer(String playerId, ItemEntity item, int quantity) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + playerId));
        boolean marked = worldZoneService.isOutsideSafeZone(player.getPositionX(), player.getPositionY());
        if (!inventoryService.tryAddItem(player, item, quantity, marked)) {
            dropAsWorldLoot(player, item, quantity);
        }
    }

    /** Adds loot resolved by item code (convenience for the combat system). */
    @Transactional
    public void addLootByCode(String playerId, String itemCode, int quantity) {
        ItemEntity item = itemRepository.findByCodeIgnoreCase(itemCode)
                .orElseThrow(() -> new EntityNotFoundException("Item not found: " + itemCode));
        addLootToPlayer(playerId, item, quantity);
    }

    /**
     * Removes every marked (field loot) inventory entry and returns the removed
     * entries so the combat system can drop them onto the board on a PvP defeat.
     */
    @Transactional
    public List<PlayerInventoryEntity> takeMarkedItems(String playerId) {
        List<PlayerInventoryEntity> marked = getMarkedItems(playerId);
        if (!marked.isEmpty()) {
            playerInventoryRepository.deleteAll(marked);
        }
        return marked;
    }

    /**
     * Destroys the player's marked (field loot) items. Used when the player is
     * defeated outside the city by an enemy (PvE) - the loot is simply lost.
     */
    @Transactional
    public void discardMarkedItems(String playerId) {
        List<PlayerInventoryEntity> marked = getMarkedItems(playerId);
        if (!marked.isEmpty()) {
            playerInventoryRepository.deleteAll(marked);
        }
    }

    /**
     * Drops the player's marked (field loot) items as world loot piles on their
     * current cell - only when the cell is outside the city. Used on surrender.
     */
    @Transactional
    public void dropMarkedItemsAsWorldLoot(String playerId) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + playerId));
        if (!worldZoneService.isOutsideSafeZone(player.getPositionX(), player.getPositionY())) {
            return;
        }
        List<PlayerInventoryEntity> marked = getMarkedItems(playerId);
        if (marked.isEmpty()) {
            return;
        }
        Instant now = Instant.now();
        marked.forEach(entry -> worldLootRepository.save(WorldLootEntity.builder()
                .item(entry.getItem())
                .ownerId(playerId)
                .positionX(player.getPositionX())
                .positionY(player.getPositionY())
                .quantity(entry.getQuantity())
                .createdAt(now)
                .build()));
        playerInventoryRepository.deleteAll(marked);
    }

    /**
     * Secures every marked (field loot) entry by clearing its mark. Returns the
     * number of items secured. Called when the player re-enters the city.
     */
    @Transactional
    public int clearMarkedItems(String playerId) {
        List<PlayerInventoryEntity> marked = getMarkedItems(playerId);
        int secured = marked.stream().mapToInt(PlayerInventoryEntity::getQuantity).sum();
        marked.forEach(entry -> entry.setMarked(false));
        return secured;
    }

    /** Picks up a loot pile lying on the player's current cell. */
    @Transactional
    public PickupLootResponse pickupLoot(String playerId, UUID lootId) {
        WorldLootEntity pile = worldLootRepository.findById(lootId)
                .orElseThrow(() -> new EntityNotFoundException("Loot pile not found"));
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + playerId));
        if (pile.getPositionX() != player.getPositionX() || pile.getPositionY() != player.getPositionY()) {
            throw new IllegalStateException("You must be on the same tile as the loot");
        }

        boolean insideCity = !worldZoneService.isOutsideSafeZone(player.getPositionX(), player.getPositionY());
        boolean added = inventoryService.tryAddItem(player, pile.getItem(), pile.getQuantity(), !insideCity);
        if (!added) {
            throw new IllegalStateException("Inventory is full - free some space first");
        }
        worldLootRepository.delete(pile);

        String notice = insideCity
                ? "You picked up " + pile.getItem().getName() + " x " + pile.getQuantity()
                        + " - it went straight to your inventory."
                : "You picked up " + pile.getItem().getName() + " x " + pile.getQuantity()
                        + " - it is marked as field loot and will be lost if you die outside the city.";

        return PickupLootResponse.builder()
                .fieldLoot(getFieldLoot(player.getPositionX(), player.getPositionY()))
                .inventory(inventoryService.getInventory(playerId))
                .notice(notice)
                .build();
    }

    private void dropAsWorldLoot(PlayerEntity player, ItemEntity item, int quantity) {
        worldLootRepository.save(WorldLootEntity.builder()
                .item(item)
                .ownerId(player.getId())
                .positionX(player.getPositionX())
                .positionY(player.getPositionY())
                .quantity(quantity)
                .createdAt(Instant.now())
                .build());
    }
}