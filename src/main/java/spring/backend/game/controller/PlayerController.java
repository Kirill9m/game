package spring.backend.game.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.repository.PlayerRepository;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/players")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:3000")
public class PlayerController {

    private final PlayerRepository playerRepository;

    @GetMapping("/{playerId}")
    public ResponseEntity<PlayerEntity> getPlayer(@PathVariable UUID playerId) {
        return playerRepository.findById(playerId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}