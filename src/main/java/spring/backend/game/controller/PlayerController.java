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
import spring.backend.game.service.MovementService;
import spring.backend.game.service.WorldZoneService;
import spring.backend.game.dto.InventoryItemResponse;
import spring.backend.game.dto.UseItemResponse;

import java.time.Instant;

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
    private final MovementService movementService;

    /** Players are considered offline after this duration of inactivity. */
    private static final long ONLINE_THRESHOLD_SECONDS = 90; // 1.5 minutes

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

        // Update lastSeen (online status) on every login
        player.setLastSeen(Instant.now());
        playerRepository.save(player);

        // Grant the ADMIN role to players listed in the configuration
        adminService.promoteConfiguredAdmins();
        if (playerRepository.findById(player.getId()).isPresent()) {
            player = playerRepository.findById(player.getId()).get();
        }

        inventoryService.ensureStarterItems(player.getId());
        clearMarksIfInCity(player);

        return ResponseEntity.ok(toPlayerResponse(player));
    }

    @GetMapping("/{playerId}/state")
    public ResponseEntity<PlayerLoginResponse> getState(@PathVariable String playerId) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));
        clearMarksIfInCity(player);

        // Update lastSeen (online status) when polling state
        player.setLastSeen(Instant.now());
        playerRepository.save(player);

        return ResponseEntity.ok(toPlayerResponse(player));
    }

    /**
     * Heartbeat — updates lastSeen so the player is considered online.
     * Called periodically (every 60 s) by the client.
     */
    @PostMapping("/{playerId}/heartbeat")
    public ResponseEntity<Void> heartbeat(@PathVariable String playerId) {
        playerRepository.findById(playerId).ifPresent(player -> {
            player.setLastSeen(Instant.now());
            playerRepository.save(player);
        });
        return ResponseEntity.ok().build();
    }

    /** Secures lingering marked field loot when the player is already in the city. */
    private void clearMarksIfInCity(PlayerEntity player) {
        if (!worldZoneService.isOutsideSafeZone(player.getPositionX(), player.getPositionY())) {
            lootService.clearMarkedItems(player.getId());
        }
    }

    private PlayerLoginResponse toPlayerResponse(PlayerEntity player) {
        Instant now = Instant.now();
        Instant onlineSince = now.minusSeconds(ONLINE_THRESHOLD_SECONDS);
        UUID locId = player.getCurrentLocationId();

        List<PlayerInfo> playersOnTile;
        List<PlayerInfo> playersInLocation;

        if (locId != null) {
            // Inside a building — tile is hidden, show players in the same building
            playersOnTile = List.of();
            playersInLocation = playerRepository.findOnlineByCurrentLocationId(locId, onlineSince)
                    .stream()
                    .filter(p -> !p.getId().equals(player.getId()))
                    .map(this::toPlayerInfo)
                    .toList();
        } else {
            // Outside — show other outside players on the same tile
            playersOnTile = playerRepository.findOnlineOutsideByPosition(
                            player.getPositionX(), player.getPositionY(), onlineSince)
                    .stream()
                    .filter(p -> !p.getId().equals(player.getId()))
                    .map(this::toPlayerInfo)
                    .toList();
            playersInLocation = List.of();
        }

        List<NpcInfoResponse> npcs = npcRepository
                .findByPositionXAndPositionYAndLocationIdIsNull(player.getPositionX(), player.getPositionY())
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
                .playersInLocation(playersInLocation)
                .currentLocationId(locId)
                .npcs(npcs)
                .fieldLoot(lootService.getFieldLoot(player.getPositionX(), player.getPositionY()))
                .inSafeZone(!worldZoneService.isOutsideSafeZone(player.getPositionX(), player.getPositionY()))
                .build();
    }

    private PlayerInfo toPlayerInfo(PlayerEntity p) {
        return PlayerInfo.builder()
                .playerId(p.getId())
                .username(p.getUsername())
                .online(true)
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

    /** Picks up a loot pile lying on the player's current cell. */
    @PostMapping("/{playerId}/loot/{lootId}/pickup")
    public ResponseEntity<PickupLootResponse> pickupLoot(
            @PathVariable String playerId,
            @PathVariable UUID lootId) {
        return ResponseEntity.ok(lootService.pickupLoot(playerId, lootId));
    }
}