package spring.backend.game.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import spring.backend.game.dto.CreateGameRequest;
import spring.backend.game.dto.GameResponse;
import spring.backend.game.service.GameService;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/games")
public class GameController {
    private final GameService gameService;

    @PostMapping
    public GameResponse createGame(@RequestBody CreateGameRequest request) {
        return gameService.createGame(request);
    }
}
