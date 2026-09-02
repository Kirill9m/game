package spring.backend.game.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import spring.backend.game.dto.PlayerInfo;
import spring.backend.game.dto.PlayerLoginRequest;
import spring.backend.game.dto.PlayerLoginResponse;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.repository.PlayerRepository;
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

        List<PlayerInfo> playersOnTile = playerRepository
                .findByPositionXAndPositionY(player.getPositionX(), player.getPositionY())
                .stream()
                .map(tilePlayer -> PlayerInfo.builder()
                        .playerId(tilePlayer.getId())
                        .username(tilePlayer.getUsername())
                        .build())
                .toList();

        return ResponseEntity.ok(PlayerLoginResponse.builder()
                .id(player.getId())
                .username(player.getUsername())
                .avatarUrl(player.getAvatarUrl())
                .positionX(player.getPositionX())
                .positionY(player.getPositionY())
                .playersOnTile(playersOnTile)
                .build());
    }

    @GetMapping("/{playerId}/inventory")
    public ResponseEntity<List<InventoryItemResponse>> getInventory(@PathVariable String playerId) {
        return ResponseEntity.ok(inventoryService.getInventory(playerId));
    }
}