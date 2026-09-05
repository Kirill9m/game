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
import java.time.Instant;

import org.springframework.stereotype.Service;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import spring.backend.game.entity.CombatLoot;
import spring.backend.game.entity.CombatObstacle;
import spring.backend.game.entity.CombatSessionEntity;
import spring.backend.game.entity.EnemyLootDrop;
import spring.backend.game.entity.EnemyTypeEntity;
import spring.backend.game.entity.ItemEntity;
import spring.backend.game.entity.ObstacleTypeEntity;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.entity.PlayerInventoryEntity;
import spring.backend.game.entity.PlayerWeaponProficiencyEntity;
import spring.backend.game.entity.WeaponTypeEntity;
import spring.backend.game.dto.CombatPlanRequest;
import spring.backend.game.repository.CombatRepository;
import spring.backend.game.repository.EnemyTypeRepository;
import spring.backend.game.repository.ItemRepository;
import spring.backend.game.repository.PlayerInventoryRepository;
import spring.backend.game.repository.PlayerRepository;
import spring.backend.game.repository.WeaponProficiencyRepository;
import spring.backend.game.repository.WeaponTypeRepository;

@Service
@RequiredArgsConstructor
public class CombatService {
    private static final int BOARD_SIZE = 10;
    private static final int MAX_SHOT_DISTANCE = 3;
    private static final int SHOT_DAMAGE = 25;
    private static final int MAX_HEALTH = 100;
    private static final String DEFAULT_ENEMY_CODE = "WOLF";
    private static final String STANDING = "STANDING";
    private static final String CROUCHING = "CROUCHING";
    private static final String PRONE = "PRONE";
    private static final List<Cell> DIRECTIONS = List.of(
            new Cell(1, 0), new Cell(-1, 0), new Cell(0, 1), new Cell(0, -1));

    private final CombatRepository combatRepository;
    private final EnemyTypeRepository enemyTypeRepository;
    private final ItemRepository itemRepository;
    private final PlayerInventoryRepository playerInventoryRepository;
    private final PlayerRepository playerRepository;
    private final WeaponTypeRepository weaponTypeRepository;
    private final WeaponProficiencyRepository weaponProficiencyRepository;
    private final WorldCellService worldCellService;
    private final WorldZoneService worldZoneService;
    private final LootService lootService;

    @Transactional
    public CombatSessionEntity startCombat(String attackerId, String targetId) {
        var attacker = playerRepository.findById(attackerId)
                .orElseThrow(() -> new EntityNotFoundException("Attacking player not found"));
        var target = playerRepository.findById(targetId)
                .orElseThrow(() -> new EntityNotFoundException("Target player not found"));

        // Check safe zone
        if (worldZoneService.isInsideSafeZone(attacker.getPositionX(), attacker.getPositionY())
            || worldZoneService.isInsideSafeZone(target.getPositionX(), target.getPositionY())) {
            throw new IllegalStateException("PvP attacks are disabled inside the safe zone");
        }

        // Check that both players are in the same location context (both outside or both inside the same building)
        UUID attackerLoc = attacker.getCurrentLocationId();
        UUID targetLoc = target.getCurrentLocationId();
        if (attackerLoc != targetLoc && (attackerLoc == null || !attackerLoc.equals(targetLoc))) {
            throw new IllegalStateException("Target is in another location — you cannot attack them");
        }

        // Check that the target is online (lastSeen within the last 90 seconds)
        if (target.getLastSeen() == null
                || target.getLastSeen().isBefore(Instant.now().minusSeconds(90))) {
            throw new IllegalStateException("Target player is offline — you cannot attack them");
        }

        // Check that both players are on the same tile

        CombatSessionEntity combat = CombatSessionEntity.builder()
                .player1Id(attackerId)
                .player2Id(targetId)
                .p1EquippedItemCode(equippedWeaponCode(attackerId))
                .p2EquippedItemCode(equippedWeaponCode(targetId))
                .currentTurnPlayerId("")
                .actionPoints(3)
                .p1X(1)
                .p1Y(5)
                .p2X(8)
                .p2Y(5)
                .p1Health(attacker.getHealth())
                .p2Health(target.getHealth())
                .build();
        combat.setObstacles(generateObstacles(attacker.getPositionX(), attacker.getPositionY()));
        return combatRepository.save(combat);
    }

    @Transactional
    public CombatSessionEntity startBotCombat(String playerId) {
        return startBotCombat(playerId, DEFAULT_ENEMY_CODE);
    }

