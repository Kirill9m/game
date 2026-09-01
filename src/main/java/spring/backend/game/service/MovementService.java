package spring.backend.game.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import spring.backend.game.dto.MoveRequest;
import spring.backend.game.dto.MoveResponse;
import spring.backend.game.dto.PlayerInfo;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.repository.PlayerRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MovementService {
    private final PlayerRepository playerRepository;

    @Transactional
    public MoveResponse movePlayer(UUID playerId, MoveRequest request) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        int currentX = player.getPositionX();
        int currentY = player.getPositionY();
        int targetX = request.getTargetX();
        int targetY = request.getTargetY();

        int deltaX = Math.abs(targetX - currentX);
        int deltaY = Math.abs(targetY - currentY);

        boolean isAdjacent = (deltaY + deltaX == 1);
        if (!isAdjacent) {
            throw new IllegalArgumentException("You can move only one coordinate at the same time");
        }

        player.setPositionX(targetX);
        player.setPositionY(targetY);
        playerRepository.save(player);

        List<PlayerEntity> playersOnSameTile = playerRepository.findByPositionXAndPositionY(targetX, targetY);

        List<PlayerInfo> playerInfos = playersOnSameTile.stream()
                .map(p -> PlayerInfo.builder()
                        .playerId(p.getId())
                        .userId(p.getUserId())
                        .build())
                .toList();

        return MoveResponse.builder()
                .positionX(targetX)
                .positionY(targetY)
                .playersOnTile(playerInfos)
                .build();
    }
}
