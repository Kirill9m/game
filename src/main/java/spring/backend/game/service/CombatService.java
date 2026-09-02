package spring.backend.game.service;

import java.util.UUID;
import java.util.ArrayList;
import java.util.ArrayDeque;
import java.util.Collections;
import java.util.HashSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import spring.backend.game.entity.CombatSessionEntity;
import spring.backend.game.dto.CombatPlanRequest;
import spring.backend.game.repository.CombatRepository;

@Service
@RequiredArgsConstructor
public class CombatService {
    private static final int BOARD_SIZE = 10;
    private static final int MAX_SHOT_DISTANCE = 3;
    private static final int SHOT_DAMAGE = 25;
    private static final String WOLF_ID = "bot_wolf";
    private static final int WOLF_SHOT_DISTANCE = 1;
    private static final int WOLF_SHOT_DAMAGE = 20;
    private static final int WOLF_HEALTH = 500;
    private static final int WOLF_ACTION_POINTS = 5;
    private static final String STANDING = "STANDING";
    private static final String CROUCHING = "CROUCHING";
    private static final String PRONE = "PRONE";
    private static final Set<String> WATER = Set.of("1:6", "2:6", "1:7", "2:7", "1:8", "2:8");
    private static final Set<String> WALLS = Set.of("3:3", "3:4", "3:5", "6:6", "7:6");

    private final CombatRepository combatRepository;

    @Transactional
    public CombatSessionEntity startCombat(String attackerId, String targetId) {
        CombatSessionEntity combat = CombatSessionEntity.builder()
                .player1Id(attackerId)
                .player2Id(targetId)
                .currentTurnPlayerId("")
                .actionPoints(3)
                .p1X(1)
                .p1Y(5)
                .p2X(8)
                .p2Y(5)
                .build();
        return combatRepository.save(combat);
    }

    @Transactional
    public CombatSessionEntity startBotCombat(String playerId) {
        CombatSessionEntity combat = CombatSessionEntity.builder()
                .player1Id(playerId)
                .player2Id(WOLF_ID)
                .currentTurnPlayerId(playerId)
                .actionPoints(WOLF_ACTION_POINTS)
                .p1X(1)
                .p1Y(5)
                .p2X(8)
                .p2Y(5)
                .p2Health(WOLF_HEALTH)
                .build();
        return combatRepository.save(combat);
    }

    public CombatSessionEntity getCombat(UUID combatId) {
        return combatRepository.findById(combatId)
                .orElseThrow(() -> new RuntimeException("Combat not found"));
    }

    @Transactional
    public CombatSessionEntity moveInCombat(UUID combatId, String playerId, int dx, int dy) {
        CombatSessionEntity combat = getCombatForUpdate(combatId);
        if (Math.abs(dx) + Math.abs(dy) != 1) {
            throw new RuntimeException("You can move only one tile at a time");
        }
        return appendAction(combat, playerId, "M:" + dx + ":" + dy);
    }

    @Transactional
    public CombatSessionEntity endTurn(UUID combatId, String playerId, CombatPlanRequest request) {
        CombatSessionEntity combat = getCombatForUpdate(combatId);
        ensureInProgress(combat);
        ensureParticipant(combat, playerId);
        String plan = encodePlan(request);
        validatePlan(combat, playerId, plan);
        if (playerId.equals(combat.getPlayer1Id())) {
            combat.setP1Plan(plan);
            combat.setP1Ready(true);
        } else {
            combat.setP2Plan(plan);
            combat.setP2Ready(true);
        }
        if (WOLF_ID.equals(combat.getPlayer2Id()) && playerId.equals(combat.getPlayer1Id())) {
            String wolfPlan = createWolfPlan(combat);
            combat.setP2Plan(wolfPlan);
            combat.setP2Ready(true);
        }
        if (combat.isP1Ready() && combat.isP2Ready()) {
            resolveRound(combat);
        }
        return combatRepository.save(combat);
    }

    private String createWolfPlan(CombatSessionEntity combat) {
        List<String> plan = new ArrayList<>();
        int wolfX = combat.getP2X();
        int wolfY = combat.getP2Y();
        List<int[]> path = findMovementPath(wolfX, wolfY, combat.getP1X(), combat.getP1Y(), BOARD_SIZE * BOARD_SIZE);
        int maxMoves = WOLF_ACTION_POINTS;
        if (path != null && path.size() > 1) {
            maxMoves = Math.min(WOLF_ACTION_POINTS, path.size() - 1);
            for (int index = 1; index < path.size() && plan.size() < maxMoves; index++) {
                int[] previous = path.get(index - 1);
                int[] current = path.get(index);
                plan.add("M:" + (current[0] - previous[0]) + ":" + (current[1] - previous[1]));
                wolfX = current[0];
                wolfY = current[1];
                int distance = Math.max(Math.abs(combat.getP1X() - wolfX), Math.abs(combat.getP1Y() - wolfY));
                if (distance <= WOLF_SHOT_DISTANCE && plan.size() < WOLF_ACTION_POINTS
                        && !isShotBlocked(wolfX, wolfY, combat.getP1X(), combat.getP1Y())) {
                    plan.add("A:" + combat.getP1X() + ":" + combat.getP1Y());
                    break;
                }
            }
        }
        if (plan.isEmpty()) {
            plan.add("A:" + combat.getP1X() + ":" + combat.getP1Y());
        }
        return String.join(";", plan);
    }

