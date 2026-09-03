package spring.backend.game.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import spring.backend.game.dto.PlayerInfo;
import spring.backend.game.dto.PlayerLoginRequest;
import spring.backend.game.dto.PlayerLoginResponse;
import spring.backend.game.dto.NpcInfoResponse;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.repository.PlayerRepository;
import spring.backend.game.repository.QuestSystem.NpcRepository;
import spring.backend.game.service.InventoryService;
import spring.backend.game.dto.InventoryItemResponse;

import java.util.List;

@RestController
@RequestMapping("/api/v1/players")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.8.96:3000"})
public class PlayerController {

    private final PlayerRepository playerRepository;
    private final InventoryService inventoryService;
    private final NpcRepository npcRepository;

    @PostMapping("/login")
    public ResponseEntity<PlayerLoginResponse> loginOrCreate(@RequestBody PlayerLoginRequest request) {
        PlayerEntity player = playerRepository.findById(request.getGithubId()).orElseGet(() -> {
            PlayerEntity newPlayer = new PlayerEntity();
            newPlayer.setId(request.getGithubId());
            newPlayer.setUsername(request.getUsername());
            newPlayer.setAvatarUrl(request.getAvatarUrl());
            newPlayer.setPositionX(0);
            newPlayer.setPositionY(0);
            return playerRepository.save(newPlayer);
        });

        inventoryService.ensureStarterItems(player.getId());

        return ResponseEntity.ok(toPlayerResponse(player));
    }

    @GetMapping("/{playerId}/state")
    public ResponseEntity<PlayerLoginResponse> getState(@PathVariable String playerId) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));
        return ResponseEntity.ok(toPlayerResponse(player));
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
                .playersOnTile(playersOnTile)
                .npcs(npcs)
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
}