package spring.backend.game.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import spring.backend.game.entity.CombatSessionEntity;
import spring.backend.game.repository.CombatRepository;

@Service
@RequiredArgsConstructor
public class CombatService {
    private final CombatRepository combatRepository;

    @Transactional
    public CombatSessionEntity startCombat(String attackerId, String targetId) {
        CombatSessionEntity combat = CombatSessionEntity.builder()
                .player1Id(attackerId)
                .player2Id(targetId)
                .currentTurnPlayerId(attackerId)
                .actionPoints(3)
                .p1X(0)
                .p1Y(0)
                .p2X(0)
                .p2Y(0)
                .build();
        return combatRepository.save(combat);
    }

    public CombatSessionEntity getCombat(UUID combatId) {
        return combatRepository.findById(combatId)
                .orElseThrow(() -> new RuntimeException("Combat not found"));
    }

    @Transactional
    public CombatSessionEntity moveInCombat(UUID combatId, String playerId, int dx, int dy) {
        CombatSessionEntity combat = getCombat(combatId);

        if (!combat.getCurrentTurnPlayerId().equals(playerId)) {
            throw new RuntimeException("Not your turn");
        }
        if (combat.getActionPoints() <= 0) {
            throw new RuntimeException("No action points left!");
        }
        if (playerId.equals(combat.getPlayer1Id())) {
            combat.setP1X(combat.getP1X() + dx);
            combat.setP1Y(combat.getP1Y() + dy);
        } else if (playerId.equals(combat.getPlayer2Id())) {
            combat.setP2X(combat.getP2X() + dx);
            combat.setP2Y(combat.getP2Y() + dy);
        } else {
            throw new RuntimeException("Player is not part of this combat");
        }

        combat.setActionPoints(combat.getActionPoints() - 1);
        return combatRepository.save(combat);
    }

    @Transactional
    public CombatSessionEntity endTurn(UUID combatId, String playerId) {
        CombatSessionEntity combat = getCombat(combatId);

        if (!combat.getCurrentTurnPlayerId().equals(playerId)) {
            throw new RuntimeException("Not your turn!");
        }

        String nextTurn = playerId.equals(combat.getPlayer1Id()) ? combat.getPlayer2Id() : combat.getPlayer1Id();
        combat.setCurrentTurnPlayerId(nextTurn);
        combat.setActionPoints(3);

        return combatRepository.save(combat);
    }

    public CombatSessionEntity getActiveCombatForPlayer(String playerId) {
        return combatRepository.findActiveCombatForPlayer(playerId, "IN_PROGRESS")
                .orElse(null);
    }
}
