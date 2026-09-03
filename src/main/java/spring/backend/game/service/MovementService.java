package spring.backend.game.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import spring.backend.game.dto.MoveRequest;
import spring.backend.game.dto.MoveResponse;
import spring.backend.game.dto.NpcInfoResponse;
import spring.backend.game.dto.PlayerInfo;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.repository.PlayerRepository;
import spring.backend.game.repository.QuestSystem.NpcRepository;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MovementService {
    private final PlayerRepository playerRepository;
    private final NpcRepository npcRepository;

    @Transactional
    public MoveResponse movePlayer(String playerId, MoveRequest request) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        Instant now = Instant.now();

        if (player.getCooldown() != null && player.getCooldown().isAfter(now)) {
            long secondsLeft = Duration.between(now, player.getCooldown()).toSeconds();
            throw new IllegalStateException("Cooldown is active. Wait " + secondsLeft + "s.");
        }

        int currentX = player.getPositionX();
        int currentY = player.getPositionY();
        int targetX = request.getTargetX();
        int targetY = request.getTargetY();

        int deltaX = Math.abs(targetX - currentX);
        int deltaY = Math.abs(targetY - currentY);

        boolean isAdjacent = (deltaY + deltaX == 1) || (deltaX == 1 && deltaY == 1);
        if (!isAdjacent) {
            throw new IllegalArgumentException("You can move only one coordinate at the same time");
        }

        player.setPositionX(targetX);
        player.setPositionY(targetY);
        Instant newCooldown = now.plusSeconds(3);
        player.setCooldown(newCooldown);
        playerRepository.save(player);

        List<PlayerEntity> playersOnSameTile = playerRepository.findByPositionXAndPositionY(targetX, targetY);

        List<PlayerInfo> playerInfos = playersOnSameTile.stream()
                .map(p -> PlayerInfo.builder()
                        .playerId(p.getId())
                        .username(p.getUsername()) // Since id is now the unique string identifier (GitHub/Guest ID)
                        .build())
                .toList();
                List<NpcInfoResponse> npcInfos = npcRepository.findByPositionXAndPositionY(targetX, targetY)
                    .stream()
                    .map(npc -> NpcInfoResponse.builder()
                        .id(npc.getId())
                        .code(npc.getCode())
                        .name(npc.getName())
                        .positionX(npc.getPositionX())
                        .positionY(npc.getPositionY())
                        .build())
                    .toList();

        return MoveResponse.builder()
                .positionX(targetX)
                .positionY(targetY)
                .cooldown(newCooldown)
                .playersOnTile(playerInfos)
                .npcs(npcInfos)
                .build();
    }
}
