package spring.backend.game.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import spring.backend.game.dto.MoveRequest;
import spring.backend.game.dto.MoveResponse;
import spring.backend.game.service.MovementService;

@RestController
@RequestMapping("/api/v1/players")
@RequiredArgsConstructor
public class MovementController {
    private final MovementService movementService;

    @PatchMapping("/{playerId}/move")
    public MoveResponse move(@PathVariable String playerId, @RequestBody MoveRequest request) {
        return movementService.movePlayer(playerId, request);
    }
}