    @Transactional
    public CombatSessionEntity attack(UUID combatId, String playerId) {
        CombatSessionEntity combat = getCombatForUpdate(combatId);
        int targetX = playerId.equals(combat.getPlayer1Id()) ? combat.getP2X() : combat.getP1X();
        int targetY = playerId.equals(combat.getPlayer1Id()) ? combat.getP2Y() : combat.getP1Y();
        return appendAction(combat, playerId, "A:" + targetX + ":" + targetY);
    }

    @Transactional
    public CombatSessionEntity finishCombat(UUID combatId, String playerId) {
        CombatSessionEntity combat = getCombatForUpdate(combatId);
        ensureInProgress(combat);
        ensureParticipant(combat, playerId);
        String winnerId = playerId.equals(combat.getPlayer1Id()) ? combat.getPlayer2Id() : combat.getPlayer1Id();
        combat.setWinnerId(winnerId);
        combat.setStatus("FINISHED");
        return combatRepository.save(combat);
    }

    private CombatSessionEntity appendAction(CombatSessionEntity combat, String playerId, String action) {
        ensureInProgress(combat);
        ensureParticipant(combat, playerId);
        String plan = playerId.equals(combat.getPlayer1Id()) ? combat.getP1Plan() : combat.getP2Plan();
        if (countActions(plan) >= combat.getActionPoints()) {
            throw new RuntimeException("No action points left!");
        }
        String updatedPlan = plan == null || plan.isBlank() ? action : plan + ";" + action;
        validatePlan(combat, playerId, updatedPlan);
        if (playerId.equals(combat.getPlayer1Id())) {
            combat.setP1Plan(updatedPlan);
        } else {
            combat.setP2Plan(updatedPlan);
        }
        return combatRepository.save(combat);
    }

    private CombatSessionEntity getCombatForUpdate(UUID combatId) {
        return combatRepository.findByIdForUpdate(combatId)
                .orElseThrow(() -> new RuntimeException("Combat not found"));
    }

    private String encodePlan(CombatPlanRequest request) {
        if (request == null) {
            return "";
        }
        return request.actions().stream().map(action -> {
            if ("MOVE".equalsIgnoreCase(action.type())) {
                return "M:" + required(action.dx(), "dx") + ":" + required(action.dy(), "dy");
            }
            if ("ATTACK".equalsIgnoreCase(action.type())) {
                return "A:" + required(action.targetX(), "targetX") + ":" + required(action.targetY(), "targetY");
            }
            if ("POSTURE".equalsIgnoreCase(action.type())) {
                return "P:" + normalizePosture(action.posture());
            }
            throw new RuntimeException("Unknown combat action: " + action.type());
        }).reduce((left, right) -> left + ";" + right).orElse("");
    }

    private int required(Integer value, String name) {
        if (value == null) {
            throw new RuntimeException("Missing action field: " + name);
        }
        return value;
    }

