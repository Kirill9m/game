package spring.backend.game.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.InventoryItemResponse;
import spring.backend.game.dto.PickupLootResponse;
import spring.backend.game.dto.WorldLootResponse;
import spring.backend.game.entity.ItemEntity;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.entity.PlayerLootBagEntity;
import spring.backend.game.entity.WorldLootEntity;
import spring.backend.game.repository.ItemRepository;
import spring.backend.game.repository.PlayerLootBagRepository;
import spring.backend.game.repository.PlayerRepository;
import spring.backend.game.repository.WorldLootRepository;

/**
 * Field loot mechanics:
 * <ul>
 *   <li>Loot collected outside the city (safe zone) goes into the player's field
 *       loot bag instead of the main inventory.</li>
 *   <li>Re-entering the city automatically deposits the bag into the main inventory.</li>
 *   <li>Being defeated outside the city drops the whole bag as world loot on the
 *       player's cell - any player on that tile can pick it up.</li>
 *   <li>Victory in a bot hunt grants a random weapon as loot (to the bag while
 *       outside the city).</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class LootService {
    private final PlayerRepository playerRepository;
    private final ItemRepository itemRepository;
    private final PlayerLootBagRepository lootBagRepository;
    private final WorldLootRepository worldLootRepository;
    private final WorldZoneService worldZoneService;
    private final InventoryService inventoryService;

    /** Items currently in the field loot bag. */
    @Transactional
    public List<InventoryItemResponse> getLootBag(String playerId) {
        return lootBagRepository.findByPlayerIdOrderByItemNameAsc(playerId).stream()
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
                        .gridX(0)
                        .gridY(0)
                        .equipped(false)
                        .build())
                .toList();
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
     * Adds loot to the player. Outside the city it goes into the field bag;
     * inside the city straight to the main inventory (bag is the overflow when
     * the inventory grid is full).
     */
    @Transactional
    public void addLootToPlayer(String playerId, ItemEntity item, int quantity) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found: " + playerId));
        boolean insideCity = !worldZoneService.isOutsideSafeZone(player.getPositionX(), player.getPositionY());
        if (insideCity) {
            boolean added = inventoryService.tryAddItem(player, item, quantity);
            if (added) {
                return;
            }
        }
        addToBag(player, item, quantity);
    }

    /** Adds loot resolved by item code (convenience for the combat system). */
    @Transactional
    public void addLootByCode(String playerId, String itemCode, int quantity) {
        ItemEntity item = itemRepository.findByCodeIgnoreCase(itemCode)
                .orElseThrow(() -> new RuntimeException("Item not found: " + itemCode));
        addLootToPlayer(playerId, item, quantity);
    }

    /**
     * Removes the whole field loot bag and returns the removed entries so the
     * combat system can drop them onto the board when the player is defeated.
     */
    @Transactional
    public List<PlayerLootBagEntity> takeFieldBag(String playerId) {
        List<PlayerLootBagEntity> bag = lootBagRepository.findByPlayerIdOrderByItemNameAsc(playerId);
        if (!bag.isEmpty()) {
            lootBagRepository.deleteAll(bag);
        }
        return bag;
    }

    /**
     * Drops the whole field loot bag as world loot piles on the given cell -
     * only when the cell is outside the city. Kept for surrenders.
     */
    @Transactional
    public void dropBagOutsideCity(String playerId) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found: " + playerId));
        if (!worldZoneService.isOutsideSafeZone(player.getPositionX(), player.getPositionY())) {
            return;
        }
        List<PlayerLootBagEntity> bag = lootBagRepository.findByPlayerIdOrderByItemNameAsc(playerId);
        if (bag.isEmpty()) {
            return;
        }
        Instant now = Instant.now();
        bag.forEach(entry -> worldLootRepository.save(WorldLootEntity.builder()
                .item(entry.getItem())
                .ownerId(playerId)
                .positionX(player.getPositionX())
                .positionY(player.getPositionY())
                .quantity(entry.getQuantity())
                .createdAt(now)
                .build()));
        lootBagRepository.deleteAll(bag);
    }

    /**
     * Moves every field bag entry that fits into the main inventory (existing
     * stacks are merged). Returns the number of items deposited.
     */
    @Transactional
    public int depositLootBag(String playerId) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found: " + playerId));
        List<PlayerLootBagEntity> bag = lootBagRepository.findByPlayerIdOrderByItemNameAsc(playerId);
        int deposited = 0;
        for (PlayerLootBagEntity entry : bag) {
            if (inventoryService.tryAddItem(player, entry.getItem(), entry.getQuantity())) {
                lootBagRepository.delete(entry);
                deposited += entry.getQuantity();
            }
        }
        return deposited;
    }

    /** Picks up a loot pile lying on the player's current cell. */
    @Transactional
    public PickupLootResponse pickupLoot(String playerId, UUID lootId) {
        WorldLootEntity pile = worldLootRepository.findById(lootId)
                .orElseThrow(() -> new RuntimeException("Loot pile not found"));
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found: " + playerId));
        if (pile.getPositionX() != player.getPositionX() || pile.getPositionY() != player.getPositionY()) {
            throw new IllegalStateException("You must be on the same tile as the loot");
        }

        boolean insideCity = !worldZoneService.isOutsideSafeZone(player.getPositionX(), player.getPositionY());
        String notice;
        if (insideCity) {
            boolean added = inventoryService.tryAddItem(player, pile.getItem(), pile.getQuantity());
            if (!added) {
                throw new IllegalStateException("Inventory is full - free some space first");
            }
            notice = "You picked up " + pile.getItem().getName() + " x " + pile.getQuantity()
                    + " - it went straight to your inventory.";
        } else {
            addToBag(player, pile.getItem(), pile.getQuantity());
            notice = "You picked up " + pile.getItem().getName() + " x " + pile.getQuantity()
                    + " - it is kept in your field loot bag. Return to the city to deposit it.";
        }
        worldLootRepository.delete(pile);

        return PickupLootResponse.builder()
                .lootBag(getLootBag(playerId))
                .fieldLoot(getFieldLoot(player.getPositionX(), player.getPositionY()))
                .inventory(inventoryService.getInventory(playerId))
                .notice(notice)
                .build();
    }

    private void addToBag(PlayerEntity player, ItemEntity item, int quantity) {
        List<PlayerLootBagEntity> bag = lootBagRepository.findByPlayerIdOrderByItemNameAsc(player.getId());
        PlayerLootBagEntity existing = bag.stream()
                .filter(entry -> entry.getItem().getCode().equalsIgnoreCase(item.getCode()))
                .findFirst()
                .orElse(null);
        if (existing != null) {
            existing.setQuantity(existing.getQuantity() + quantity);
            lootBagRepository.save(existing);
        } else {
            lootBagRepository.save(PlayerLootBagEntity.builder()
                    .player(player)
                    .item(item)
                    .quantity(quantity)
                    .build());
        }
    }
}