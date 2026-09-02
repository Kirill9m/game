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
    private static final List<String> STARTER_ITEMS = List.of("KNIFE", "PISTOL");

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
                        .damage(entry.getItem().getDamage())
                        .attackRange(entry.getItem().getAttackRange())
                        .quantity(entry.getQuantity())
                        .build())
                .toList();
    }
}
