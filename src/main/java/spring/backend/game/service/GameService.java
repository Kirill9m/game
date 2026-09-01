package spring.backend.game.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import spring.backend.game.dto.CreateGameRequest;
import spring.backend.game.dto.GameResponse;
import spring.backend.game.entity.GameEntity;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.repository.GameRepository;
import spring.backend.game.repository.PlayerRepository;

@Service
@RequiredArgsConstructor
public class GameService {
    private final GameRepository gameRepository;
    private final PlayerRepository playerRepository;

    @Transactional
    public GameResponse createGame(CreateGameRequest request) {
        GameEntity game = GameEntity.builder()
                .status("WAITING FOR PLAYERS")
                .currentTurnPlayerId(request.getUserId())
                .build();

        GameEntity savedGame = gameRepository.save(game);

        PlayerEntity player = PlayerEntity.builder()
                .id(String.valueOf(request.getUserId()))
                .positionX(0)
                .positionY(0)
                .turnOrder(1)
                .build();

        playerRepository.save(player);

        return GameResponse.builder()
                .id(savedGame.getId())
                .status(savedGame.getStatus())
                .currentTurnPlayerId(savedGame.getCurrentTurnPlayerId())
                .build();
    }
}