    @Transactional
    public CombatSessionEntity startBotCombat(String playerId, String enemyCode) {
        EnemyTypeEntity enemy = enemyTypeRepository.findByCodeIgnoreCase(enemyCode)
                .orElseThrow(() -> new EntityNotFoundException("Enemy type not found: " + enemyCode));
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + playerId));
        CombatSessionEntity combat = CombatSessionEntity.builder()
                .player1Id(playerId)
                .player2Id("bot_" + enemy.getCode().toLowerCase())
                .p1EquippedItemCode(equippedWeaponCode(playerId))
                .enemyType(enemy)
                .currentTurnPlayerId(playerId)
                .actionPoints(enemy.getActionPoints())
                .p1X(1)
                .p1Y(5)
                .p2X(8)
                .p2Y(5)
                .p1Health(player.getHealth())
                .p2Health(enemy.getMaxHealth())
                .build();
        combat.setObstacles(generateObstacles(player.getPositionX(), player.getPositionY()));
        return combatRepository.save(combat);
    }

    public CombatSessionEntity getCombat(UUID combatId) {
        return combatRepository.findById(combatId)
                .orElseThrow(() -> new EntityNotFoundException("Combat not found"));
    }

    public List<EnemyTypeEntity> getEnemyTypes() {
        return enemyTypeRepository.findAllByOrderByNameAsc();
    }

    @Transactional
    public CombatSessionEntity moveInCombat(UUID combatId, String playerId, int dx, int dy) {
        CombatSessionEntity combat = getCombatForUpdate(combatId);
        if (Math.abs(dx) + Math.abs(dy) != 1) {
            throw new IllegalArgumentException("You can move only one tile at a time");
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
        if (isBotCombat(combat) && playerId.equals(combat.getPlayer1Id())) {
            if (isAlive(combat, false)) {
                combat.setP2Plan(createBotPlan(combat));
            } else {
                // The bot is dead — it just idles while the player collects loot.
                combat.setP2Plan(null);
            }
            combat.setP2Ready(true);
        }
        if (combat.isP1Ready() && combat.isP2Ready()) {
            resolveRound(combat);
        }
        return combatRepository.save(combat);
    }

    private String createBotPlan(CombatSessionEntity combat) {
        EnemyTypeEntity enemy = combat.getEnemyType();
        if (enemy == null || !isAlive(combat, false)) {
            return "";
        }
        List<String> plan = new ArrayList<>();
        int botX = combat.getP2X();
        int botY = combat.getP2Y();
        int playerX = combat.getP1X();
        int playerY = combat.getP1Y();
        int maxMoves = Math.min(enemy.getMovementRange(), enemy.getActionPoints());

        // Already in range — attack right away instead of spending points on movement.
        int initialDistance = Math.max(Math.abs(playerX - botX), Math.abs(playerY - botY));
        if (initialDistance <= enemy.getAttackRange() && enemy.getActionPoints() > 0) {
            plan.add("A:" + playerX + ":" + playerY);
            return String.join(";", plan);
        }

        // First try to reach the player. If we cannot reach him this turn,
        // walk towards the closest reachable cell — the bot must move every round.
        Cell playerCell = new Cell(playerX, playerY);
        List<Cell> path = findMovementPath(combat, botX, botY, playerX, playerY, maxMoves);
        // Bot should not move onto the player's cell
        if (path != null && path.size() > 1 && path.get(path.size() - 1).equals(playerCell)) {
            path = path.subList(0, path.size() - 1);
        }
        if (path == null || path.size() <= 1) {
            path = findClosestApproachPath(combat, botX, botY, playerX, playerY, maxMoves);
            // Also prevent closest approach from landing on the player's cell
            if (path != null && path.size() > 1 && path.get(path.size() - 1).equals(playerCell)) {
                path = path.subList(0, path.size() - 1);
            }
        }
        if (path == null || path.size() <= 1) {
            // Cannot approach nor attack — just skip the turn.
            return "";
        }
        int steps = Math.min(maxMoves, path.size() - 1);
        for (int index = 1; index <= steps && plan.size() < maxMoves; index++) {
            Cell previous = path.get(index - 1);
            Cell current = path.get(index);
            plan.add("M:" + (current.x() - previous.x()) + ":" + (current.y() - previous.y()));
            botX = current.x();
            botY = current.y();
            int distance = Math.max(Math.abs(playerX - botX), Math.abs(playerY - botY));
            // Attack only when in range and with enough action points left.
            if (distance <= enemy.getAttackRange() && plan.size() < enemy.getActionPoints()) {
                plan.add("A:" + playerX + ":" + playerY);
                break;
            }
        }
        return String.join(";", plan);
    }

    /**
     * BFS walk like {@link #findMovementPath}, but without requiring a full path
     * to the target cell: returns the path to the reachable cell that is closest
     * to the target (Chebyshev distance). Used so the bot keeps approaching the
     * player even when it cannot reach him within the current turn.
     */
    private List<Cell> findClosestApproachPath(CombatSessionEntity combat, int startX, int startY, int targetX, int targetY, int maxSteps) {
        ArrayDeque<Cell> queue = new ArrayDeque<>();
        ArrayDeque<Integer> distances = new ArrayDeque<>();
        Set<Cell> visited = new HashSet<>();
        Map<Cell, Cell> parents = new HashMap<>();
        Cell start = new Cell(startX, startY);
        queue.add(start);
        distances.add(0);
        visited.add(start);
        Cell best = start;
        int bestDistance = Math.max(Math.abs(targetX - startX), Math.abs(targetY - startY));
        while (!queue.isEmpty()) {
            Cell current = queue.remove();
            int distance = distances.remove();
            int currentDistance = Math.max(Math.abs(targetX - current.x()), Math.abs(targetY - current.y()));
            if (currentDistance < bestDistance) {
                bestDistance = currentDistance;
                best = current;
                if (bestDistance == 0) break;
            }
            if (distance >= maxSteps) continue;
            for (Cell direction : DIRECTIONS) {
                Cell next = new Cell(current.x() + direction.x(), current.y() + direction.y());
                if (next.x() < 0 || next.x() >= BOARD_SIZE || next.y() < 0 || next.y() >= BOARD_SIZE
                        || visited.contains(next) || isObstacle(combat, next.x(), next.y())) continue;
                visited.add(next);
                parents.put(next, current);
                queue.add(next);
                distances.add(distance + 1);
            }
        }
        if (best.equals(start)) {
            return null;
        }
        List<Cell> path = new ArrayList<>();
        Cell currentCell = best;
        while (currentCell != null) {
            path.add(currentCell);
            currentCell = parents.get(currentCell);
        }
        Collections.reverse(path);
        return path;
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
        persistCombatHealth(combat);
        // Surrender counts as a defeat: marked field loot is lost to a bot or
        // dropped as world loot when the opponent is another player.
        if (isBotCombat(combat)) {
            lootService.discardMarkedItems(playerId);
        } else {
            lootService.dropMarkedItemsAsWorldLoot(playerId);
        }
        return combatRepository.save(combat);
    }

    private CombatSessionEntity appendAction(CombatSessionEntity combat, String playerId, String action) {
        ensureInProgress(combat);
        ensureParticipant(combat, playerId);
        String plan = playerId.equals(combat.getPlayer1Id()) ? combat.getP1Plan() : combat.getP2Plan();
        if (countActions(plan) >= combat.getActionPoints()) {
            throw new IllegalStateException("No action points left!");
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
                .orElseThrow(() -> new EntityNotFoundException("Combat not found"));
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
            if ("EQUIP".equalsIgnoreCase(action.type())) {
                return "E:" + requiredText(action.itemCode(), "itemCode");
            }
            if ("USE".equalsIgnoreCase(action.type())) {
                return "U:" + requiredText(action.itemCode(), "itemCode");
            }
            throw new IllegalArgumentException("Unknown combat action: " + action.type());
        }).reduce((left, right) -> left + ";" + right).orElse("");
    }

    private int required(Integer value, String name) {
        if (value == null) {
            throw new IllegalArgumentException("Missing action field: " + name);
        }
        return value;
    }

    private String requiredText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Missing action field: " + name);
        }
        return value.toUpperCase();
    }

    private void validatePlan(CombatSessionEntity combat, String playerId, String plan) {
        int x = playerId.equals(combat.getPlayer1Id()) ? combat.getP1X() : combat.getP2X();
        int y = playerId.equals(combat.getPlayer1Id()) ? combat.getP1Y() : combat.getP2Y();
        String posture = playerId.equals(combat.getPlayer1Id()) ? combat.getP1Posture() : combat.getP2Posture();
        String[] actions = plan == null || plan.isBlank() ? new String[0] : plan.split(";");
        if (actions.length > combat.getActionPoints()) {
            throw new IllegalArgumentException("A plan cannot use more than " + combat.getActionPoints() + " action points");
        }
        Map<String, Integer> useCounts = new HashMap<>();
        for (String action : actions) {
            String[] p = action.split(":");
            if ("U".equals(p[0]) && p.length == 2) {
                useCounts.merge(p[1].toUpperCase(), 1, Integer::sum);
            }
        }
        for (String action : actions) {
            String[] parts = action.split(":");
            if ("P".equals(parts[0])) {
                posture = normalizePosture(parts[1]);
            } else if ("E".equals(parts[0])) {
                if (parts.length != 2 || !player1HasItem(playerId, parts[1])) {
                    throw new IllegalArgumentException("You do not have this item");
                }
            } else if ("M".equals(parts[0])) {
                int dx = Integer.parseInt(parts[1]);
                int dy = Integer.parseInt(parts[2]);
                int distance = Math.abs(dx) + Math.abs(dy);
                if (distance < 1 || distance > movementRange(posture)) {
                    throw new IllegalArgumentException("This posture allows moving up to " + movementRange(posture) + " cells per action");
                }
                x += dx;
                y += dy;
                if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
                    throw new IllegalArgumentException("You cannot leave the combat board");
                }
                int opponentX = playerId.equals(combat.getPlayer1Id()) ? combat.getP2X() : combat.getP1X();
                int opponentY = playerId.equals(combat.getPlayer1Id()) ? combat.getP2Y() : combat.getP1Y();
                boolean opponentAlive = playerId.equals(combat.getPlayer1Id())
                        ? combat.getP2Health() > 0
                        : combat.getP1Health() > 0;
                // A dead opponent no longer blocks the cell: their body (and the
                // loot that dropped on it) can be walked onto to collect it.
                if (opponentAlive && x == opponentX && y == opponentY) {
                    throw new IllegalStateException("You cannot move to the opponent's cell");
                }
                validateMovementPath(combat, x - dx, y - dy, x, y, movementRange(posture));
            } else if ("A".equals(parts[0])) {
                if (parts.length != 3) {
                    throw new IllegalArgumentException("Invalid combat plan");
                }
                boolean targetDead = playerId.equals(combat.getPlayer1Id())
                        ? combat.getP2Health() <= 0
                        : combat.getP1Health() <= 0;
                if (targetDead) {
                    throw new IllegalStateException("The target is already dead");
                }
            } else if ("U".equals(parts[0])) {
                if (parts.length != 2) {
                    throw new IllegalArgumentException("Invalid combat plan");
                }
                String itemCode = parts[1].toUpperCase();
                ItemEntity item = itemRepository.findByCodeIgnoreCase(itemCode).orElse(null);
                if (item == null || !"CONSUMABLE".equalsIgnoreCase(item.getType()) || item.getHeal() <= 0) {
                    throw new IllegalArgumentException("This item cannot be used in combat");
                }
                int plannedUses = useCounts.getOrDefault(itemCode, 0);
                if (inventoryQuantity(playerId, itemCode) < plannedUses) {
                    throw new IllegalArgumentException("You do not have enough " + itemCode);
                }
            } else {
                throw new IllegalArgumentException("Invalid combat plan");
            }
        }
    }

    private int countActions(String plan) {
        return plan == null || plan.isBlank() ? 0 : plan.split(";").length;
    }

    private void resolveRound(CombatSessionEntity combat) {
        boolean p1WasAlive = combat.getP1Health() > 0;
        boolean p2WasAlive = combat.getP2Health() > 0;
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
        // Loot drops exactly once — in the round a fighter died. Without this
        // check every following round would roll the drop table again and
        // add fresh piles to the board (combat would never end).
        boolean someoneFellThisRound = (p1WasAlive && combat.getP1Health() == 0)
                || (p2WasAlive && combat.getP2Health() == 0);
        if (someoneFellThisRound) {
            combat.setWinnerId(combat.getP1Health() == 0 && combat.getP2Health() == 0 ? null
                    : combat.getP1Health() == 0 ? combat.getPlayer2Id() : combat.getPlayer1Id());
            spawnDeathLoot(combat);
        }
        // The winner's loot stays on the board — they decide when and what to
        // take (POST /combat/{combatId}/pickup-loot).
        if (combat.getWinnerId() != null) {
            boolean winnerIsAlive = combat.getWinnerId().equals(combat.getPlayer1Id())
                    ? isAlive(combat, true)
                    : isAlive(combat, false);
            if (!winnerIsAlive || combat.getLoot().isEmpty()) {
                combat.setStatus("FINISHED");
                persistCombatHealth(combat);
            }
        } else if (combat.getP1Health() == 0 && combat.getP2Health() == 0) {
            combat.setStatus("FINISHED");
            persistCombatHealth(combat);
        }
        combat.setP1Plan(null);
        combat.setP2Plan(null);
        combat.setP1Ready(false);
        combat.setP2Ready(false);
        combat.setActionPoints(isBotCombat(combat) ? combat.getEnemyType().getActionPoints() : 3);
    }

    /**
     * Spawns the loot piles the moment a fighter dies:
     * <ul>
     *   <li>Bot combat: the enemy's configured drop table is rolled and dropped
     *       around the dead body (only the player can pick it up).</li>
     *   <li>PvP: the defeated player's whole field loot bag falls onto the board
     *       so the winner can collect it while the combat stays open.</li>
     * </ul>
     */
    private void spawnDeathLoot(CombatSessionEntity combat) {
        if (combat.getWinnerId() == null) {
            return;
        }
        if (isBotCombat(combat)) {
            if (combat.getWinnerId().equals(combat.getPlayer1Id())) {
                spawnEnemyLoot(combat);
            } else {
                // The player lost to a bot — their marked field loot is lost.
                lootService.discardMarkedItems(combat.getPlayer1Id());
            }
            return;
        }
        String loserId = combat.getWinnerId().equals(combat.getPlayer1Id())
                ? combat.getPlayer2Id()
                : combat.getPlayer1Id();
        spawnBagLoot(combat, loserId);
    }

    /** Rolls the enemy's configured loot table and places the piles near its body. */
    private void spawnEnemyLoot(CombatSessionEntity combat) {
        EnemyTypeEntity enemy = combat.getEnemyType();
        if (enemy == null) {
            return;
        }
        List<EnemyLootDrop> drops = enemy.getLootDrops();
        if (drops.isEmpty()) {
            return;
        }
        List<CombatLoot> loot = new ArrayList<>(combat.getLoot());
        // The first pile lands on the corpse's own cell — if the winner finished
        // the enemy up close (or walked over in the same round) they are already
        // standing on the loot and collect it without extra moves. The rest scatter around.
        boolean firstPile = true;
        for (EnemyLootDrop drop : drops) {
            if (drop == null || drop.itemCode() == null
                    || ThreadLocalRandom.current().nextInt(100) >= drop.chance()) {
                continue;
            }
            int min = Math.max(1, drop.minQuantity());
            int max = Math.max(min, drop.maxQuantity());
            int quantity = min + ThreadLocalRandom.current().nextInt(max - min + 1);
            ItemEntity item = itemRepository.findByCodeIgnoreCase(drop.itemCode()).orElse(null);
            if (item == null) {
                continue;
            }
            Cell cell = firstPile
                    ? new Cell(combat.getP2X(), combat.getP2Y())
                    : findEmptyCellNear(combat, combat.getP2X(), combat.getP2Y());
            firstPile = false;
            if (cell == null) {
                break;
            }
            loot.add(new CombatLoot(cell.x(), cell.y(), item.getCode(), item.getName(), quantity));
        }
        combat.setLoot(loot);
    }

    /** Drops the defeated player's marked field loot onto the board near their body. */
    private void spawnBagLoot(CombatSessionEntity combat, String loserId) {
        List<PlayerInventoryEntity> marked = lootService.takeMarkedItems(loserId);
        if (marked.isEmpty()) {
            return;
        }
        boolean loserIsPlayer1 = combat.getPlayer1Id().equals(loserId);
        int bodyX = loserIsPlayer1 ? combat.getP1X() : combat.getP2X();
        int bodyY = loserIsPlayer1 ? combat.getP1Y() : combat.getP2Y();
        List<CombatLoot> loot = new ArrayList<>(combat.getLoot());
        boolean firstPile = true;
        for (PlayerInventoryEntity entry : marked) {
            ItemEntity item = entry.getItem();
            Cell cell = firstPile
                    ? new Cell(bodyX, bodyY)
                    : findEmptyCellNear(combat, bodyX, bodyY);
            firstPile = false;
            if (cell == null) {
                break;
            }
            loot.add(new CombatLoot(cell.x(), cell.y(), item.getCode(), item.getName(), entry.getQuantity()));
        }
        combat.setLoot(loot);
    }

    /**
     * Manually takes the loot piles the player selected (by their zero-based
     * indexes inside the combat's {@code loot} array). The player must be
     * standing on the pile's cell or an adjacent cell. Items go to the field
     * loot bag outside the city or straight to the inventory inside the city.
     * When the winner has collected every pile, the combat is finished.
     */
    @Transactional
    public CombatSessionEntity pickupLoot(UUID combatId, String playerId, List<Integer> pileIndexes) {
        CombatSessionEntity combat = getCombatForUpdate(combatId);
        ensureInProgress(combat);
        ensureParticipant(combat, playerId);
        boolean player1 = playerId.equals(combat.getPlayer1Id());
        if (!isAlive(combat, player1)) {
            throw new IllegalStateException("You are down and cannot pick up loot");
        }
        int feetX = player1 ? combat.getP1X() : combat.getP2X();
        int feetY = player1 ? combat.getP1Y() : combat.getP2Y();
        List<CombatLoot> loot = new ArrayList<>(combat.getLoot());
        Set<Integer> selected = new HashSet<>();
        if (pileIndexes != null) {
            for (Integer index : pileIndexes) {
                if (index == null || index < 0 || index >= loot.size()) {
                    throw new IllegalArgumentException("One of the loot piles is no longer here — refresh the board");
                }
                CombatLoot pile = loot.get(index);
                int pileDistance = Math.max(Math.abs(pile.x() - feetX), Math.abs(pile.y() - feetY));
                if (pileDistance > 1) {
                    throw new IllegalStateException("You must stand next to a loot pile to take it");
                }
                selected.add(index);
            }
        }
        if (selected.isEmpty()) {
            throw new IllegalArgumentException("Select at least one loot pile to take");
        }
        List<CombatLoot> remaining = new ArrayList<>(Math.max(0, loot.size() - selected.size()));
        for (int index = 0; index < loot.size(); index++) {
            CombatLoot pile = loot.get(index);
            if (selected.contains(index)) {
                lootService.addLootByCode(playerId, pile.itemCode(), pile.quantity());
            } else {
                remaining.add(pile);
            }
        }
        combat.setLoot(remaining);
        if (combat.getWinnerId() != null) {
            boolean winnerIsAlive = combat.getWinnerId().equals(combat.getPlayer1Id())
                    ? isAlive(combat, true)
                    : isAlive(combat, false);
            if (!winnerIsAlive || combat.getLoot().isEmpty()) {
                combat.setStatus("FINISHED");
                persistCombatHealth(combat);
            }
        } else if (combat.getP1Health() == 0 && combat.getP2Health() == 0) {
            combat.setStatus("FINISHED");
            persistCombatHealth(combat);
        }
        return combatRepository.save(combat);
    }

    /** Nearest free board cell around {@code (centerX, centerY)} (radius outward). */
    private Cell findEmptyCellNear(CombatSessionEntity combat, int centerX, int centerY) {
        Set<Cell> occupied = new HashSet<>();
        occupied.add(new Cell(centerX, centerY));
        occupied.add(new Cell(combat.getP1X(), combat.getP1Y()));
        occupied.add(new Cell(combat.getP2X(), combat.getP2Y()));
        for (CombatObstacle obstacle : combat.getObstacles()) {
            if (obstacle.isAlive()) {
                occupied.add(new Cell(obstacle.x(), obstacle.y()));
            }
        }
        for (CombatLoot pile : combat.getLoot()) {
            occupied.add(new Cell(pile.x(), pile.y()));
        }
        for (int radius = 1; radius < BOARD_SIZE; radius++) {
            for (int deltaX = -radius; deltaX <= radius; deltaX++) {
                for (int deltaY = -radius; deltaY <= radius; deltaY++) {
                    if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) != radius) {
                        continue;
                    }
                    int x = centerX + deltaX;
                    int y = centerY + deltaY;
                    if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
                        continue;
                    }
                    Cell candidate = new Cell(x, y);
                    if (!occupied.contains(candidate)) {
                        return candidate;
                    }
                }
            }
        }
        return null;
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
        // The attacker's weapon range rides along so the client can scale the shot
        // tracer to exactly as many cells as the weapon's range.
        return (player1 ? "P1:A:" : "P2:A:") + targetX + ":" + targetY + ":" + damage + ":" + shotRange(combat, player1);
    }

    /** Range (in cells) of the attacker's weapon — mirrors the logic in {@link #applyAttack}. */
    private int shotRange(CombatSessionEntity combat, boolean player1) {
        EnemyTypeEntity enemy = !player1 ? combat.getEnemyType() : null;
        if (enemy != null) return enemy.getAttackRange();
        return getWeapon(combat, player1).getAttackRange();
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
        List<Cell> path = findMovementPath(combat, endX - dx, endY - dy, endX, endY, BOARD_SIZE * BOARD_SIZE);
        if (path == null) return;
        for (int index = 1; index < path.size(); index++) {
            Cell previous = path.get(index - 1);
            Cell current = path.get(index);
            replay.add((player1 ? "P1:M:" : "P2:M:") + (current.x() - previous.x()) + ":" + (current.y() - previous.y()) + ":0");
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
        if (action.startsWith("E:")) {
            String itemCode = action.substring(2).toUpperCase();
            if (player1) combat.setP1EquippedItemCode(itemCode);
            else combat.setP2EquippedItemCode(itemCode);
            return 0;
        }
        if (action.startsWith("U:")) {
            return applyHeal(combat, player1, action.substring(2).toUpperCase());
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
        int newX = (player1 ? combat.getP1X() : combat.getP2X()) + Integer.parseInt(parts[1]);
        int newY = (player1 ? combat.getP1Y() : combat.getP2Y()) + Integer.parseInt(parts[2]);
        // Cannot move onto the opponent's cell
        int opponentX = player1 ? combat.getP2X() : combat.getP1X();
        int opponentY = player1 ? combat.getP2Y() : combat.getP1Y();
        if (newX == opponentX && newY == opponentY) {
            return;
        }
        if (player1) {
            combat.setP1X(newX);
            combat.setP1Y(newY);
        } else {
            combat.setP2X(newX);
            combat.setP2Y(newY);
        }
    }

    private int applyAttack(CombatSessionEntity combat, boolean player1, String action) {
        if (action == null || !action.startsWith("A:")) return 0;
        int attackerX = player1 ? combat.getP1X() : combat.getP2X();
        int attackerY = player1 ? combat.getP1Y() : combat.getP2Y();
        int actualTargetX = player1 ? combat.getP2X() : combat.getP1X();
        int actualTargetY = player1 ? combat.getP2Y() : combat.getP1Y();
        EnemyTypeEntity enemy = !player1 ? combat.getEnemyType() : null;
        ItemEntity weapon = player1 || enemy == null ? getWeapon(combat, player1) : null;
        int maxShotDistance = enemy != null ? enemy.getAttackRange() : weapon.getAttackRange();
        int shotDamage = enemy != null ? enemy.getDamage() : weapon.getDamage();
        if (Math.max(Math.abs(attackerX - actualTargetX), Math.abs(attackerY - actualTargetY)) > maxShotDistance) return 0;
        String targetPosture = player1 ? combat.getP2Posture() : combat.getP1Posture();
        if (ThreadLocalRandom.current().nextInt(100) >= hitChance(combat, player1, weapon, targetPosture)) return 0;
        // Bullets are not blocked by obstacles — they pass through, but every
        // obstacle on the line of fire takes damage and may be destroyed.
        damageObstaclesAlongLine(combat, attackerX, attackerY, actualTargetX, actualTargetY, shotDamage);
        // The defender's equipped armor reduces incoming damage.
        String defenderId = player1 ? combat.getPlayer2Id() : combat.getPlayer1Id();
        int actualDamage = Math.max(0, shotDamage - armorDefense(defenderId));
        if (player1) combat.setP2Health(Math.max(0, combat.getP2Health() - actualDamage));
        else combat.setP1Health(Math.max(0, combat.getP1Health() - actualDamage));
        return actualDamage;
    }

    /**
     * Sums the defense of every equipped armor piece of the given player.
     * Bots (whose ids start with {@code bot_}) have no inventory and always
     * return {@code 0}.
     */
    private int armorDefense(String playerId) {
        if (playerId == null || playerId.startsWith("bot_")) {
            return 0;
        }
        return playerInventoryRepository.findByPlayerIdOrderByItemNameAsc(playerId).stream()
                .filter(entry -> entry.isEquipped() && "ARMOR".equalsIgnoreCase(entry.getItem().getType()))
                .mapToInt(entry -> entry.getItem().getDefense())
                .sum();
    }

    private int movementRange(String posture) {
        return STANDING.equals(posture) ? 3 : CROUCHING.equals(posture) ? 2 : 1;
    }

    private void validateMovementPath(CombatSessionEntity combat, int startX, int startY, int targetX, int targetY, int maxSteps) {
        if (findMovementPath(combat, startX, startY, targetX, targetY, maxSteps) == null) {
            throw new IllegalStateException("This cell is blocked by terrain");
        }
    }

    private List<Cell> findMovementPath(CombatSessionEntity combat, int startX, int startY, int targetX, int targetY, int maxSteps) {
        ArrayDeque<Cell> queue = new ArrayDeque<>();
        ArrayDeque<Integer> distances = new ArrayDeque<>();
        Set<Cell> visited = new HashSet<>();
        Map<Cell, Cell> parents = new HashMap<>();
        Cell start = new Cell(startX, startY);
        Cell target = new Cell(targetX, targetY);
        queue.add(start);
        distances.add(0);
        visited.add(start);
        while (!queue.isEmpty()) {
            Cell current = queue.remove();
            int distance = distances.remove();
            if (current.equals(target)) {
                List<Cell> path = new ArrayList<>();
                Cell step = target;
                while (step != null) {
                    path.add(step);
                    step = parents.get(step);
                }
                Collections.reverse(path);
                return path;
            }
            if (distance >= maxSteps) continue;
            for (Cell direction : DIRECTIONS) {
                Cell next = new Cell(current.x() + direction.x(), current.y() + direction.y());
                if (next.x() < 0 || next.x() >= BOARD_SIZE || next.y() < 0 || next.y() >= BOARD_SIZE
                        || visited.contains(next) || isObstacle(combat, next.x(), next.y())) continue;
                visited.add(next);
                parents.put(next, current);
                queue.add(next);
                distances.add(distance + 1);
            }
        }
        return null;
    }

    private int hitChance(CombatSessionEntity combat, boolean attackerIsPlayer1, ItemEntity weapon, String targetPosture) {
        int base = STANDING.equals(targetPosture) ? 100 : CROUCHING.equals(targetPosture) ? 75 : 50;
        // No weapon (e.g. an enemy's claw attack) → accuracy depends only on the target's posture.
        if (weapon == null) {
            return base;
        }
        String weaponTypeCode = weapon.getWeaponTypeCode();
        if (weaponTypeCode == null || weaponTypeCode.isBlank()) {
            return base;
        }
        String playerId = attackerIsPlayer1 ? combat.getPlayer1Id() : combat.getPlayer2Id();
        int level = weaponProficiencyRepository
                .findByPlayerIdAndWeaponTypeCodeIgnoreCase(playerId, weaponTypeCode)
                .map(PlayerWeaponProficiencyEntity::getLevel)
                .orElse(0);
        WeaponTypeEntity weaponType = weaponTypeRepository.findByCodeIgnoreCase(weaponTypeCode).orElse(null);
        if (weaponType == null) {
            return base;
        }
        int bonus = Math.min(weaponType.getMaxAccuracy(), level * weaponType.getAccuracyPerLevel());
        return Math.max(5, Math.min(100, base + bonus));
    }

    private String normalizePosture(String posture) {
        if (posture == null) throw new IllegalArgumentException("Missing posture");
        String normalized = posture.toUpperCase();
        if (!STANDING.equals(normalized) && !CROUCHING.equals(normalized) && !PRONE.equals(normalized)) {
            throw new IllegalArgumentException("Unknown posture");
        }
        return normalized;
    }

    private boolean isObstacle(CombatSessionEntity combat, int x, int y) {
        return combat.getObstacles().stream()
                .anyMatch(obstacle -> obstacle.isAlive() && obstacle.x() == x && obstacle.y() == y);
    }

    /** Damages every alive obstacle crossed by the shot and removes destroyed ones. */
    private void damageObstaclesAlongLine(CombatSessionEntity combat, int fromX, int fromY, int toX, int toY, int damage) {
        int steps = Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY));
        Set<Cell> hitCells = new HashSet<>();
        for (int step = 1; step < steps; step++) {
            int x = fromX + Math.round((toX - fromX) * step / (float) steps);
            int y = fromY + Math.round((toY - fromY) * step / (float) steps);
            hitCells.add(new Cell(x, y));
        }
        List<CombatObstacle> obstacles = new ArrayList<>(combat.getObstacles());
        boolean changed = false;
        for (int index = 0; index < obstacles.size(); index++) {
            CombatObstacle current = obstacles.get(index);
            if (!current.isAlive() || !hitCells.contains(new Cell(current.x(), current.y()))) continue;
            int remaining = Math.max(0, current.currentHealth() - damage);
            obstacles.set(index, new CombatObstacle(
                    current.x(), current.y(), current.code(), current.name(),
                    current.maxHealth(), remaining));
            changed = true;
        }
        if (changed) {
            combat.setObstacles(obstacles.stream().filter(CombatObstacle::isAlive).toList());
        }
    }

    /**
     * Randomly spawns obstacles for a new combat, using only the obstacle types
     * configured on the world cell the fight starts in. Nothing spawns on the
     * two fighters' starting cells.
     */
    private List<CombatObstacle> generateObstacles(int worldX, int worldY) {
        List<ObstacleTypeEntity> types = worldCellService.getSettings(worldX, worldY)
                .map(cell -> new ArrayList<>(cell.getObstacleTypes()))
                .orElseGet(ArrayList::new);
        if (types.isEmpty()) {
            return List.of();
        }
        int count = 4 + ThreadLocalRandom.current().nextInt(5); // 4..8 obstacles
        Set<Cell> occupied = new HashSet<>();
        occupied.add(new Cell(1, 5));
        occupied.add(new Cell(8, 5));
        List<CombatObstacle> result = new ArrayList<>();
        for (int attempt = 0; attempt < 200 && result.size() < count; attempt++) {
            int x = ThreadLocalRandom.current().nextInt(BOARD_SIZE);
            int y = ThreadLocalRandom.current().nextInt(BOARD_SIZE);
            if (!occupied.add(new Cell(x, y))) continue;
            ObstacleTypeEntity type = types.get(ThreadLocalRandom.current().nextInt(types.size()));
            result.add(new CombatObstacle(x, y, type.getCode(), type.getName(),
                    type.getMaxHealth(), type.getMaxHealth()));
        }
        return result;
    }

    /** A single cell on the combat board. */
    private record Cell(int x, int y) {
    }

    private void ensureInProgress(CombatSessionEntity combat) {
        if (!"IN_PROGRESS".equals(combat.getStatus())) {
            throw new IllegalStateException("Combat is already finished");
        }
    }

    private void ensureParticipant(CombatSessionEntity combat, String playerId) {
        if (!playerId.equals(combat.getPlayer1Id()) && !playerId.equals(combat.getPlayer2Id())) {
            throw new IllegalStateException("Player is not part of this combat");
        }
    }

    private boolean isBotCombat(CombatSessionEntity combat) {
        return combat.getEnemyType() != null;
    }

    private boolean player1HasItem(String playerId, String itemCode) {
        return playerInventoryRepository.existsByPlayerIdAndItemCodeIgnoreCase(playerId, itemCode);
    }

    /** Total quantity of the given item code the player holds (across stacks). */
    private int inventoryQuantity(String playerId, String itemCode) {
        return playerInventoryRepository.findByPlayerIdOrderByItemNameAsc(playerId).stream()
                .filter(entry -> entry.getItem().getCode().equalsIgnoreCase(itemCode))
                .mapToInt(PlayerInventoryEntity::getQuantity)
                .sum();
    }

    /** Consumes one unit of the item; returns {@code false} when there is nothing to consume. */
    private boolean consumeCombatItem(String playerId, String itemCode) {
        var entry = playerInventoryRepository.findByPlayerIdOrderByItemNameAsc(playerId).stream()
                .filter(e -> e.getItem().getCode().equalsIgnoreCase(itemCode))
                .findFirst()
                .orElse(null);
        if (entry == null) return false;
        if (entry.getQuantity() <= 1) {
            playerInventoryRepository.delete(entry);
        } else {
            entry.setQuantity(entry.getQuantity() - 1);
            playerInventoryRepository.save(entry);
        }
        return true;
    }

    /** Applies a consumable heal to the acting combatant and returns the health actually restored. */
    private int applyHeal(CombatSessionEntity combat, boolean player1, String itemCode) {
        ItemEntity item = itemRepository.findByCodeIgnoreCase(itemCode).orElse(null);
        if (item == null || !"CONSUMABLE".equalsIgnoreCase(item.getType()) || item.getHeal() <= 0) {
            return 0;
        }
        int current = player1 ? combat.getP1Health() : combat.getP2Health();
        int healed = Math.min(item.getHeal(), MAX_HEALTH - current);
        if (healed <= 0) {
            return 0; // already at full health — do not consume the item
        }
        String playerId = player1 ? combat.getPlayer1Id() : combat.getPlayer2Id();
        if (playerId == null || playerId.startsWith("bot_") || !consumeCombatItem(playerId, itemCode)) {
            return 0;
        }
        if (player1) {
            combat.setP1Health(current + healed);
        } else {
            combat.setP2Health(current + healed);
        }
        return healed;
    }

    /** The item code of the weapon currently equipped by the player, or PISTOL if none. */
    private String equippedWeaponCode(String playerId) {
        return playerInventoryRepository.findByPlayerIdOrderByItemNameAsc(playerId).stream()
                .filter(entry -> entry.isEquipped() && "WEAPON".equalsIgnoreCase(entry.getItem().getType()))
                .map(entry -> entry.getItem().getCode())
                .findFirst()
                .orElse("PISTOL");
    }

    /**
     * Writes the combat health back to the participating players so damage is not
     * "healed" after the battle ends. Bot ids ({@code bot_*}) resolve to no player
     * and are skipped automatically.
     */
    private void persistCombatHealth(CombatSessionEntity combat) {
        playerRepository.findById(combat.getPlayer1Id())
                .ifPresent(player -> player.setHealth(Math.max(0, combat.getP1Health())));
        playerRepository.findById(combat.getPlayer2Id())
                .ifPresent(player -> player.setHealth(Math.max(0, combat.getP2Health())));
    }

    private ItemEntity getWeapon(CombatSessionEntity combat, boolean player1) {
        String itemCode = player1 ? combat.getP1EquippedItemCode() : combat.getP2EquippedItemCode();
        return itemRepository.findByCodeIgnoreCase(itemCode == null ? "PISTOL" : itemCode)
                .orElseThrow(() -> new EntityNotFoundException("Equipped item not found"));
    }

    public CombatSessionEntity getActiveCombatForPlayer(String playerId) {
        return combatRepository.findActiveCombatsForPlayer(playerId, "IN_PROGRESS")
            .stream()
            .findFirst()
            .orElse(null);
    }
}
