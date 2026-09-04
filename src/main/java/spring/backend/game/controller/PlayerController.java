package spring.backend.game.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import spring.backend.game.dto.PlayerInfo;
import spring.backend.game.dto.PlayerLoginRequest;
import spring.backend.game.dto.PlayerLoginResponse;
import spring.backend.game.dto.NpcInfoResponse;
import spring.backend.game.dto.PickupLootResponse;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.repository.PlayerRepository;
import spring.backend.game.repository.QuestSystem.NpcRepository;
import spring.backend.game.service.AdminService;
import spring.backend.game.service.InventoryService;
import spring.backend.game.service.LootService;
import spring.backend.game.service.WorldZoneService;
import spring.backend.game.dto.InventoryItemResponse;
import spring.backend.game.dto.UseItemResponse;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/players")
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerRepository playerRepository;
    private final InventoryService inventoryService;
    private final NpcRepository npcRepository;
    private final AdminService adminService;
    private final LootService lootService;
    private final WorldZoneService worldZoneService;

    @PostMapping("/login")
    public ResponseEntity<PlayerLoginResponse> loginOrCreate(@RequestBody PlayerLoginRequest request) {
        PlayerEntity player = playerRepository.findById(request.getGithubId()).orElseGet(() -> {
            PlayerEntity newPlayer = new PlayerEntity();
            newPlayer.setId(request.getGithubId());
            newPlayer.setUsername(request.getUsername());
            newPlayer.setAvatarUrl(request.getAvatarUrl());
            newPlayer.setPositionX(0);
            newPlayer.setPositionY(0);
            newPlayer.setRole(PlayerEntity.ROLE_PLAYER);
            return playerRepository.save(newPlayer);
        });

        // Grant the ADMIN role to players listed in the configuration
        adminService.promoteConfiguredAdmins();
        if (playerRepository.findById(player.getId()).isPresent()) {
            player = playerRepository.findById(player.getId()).get();
        }

        inventoryService.ensureStarterItems(player.getId());
        depositLootIfInCity(player);

        return ResponseEntity.ok(toPlayerResponse(player));
    }

    @GetMapping("/{playerId}/state")
    public ResponseEntity<PlayerLoginResponse> getState(@PathVariable String playerId) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));
        depositLootIfInCity(player);
        return ResponseEntity.ok(toPlayerResponse(player));
    }

    /** Deposits a lingering field loot bag when the player is already in the city. */
    private void depositLootIfInCity(PlayerEntity player) {
        if (!worldZoneService.isOutsideSafeZone(player.getPositionX(), player.getPositionY())) {
            lootService.depositLootBag(player.getId());
        }
    }

    private PlayerLoginResponse toPlayerResponse(PlayerEntity player) {
        List<PlayerInfo> playersOnTile = playerRepository
                .findByPositionXAndPositionY(player.getPositionX(), player.getPositionY())
                .stream()
                .map(tilePlayer -> PlayerInfo.builder()
                        .playerId(tilePlayer.getId())
                        .username(tilePlayer.getUsername())
                        .build())
                .toList();
                List<NpcInfoResponse> npcs = npcRepository
                    .findByPositionXAndPositionY(player.getPositionX(), player.getPositionY())
                    .stream()
                    .map(npc -> NpcInfoResponse.builder()
                        .id(npc.getId())
                        .code(npc.getCode())
                        .name(npc.getName())
                        .positionX(npc.getPositionX())
                        .positionY(npc.getPositionY())
                        .build())
                    .toList();

        return PlayerLoginResponse.builder()
                .id(player.getId())
                .username(player.getUsername())
                .avatarUrl(player.getAvatarUrl())
                .positionX(player.getPositionX())
                .positionY(player.getPositionY())
                .gold(player.getGold())
                .questPoints(player.getQuestPoints())
                .health(player.getHealth())
                .level(player.getLevel())
                .strength(player.getStrength())
                .energy(player.getEnergy())
                .agility(player.getAgility())
                .stamina(player.getStamina())
                .role(player.getRole())
                .playersOnTile(playersOnTile)
                .npcs(npcs)
                .lootBag(lootService.getLootBag(player.getId()))
                .fieldLoot(lootService.getFieldLoot(player.getPositionX(), player.getPositionY()))
                .inSafeZone(!worldZoneService.isOutsideSafeZone(player.getPositionX(), player.getPositionY()))
                .build();
    }

    @GetMapping("/{playerId}/inventory")
    public ResponseEntity<List<InventoryItemResponse>> getInventory(@PathVariable String playerId) {
        return ResponseEntity.ok(inventoryService.getInventory(playerId));
    }

    @PatchMapping("/{playerId}/inventory/{itemCode}/equip")
    public ResponseEntity<List<InventoryItemResponse>> equipItem(
            @PathVariable String playerId, @PathVariable String itemCode) {
        return ResponseEntity.ok(inventoryService.equipItem(playerId, itemCode));
    }

    @PatchMapping("/{playerId}/inventory/{itemCode}/position")
    public ResponseEntity<List<InventoryItemResponse>> moveItem(
            @PathVariable String playerId,
            @PathVariable String itemCode,
            @RequestParam int gridX,
            @RequestParam int gridY) {
        return ResponseEntity.ok(inventoryService.moveItem(playerId, itemCode, gridX, gridY));
    }

    /** Uses a health-restoring consumable outside of combat. */
    @PostMapping("/{playerId}/inventory/{itemCode}/use")
    public ResponseEntity<UseItemResponse> useItem(
            @PathVariable String playerId, @PathVariable String itemCode) {
        return ResponseEntity.ok(inventoryService.useItem(playerId, itemCode));
    }

    /** Items currently kept in the field loot bag (collected outside the city). */
    @GetMapping("/{playerId}/loot-bag")
    public ResponseEntity<List<InventoryItemResponse>> getLootBag(@PathVariable String playerId) {
        return ResponseEntity.ok(lootService.getLootBag(playerId));
    }

    /** Picks up a loot pile lying on the player's current cell. */
    @PostMapping("/{playerId}/loot/{lootId}/pickup")
    public ResponseEntity<PickupLootResponse> pickupLoot(
            @PathVariable String playerId,
            @PathVariable UUID lootId) {
        return ResponseEntity.ok(lootService.pickupLoot(playerId, lootId));
    }
}