    private void validatePlan(CombatSessionEntity combat, String playerId, String plan) {
        int x = playerId.equals(combat.getPlayer1Id()) ? combat.getP1X() : combat.getP2X();
        int y = playerId.equals(combat.getPlayer1Id()) ? combat.getP1Y() : combat.getP2Y();
        String posture = playerId.equals(combat.getPlayer1Id()) ? combat.getP1Posture() : combat.getP2Posture();
        String[] actions = plan == null || plan.isBlank() ? new String[0] : plan.split(";");
        if (actions.length > combat.getActionPoints()) {
            throw new RuntimeException("A plan cannot use more than " + combat.getActionPoints() + " action points");
        }
        for (String action : actions) {
            String[] parts = action.split(":");
            if ("P".equals(parts[0])) {
                posture = normalizePosture(parts[1]);
            } else if ("M".equals(parts[0])) {
                int dx = Integer.parseInt(parts[1]);
                int dy = Integer.parseInt(parts[2]);
                int distance = Math.abs(dx) + Math.abs(dy);
                if (distance < 1 || distance > movementRange(posture)) {
                    throw new RuntimeException("This posture allows moving up to " + movementRange(posture) + " cells per action");
                }
                x += dx;
                y += dy;
                if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
                    throw new RuntimeException("You cannot leave the combat board");
                }
                validateMovementPath(x - dx, y - dy, x, y, movementRange(posture));
            } else if (!"A".equals(parts[0]) || parts.length != 3) {
                throw new RuntimeException("Invalid combat plan");
            }
        }
    }

    private int countActions(String plan) {
        return plan == null || plan.isBlank() ? 0 : plan.split(";").length;
    }

    private void resolveRound(CombatSessionEntity combat) {
        String[] p1Actions = actions(combat.getP1Plan());
        String[] p2Actions = actions(combat.getP2Plan());
        List<String> roundActions = new ArrayList<>();
        for (int index = 0; index < Math.max(p1Actions.length, p2Actions.length); index++) {
            String p1Action = actionAt(p1Actions, index);
            String p2Action = actionAt(p2Actions, index);
            if (p1Action != null && isAlive(combat, true)) {
                int damage = applyAction(combat, true, p1Action);
                addReplayActions(roundActions, combat, true, p1Action, damage);
            }
            if (p2Action != null && isAlive(combat, false)) {
                int damage = applyAction(combat, false, p2Action);
                addReplayActions(roundActions, combat, false, p2Action, damage);
            }
        }
        combat.setLastRoundActions(roundActions.toArray(String[]::new));
        if (combat.getP1Health() == 0 || combat.getP2Health() == 0) {
            combat.setStatus("FINISHED");
            combat.setWinnerId(combat.getP1Health() == 0 && combat.getP2Health() == 0 ? null
                    : combat.getP1Health() == 0 ? combat.getPlayer2Id() : combat.getPlayer1Id());
        }
        combat.setP1Plan(null);
        combat.setP2Plan(null);
        combat.setP1Ready(false);
        combat.setP2Ready(false);
        combat.setActionPoints(WOLF_ID.equals(combat.getPlayer2Id()) ? WOLF_ACTION_POINTS : 3);
    }

    private String[] actions(String plan) {
        return plan == null || plan.isBlank() ? new String[0] : plan.split(";");
    }

    private String actionAt(String[] actions, int index) {
        return index < actions.length ? actions[index] : null;
    }

    private String replayAction(CombatSessionEntity combat, boolean player1, String action, int damage) {
        if (!action.startsWith("A:")) return (player1 ? "P1:" : "P2:") + action + ":" + damage;
        int targetX = player1 ? combat.getP2X() : combat.getP1X();
        int targetY = player1 ? combat.getP2Y() : combat.getP1Y();
        return (player1 ? "P1:A:" : "P2:A:") + targetX + ":" + targetY + ":" + damage;
    }

    private void addReplayActions(List<String> replay, CombatSessionEntity combat, boolean player1, String action, int damage) {
        if (!action.startsWith("M:")) {
            replay.add(replayAction(combat, player1, action, damage));
            return;
        }
        String[] parts = action.split(":");
        int dx = Integer.parseInt(parts[1]);
        int dy = Integer.parseInt(parts[2]);
        int endX = player1 ? combat.getP1X() : combat.getP2X();
        int endY = player1 ? combat.getP1Y() : combat.getP2Y();
        List<int[]> path = findMovementPath(endX - dx, endY - dy, endX, endY, BOARD_SIZE * BOARD_SIZE);
        if (path == null) return;
        for (int index = 1; index < path.size(); index++) {
            int[] previous = path.get(index - 1);
            int[] current = path.get(index);
            replay.add((player1 ? "P1:M:" : "P2:M:") + (current[0] - previous[0]) + ":" + (current[1] - previous[1]) + ":0");
        }
    }

    private boolean isAlive(CombatSessionEntity combat, boolean player1) {
        return player1 ? combat.getP1Health() > 0 : combat.getP2Health() > 0;
    }

    private int applyAction(CombatSessionEntity combat, boolean player1, String action) {
        if (action == null) return 0;
        if (action.startsWith("P:")) {
            String posture = normalizePosture(action.substring(2));
            if (player1) combat.setP1Posture(posture);
            else combat.setP2Posture(posture);
            return 0;
        }
        if (action.startsWith("M:")) {
            applyMovement(combat, player1, action);
            return 0;
        }
        return action.startsWith("A:") ? applyAttack(combat, player1, action) : 0;
    }

    private void applyMovement(CombatSessionEntity combat, boolean player1, String action) {
        if (action == null || !action.startsWith("M:")) return;
        String[] parts = action.split(":");
        if (player1) {
            combat.setP1X(combat.getP1X() + Integer.parseInt(parts[1]));
            combat.setP1Y(combat.getP1Y() + Integer.parseInt(parts[2]));
        } else {
            combat.setP2X(combat.getP2X() + Integer.parseInt(parts[1]));
            combat.setP2Y(combat.getP2Y() + Integer.parseInt(parts[2]));
        }
    }

    private int applyAttack(CombatSessionEntity combat, boolean player1, String action) {
        if (action == null || !action.startsWith("A:")) return 0;
        int attackerX = player1 ? combat.getP1X() : combat.getP2X();
        int attackerY = player1 ? combat.getP1Y() : combat.getP2Y();
        int actualTargetX = player1 ? combat.getP2X() : combat.getP1X();
        int actualTargetY = player1 ? combat.getP2Y() : combat.getP1Y();
        int maxShotDistance = !player1 && WOLF_ID.equals(combat.getPlayer2Id())
            ? WOLF_SHOT_DISTANCE
            : MAX_SHOT_DISTANCE;
        int shotDamage = !player1 && WOLF_ID.equals(combat.getPlayer2Id())
            ? WOLF_SHOT_DAMAGE
            : SHOT_DAMAGE;
        if (Math.max(Math.abs(attackerX - actualTargetX), Math.abs(attackerY - actualTargetY)) > maxShotDistance
            || isShotBlocked(attackerX, attackerY, actualTargetX, actualTargetY)) return 0;
        String targetPosture = player1 ? combat.getP2Posture() : combat.getP1Posture();
        if (ThreadLocalRandom.current().nextInt(100) >= hitChance(targetPosture)) return 0;
        if (player1) combat.setP2Health(Math.max(0, combat.getP2Health() - shotDamage));
        else combat.setP1Health(Math.max(0, combat.getP1Health() - shotDamage));
        return shotDamage;
    }

    private int movementRange(String posture) {
        return STANDING.equals(posture) ? 3 : CROUCHING.equals(posture) ? 2 : 1;
    }

    private void validateMovementPath(int startX, int startY, int targetX, int targetY, int maxSteps) {
        if (findMovementPath(startX, startY, targetX, targetY, maxSteps) == null) {
            throw new RuntimeException("This cell is blocked by terrain");
        }
    }

    private List<int[]> findMovementPath(int startX, int startY, int targetX, int targetY, int maxSteps) {
        ArrayDeque<int[]> queue = new ArrayDeque<>();
        ArrayDeque<Integer> distances = new ArrayDeque<>();
        Set<String> visited = new HashSet<>();
        Map<String, String> parents = new HashMap<>();
        queue.add(new int[] { startX, startY });
        distances.add(0);
        visited.add(cell(startX, startY));
        while (!queue.isEmpty()) {
            int[] current = queue.remove();
            int distance = distances.remove();
            if (current[0] == targetX && current[1] == targetY) {
                List<int[]> path = new ArrayList<>();
                String currentCell = cell(targetX, targetY);
                while (currentCell != null) {
                    String[] coordinates = currentCell.split(":");
                    path.add(new int[] { Integer.parseInt(coordinates[0]), Integer.parseInt(coordinates[1]) });
                    currentCell = parents.get(currentCell);
                }
                Collections.reverse(path);
                return path;
            }
            if (distance >= maxSteps) continue;
            for (int[] direction : new int[][] { { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 } }) {
                int nextX = current[0] + direction[0];
                int nextY = current[1] + direction[1];
                String nextCell = cell(nextX, nextY);
                if (nextX < 0 || nextX >= BOARD_SIZE || nextY < 0 || nextY >= BOARD_SIZE
                        || visited.contains(nextCell) || isObstacle(nextX, nextY)) continue;
                visited.add(nextCell);
                parents.put(nextCell, cell(current[0], current[1]));
                queue.add(new int[] { nextX, nextY });
                distances.add(distance + 1);
            }
        }
        return null;
    }

    private int hitChance(String posture) {
        return STANDING.equals(posture) ? 100 : CROUCHING.equals(posture) ? 75 : 50;
    }

    private String normalizePosture(String posture) {
        if (posture == null) throw new RuntimeException("Missing posture");
        String normalized = posture.toUpperCase();
        if (!STANDING.equals(normalized) && !CROUCHING.equals(normalized) && !PRONE.equals(normalized)) {
            throw new RuntimeException("Unknown posture");
        }
        return normalized;
    }

    private boolean isObstacle(int x, int y) {
        return WATER.contains(cell(x, y)) || WALLS.contains(cell(x, y));
    }

    private boolean isShotBlocked(int fromX, int fromY, int toX, int toY) {
        int steps = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));
        for (int step = 1; step < steps; step++) {
            int x = fromX + Math.round((toX - fromX) * step / (float) steps);
            int y = fromY + Math.round((toY - fromY) * step / (float) steps);
            if (WALLS.contains(cell(x, y))) return true;
        }
        return false;
    }

    private String cell(int x, int y) {
        return x + ":" + y;
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
        return combatRepository.findActiveCombatsForPlayer(playerId, "IN_PROGRESS")
            .stream()
            .findFirst()
            .orElse(null);
    }
}
