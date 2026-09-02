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
    private static final int BOARD_SIZE = 10;
    private static final int MAX_SHOT_DISTANCE = 2;
    private static final int SHOT_DAMAGE = 25;

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
                .p2X(5)
                .p2Y(5)
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

        ensureInProgress(combat);
        ensureParticipant(combat, playerId);

        if (!combat.getCurrentTurnPlayerId().equals(playerId)) {
            throw new RuntimeException("Not your turn");
        }
        if (combat.getActionPoints() <= 0) {
            throw new RuntimeException("No action points left!");
        }
        if (Math.abs(dx) + Math.abs(dy) != 1) {
            throw new RuntimeException("You can move only one tile at a time");
        }

        int currentX = playerId.equals(combat.getPlayer1Id()) ? combat.getP1X() : combat.getP2X();
        int currentY = playerId.equals(combat.getPlayer1Id()) ? combat.getP1Y() : combat.getP2Y();
        int nextX = currentX + dx;
        int nextY = currentY + dy;
        if (nextX < 0 || nextX >= BOARD_SIZE || nextY < 0 || nextY >= BOARD_SIZE) {
            throw new RuntimeException("You cannot leave the combat board");
        }

        if (playerId.equals(combat.getPlayer1Id())) {
            combat.setP1X(nextX);
            combat.setP1Y(nextY);
        } else if (playerId.equals(combat.getPlayer2Id())) {
            combat.setP2X(nextX);
            combat.setP2Y(nextY);
        }

        combat.setActionPoints(combat.getActionPoints() - 1);
        return combatRepository.save(combat);
    }

    @Transactional
    public CombatSessionEntity endTurn(UUID combatId, String playerId) {
        CombatSessionEntity combat = getCombat(combatId);

        ensureInProgress(combat);
        ensureParticipant(combat, playerId);

        if (!combat.getCurrentTurnPlayerId().equals(playerId)) {
            throw new RuntimeException("Not your turn!");
        }

        String nextTurn = playerId.equals(combat.getPlayer1Id()) ? combat.getPlayer2Id() : combat.getPlayer1Id();
        combat.setCurrentTurnPlayerId(nextTurn);
        combat.setActionPoints(3);

        return combatRepository.save(combat);
    }

    @Transactional
    public CombatSessionEntity attack(UUID combatId, String playerId) {
        CombatSessionEntity combat = getCombat(combatId);
        ensureInProgress(combat);
        ensureParticipant(combat, playerId);

        if (!combat.getCurrentTurnPlayerId().equals(playerId)) {
            throw new RuntimeException("Not your turn");
        }
        if (combat.getActionPoints() <= 0) {
            throw new RuntimeException("No action points left!");
        }

        int attackerX = playerId.equals(combat.getPlayer1Id()) ? combat.getP1X() : combat.getP2X();
        int attackerY = playerId.equals(combat.getPlayer1Id()) ? combat.getP1Y() : combat.getP2Y();
        int targetX = playerId.equals(combat.getPlayer1Id()) ? combat.getP2X() : combat.getP1X();
        int targetY = playerId.equals(combat.getPlayer1Id()) ? combat.getP2Y() : combat.getP1Y();
        if (Math.max(Math.abs(attackerX - targetX), Math.abs(attackerY - targetY)) > MAX_SHOT_DISTANCE) {
            throw new RuntimeException("Target must be closer than 3 tiles");
        }

        if (playerId.equals(combat.getPlayer1Id())) {
            combat.setP2Health(Math.max(0, combat.getP2Health() - SHOT_DAMAGE));
        } else {
            combat.setP1Health(Math.max(0, combat.getP1Health() - SHOT_DAMAGE));
        }
        combat.setActionPoints(combat.getActionPoints() - 1);

        int targetHealth = playerId.equals(combat.getPlayer1Id()) ? combat.getP2Health() : combat.getP1Health();
        if (targetHealth == 0) {
            combat.setStatus("FINISHED");
            combat.setWinnerId(playerId);
        }
        return combatRepository.save(combat);
    }

    @Transactional
    public CombatSessionEntity finishCombat(UUID combatId, String playerId) {
        CombatSessionEntity combat = getCombat(combatId);
        ensureInProgress(combat);
        ensureParticipant(combat, playerId);
        String winnerId = playerId.equals(combat.getPlayer1Id()) ? combat.getPlayer2Id() : combat.getPlayer1Id();
        combat.setWinnerId(winnerId);
        combat.setStatus("FINISHED");
        return combatRepository.save(combat);
    }

    private void ensureInProgress(CombatSessionEntity combat) {
        if (!"IN_PROGRESS".equals(combat.getStatus())) {
            throw new RuntimeException("Combat is already finished");
        }
    }

    private void ensureParticipant(CombatSessionEntity combat, String playerId) {
        if (!playerId.equals(combat.getPlayer1Id()) && !playerId.equals(combat.getPlayer2Id())) {
            throw new RuntimeException("Player is not part of this combat");
        }
    }

    public CombatSessionEntity getActiveCombatForPlayer(String playerId) {
        return combatRepository.findActiveCombatForPlayer(playerId, "IN_PROGRESS")
                .orElse(null);
    }
}
