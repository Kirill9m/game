package spring.backend.game.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import spring.backend.game.dto.PlayerInfo;
import spring.backend.game.dto.PlayerLoginRequest;
import spring.backend.game.dto.PlayerLoginResponse;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.repository.PlayerRepository;

import java.util.List;

@RestController
@RequestMapping("/api/v1/players")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class PlayerController {

    private final PlayerRepository playerRepository;

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
}