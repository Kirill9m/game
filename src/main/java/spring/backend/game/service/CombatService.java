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
import java.util.stream.Collectors;
import java.time.Instant;

import org.springframework.stereotype.Service;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import lombok.RequiredArgsConstructor;
import spring.backend.game.entity.CombatLoot;
import spring.backend.game.entity.CombatObstacle;
import spring.backend.game.entity.CombatParticipant;
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

/**
 * Turn-based, team combat on a 10x10 board. Up to 10 fighters can share one
 * battle: the two founders fight as teams "A" and "B", other players can join
 * either side, join "for themselves" (their own team, free-for-all), or just
 * spectate. Every living fighter submits a plan, and once everybody is ready
 * the round resolves with all actions applied simultaneously.
 */
@Service
@RequiredArgsConstructor
public class CombatService {
    private static final int BOARD_SIZE = 10;
    private static final int MAX_HEALTH = 100;
    private static final int MAX_FIGHTERS = 10;
    /** Hard cap on how many fighters a single side (team) may have. */
    private static final int MAX_FIGHTERS_PER_TEAM = 5;
    /** How long a player has to submit a plan before the round auto-resolves. */
    private static final long TURN_SECONDS = 60;
    private static final String DEFAULT_ENEMY_CODE = "WOLF";
    private static final String STANDING = "STANDING";
    private static final String CROUCHING = "CROUCHING";
    private static final String PRONE = "PRONE";
    private static final String TEAM_A = "A";
    private static final String TEAM_B = "B";
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

        if (worldZoneService.isInsideSafeZone(attacker.getPositionX(), attacker.getPositionY())
            || worldZoneService.isInsideSafeZone(target.getPositionX(), target.getPositionY())) {
            throw new IllegalStateException("PvP attacks are disabled inside the safe zone");
        }

        UUID attackerLoc = attacker.getCurrentLocationId();
        UUID targetLoc = target.getCurrentLocationId();
        if (attackerLoc != targetLoc && (attackerLoc == null || !attackerLoc.equals(targetLoc))) {
            throw new IllegalStateException("Target is in another location — you cannot attack them");
        }

        if (target.getLastSeen() == null
                || target.getLastSeen().isBefore(Instant.now().minusSeconds(90))) {
            throw new IllegalStateException("Target player is offline — you cannot attack them");
        }

        CombatSessionEntity combat = CombatSessionEntity.builder()
                .actionPoints(3)
                .build();
        combat.setParticipants(List.of(
                fighter(attackerId, TEAM_A, 1, 5, attacker.getHealth(), equippedWeaponCode(attackerId)),
                fighter(targetId, TEAM_B, 8, 5, target.getHealth(), equippedWeaponCode(targetId))));
        combat.setObstacles(generateObstacles(attacker.getPositionX(), attacker.getPositionY()));
        combat.setTurnDeadlineMillis(deadline());
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
                .enemyType(enemy)
                .actionPoints(3)
                .build();
        combat.setParticipants(List.of(
                fighter(playerId, TEAM_A, 1, 5, player.getHealth(), equippedWeaponCode(playerId)),
                fighter("bot_" + enemy.getCode().toLowerCase(), TEAM_B, 8, 5, enemy.getMaxHealth(), null)));
        combat.setObstacles(generateObstacles(player.getPositionX(), player.getPositionY()));
        combat.setTurnDeadlineMillis(deadline());
        return combatRepository.save(combat);
    }

    private CombatParticipant fighter(String playerId, String team, int x, int y, int health, String equipped) {
        return CombatParticipant.builder()
                .playerId(playerId)
                .team(team)
                .role(CombatParticipant.ROLE_FIGHTER)
                .x(x)
                .y(y)
                .health(health)
                .posture(STANDING)
                .equippedItemCode(equipped)
                .build();
    }

    /**
     * Joins an ongoing battle as a fighter. {@code team} is either an existing
     * side (e.g. "A" / "B"), {@code "SELF"} or blank — in the latter cases the
     * player fights for themselves as their own team.
     */
    @Transactional
    public CombatSessionEntity joinCombat(UUID combatId, String playerId, String team) {
        CombatSessionEntity combat = getCombatForUpdate(combatId);
        ensureInProgress(combat);
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + playerId));
        if (combat.findParticipant(playerId) != null) {
            throw new IllegalStateException("You are already in this combat");
        }
        if (combat.fighters().size() >= MAX_FIGHTERS) {
            throw new IllegalStateException("This battle is already full (" + MAX_FIGHTERS + " fighters)");
        }
        if (worldZoneService.isInsideSafeZone(player.getPositionX(), player.getPositionY())) {
            throw new IllegalStateException("You cannot join a fight from inside the safe zone");
        }
        ensureNotInCombat(playerId);
        String resolvedTeam = resolveTeam(combat, team, playerId);
        long teamCount = combat.fighters().stream()
                .filter(f -> resolvedTeam.equals(f.getTeam()))
                .count();
        if (teamCount >= MAX_FIGHTERS_PER_TEAM) {
            throw new IllegalStateException("That side is already full (" + MAX_FIGHTERS_PER_TEAM + " fighters)");
        }
        Cell spawn = findSpawnCell(combat);
        if (spawn == null) {
            throw new IllegalStateException("No room left on the board");
        }
        List<CombatParticipant> participants = combat.getParticipants();
        participants.add(fighter(playerId, resolvedTeam, spawn.x(), spawn.y(),
                player.getHealth(), equippedWeaponCode(playerId)));
        combat.setParticipants(participants);
        // Give the new fighter a full turn to plan their first actions.
        combat.setTurnDeadlineMillis(deadline());
        return combatRepository.save(combat);
    }

    /** Watches a battle without taking part. */
    @Transactional
    public CombatSessionEntity spectateCombat(UUID combatId, String playerId) {
        CombatSessionEntity combat = getCombatForUpdate(combatId);
        ensureInProgress(combat);
        if (combat.findParticipant(playerId) != null) {
            throw new IllegalStateException("You are already in this combat");
        }
        ensureNotInCombat(playerId);
        List<CombatParticipant> participants = combat.getParticipants();
        participants.add(CombatParticipant.builder()
                .playerId(playerId)
                .team("")
                .role(CombatParticipant.ROLE_SPECTATOR)
                .build());
        combat.setParticipants(participants);
        return combatRepository.save(combat);
    }

    /** A spectator or a dead fighter can simply leave; a living fighter forfeits. */
    @Transactional
    public CombatSessionEntity leaveCombat(UUID combatId, String playerId) {
        CombatSessionEntity combat = getCombatForUpdate(combatId);
        ensureInProgress(combat);
        CombatParticipant participant = combat.findParticipant(playerId);
        if (participant == null) {
            throw new IllegalStateException("You are not part of this combat");
        }
        if (participant.isSpectator() || !participant.isAlive()) {
            removeParticipant(combat, playerId);
            return combatRepository.save(combat);
        }
        forfeit(combat, participant);
        return combatRepository.save(combat);
    }

    public List<CombatSessionEntity> listActiveCombats() {
        return combatRepository.findByStatus("IN_PROGRESS");
    }

    public CombatSessionEntity getActiveCombatForPlayer(String playerId) {
        return combatRepository.findActiveCombatsForPlayer(playerId, "IN_PROGRESS")
            .stream()
            .findFirst()
            .orElse(null);
    }

    private String resolveTeam(CombatSessionEntity combat, String team, String playerId) {
        if (team == null || team.isBlank() || "SELF".equalsIgnoreCase(team)) {
            return playerId;
        }
        String normalized = team.trim();
        boolean exists = combat.fighters().stream().anyMatch(f -> normalized.equals(f.getTeam()));
        return exists ? normalized : playerId;
    }

    private Cell findSpawnCell(CombatSessionEntity combat) {
        Set<Cell> occupied = new HashSet<>();
        for (CombatParticipant f : combat.fighters()) {
            occupied.add(new Cell(f.getX(), f.getY()));
        }
        for (CombatObstacle obstacle : combat.getObstacles()) {
            if (obstacle.isAlive()) {
                occupied.add(new Cell(obstacle.x(), obstacle.y()));
            }
        }
        List<Cell> candidates = new ArrayList<>();
        for (int x = 0; x < BOARD_SIZE; x++) {
            for (int y = 0; y < BOARD_SIZE; y++) {
                if (!occupied.contains(new Cell(x, y))) {
                    candidates.add(new Cell(x, y));
                }
            }
        }
        if (candidates.isEmpty()) {
            return null;
        }
        return candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
    }

    private void ensureNotInCombat(String playerId) {
        if (!combatRepository.findActiveCombatsForPlayer(playerId, "IN_PROGRESS").isEmpty()) {
            throw new IllegalStateException("You are already in another combat");
        }
    }

    private void removeParticipant(CombatSessionEntity combat, String playerId) {
        List<CombatParticipant> participants = combat.getParticipants();
        participants.removeIf(p -> playerId.equals(p.getPlayerId()));
        combat.setParticipants(participants);
    }

    public CombatSessionEntity getCombat(UUID combatId) {
        return combatRepository.findById(combatId)
                .orElseThrow(() -> new EntityNotFoundException("Combat not found"));
    }

    public List<EnemyTypeEntity> getEnemyTypes() {
        return enemyTypeRepository.findAllByOrderByNameAsc();
    }

    // ---------------------------------------------------------------
    // Turns and plans
    // ---------------------------------------------------------------

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
        CombatParticipant me = requireFighter(combat, playerId);
        String plan = encodePlan(request);
        validatePlan(combat, me, plan);
        me.setPlan(plan);
        me.setReady(true);
        planBots(combat);
        if (allAliveFightersReady(combat)) {
            resolveRound(combat);
        }
        combat.setParticipants(combat.getParticipants());
        return combatRepository.save(combat);
    }

    /** Plans the turn for every living bot that has not acted yet. */
    private void planBots(CombatSessionEntity combat) {
        if (!isBotCombat(combat)) {
            return;
        }
        combat.fighters().stream()
                .filter(CombatParticipant::isBot)
                .filter(CombatParticipant::isAlive)
                .filter(bot -> !bot.isReady())
                .forEach(bot -> {
                    bot.setPlan(createBotPlan(combat, bot));
                    bot.setReady(true);
                });
    }

    private long deadline() {
        return System.currentTimeMillis() + TURN_SECONDS * 1000L;
    }

    private String createBotPlan(CombatSessionEntity combat, CombatParticipant bot) {
        EnemyTypeEntity enemy = combat.getEnemyType();
        if (enemy == null) {
            return "";
        }
        CombatParticipant target = nearestAliveEnemy(combat, bot);
        if (target == null) {
            return "";
        }
        List<String> plan = new ArrayList<>();
        int botX = bot.getX();
        int botY = bot.getY();
        int targetX = target.getX();
        int targetY = target.getY();
        int maxMoves = Math.min(enemy.getMovementRange(), enemy.getActionPoints());

        int initialDistance = distance(botX, botY, targetX, targetY);
        if (initialDistance <= enemy.getAttackRange() && enemy.getActionPoints() > 0) {
            plan.add("A:" + targetX + ":" + targetY);
            return String.join(";", plan);
        }

        Cell targetCell = new Cell(targetX, targetY);
        List<Cell> path = findMovementPath(combat, bot, botX, botY, targetX, targetY, maxMoves);
        if (path != null && path.size() > 1 && path.get(path.size() - 1).equals(targetCell)) {
            path = path.subList(0, path.size() - 1);
        }
        if (path == null || path.size() <= 1) {
            path = findClosestApproachPath(combat, bot, botX, botY, targetX, targetY, maxMoves);
            if (path != null && path.size() > 1 && path.get(path.size() - 1).equals(targetCell)) {
                path = path.subList(0, path.size() - 1);
            }
        }
        if (path == null || path.size() <= 1) {
            return "";
        }
        int steps = Math.min(maxMoves, path.size() - 1);
        for (int index = 1; index <= steps && plan.size() < maxMoves; index++) {
            Cell previous = path.get(index - 1);
            Cell current = path.get(index);
            plan.add("M:" + (current.x() - previous.x()) + ":" + (current.y() - previous.y()));
            botX = current.x();
            botY = current.y();
            if (distance(botX, botY, targetX, targetY) <= enemy.getAttackRange() && plan.size() < maxMoves) {
                plan.add("A:" + targetX + ":" + targetY);
            }
        }
        return String.join(";", plan);
    }

    private CombatParticipant nearestAliveEnemy(CombatSessionEntity combat, CombatParticipant fighter) {
        return combat.fighters().stream()
                .filter(f -> f.isAlive() && !f.getTeam().equals(fighter.getTeam()))
                .min((a, b) -> Integer.compare(
                        distance(fighter.getX(), fighter.getY(), a.getX(), a.getY()),
                        distance(fighter.getX(), fighter.getY(), b.getX(), b.getY())))
                .orElse(null);
    }

    private int distance(int x1, int y1, int x2, int y2) {
        return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
    }

    private CombatSessionEntity appendAction(CombatSessionEntity combat, String playerId, String action) {
        ensureInProgress(combat);
        CombatParticipant me = requireFighter(combat, playerId);
        String plan = me.getPlan();
        if (countActions(plan) >= combat.getActionPoints()) {
            throw new IllegalStateException("No action points left!");
        }
        String updatedPlan = plan == null || plan.isBlank() ? action : plan + ";" + action;
        validatePlan(combat, me, updatedPlan);
        me.setPlan(updatedPlan);
        combat.setParticipants(combat.getParticipants());
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

    private void validatePlan(CombatSessionEntity combat, CombatParticipant me, String plan) {
        int x = me.getX();
        int y = me.getY();
        String posture = me.getPosture();
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
                if (parts.length != 2 || !player1HasItem(me.getPlayerId(), parts[1])) {
                    throw new IllegalArgumentException("You do not have this item");
                }
            } else if ("M".equals(parts[0])) {
                int dx = Integer.parseInt(parts[1]);
                int dy = Integer.parseInt(parts[2]);
                int step = Math.abs(dx) + Math.abs(dy);
                if (step < 1 || step > movementRange(posture)) {
                    throw new IllegalArgumentException("This posture allows moving up to " + movementRange(posture) + " cells per action");
                }
                x += dx;
                y += dy;
                if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
                    throw new IllegalArgumentException("You cannot leave the combat board");
                }
                if (aliveFighterAt(combat, x, y, me.getPlayerId()) != null) {
                    throw new IllegalStateException("You cannot move onto another fighter's cell");
                }
                validateMovementPath(combat, me, x - dx, y - dy, x, y, movementRange(posture));
            } else if ("A".equals(parts[0])) {
                if (parts.length != 3) {
                    throw new IllegalArgumentException("Invalid combat plan");
                }
                int tx = Integer.parseInt(parts[1]);
                int ty = Integer.parseInt(parts[2]);
                CombatParticipant target = aliveFighterAt(combat, tx, ty, me.getPlayerId());
                if (target == null || target.getTeam().equals(me.getTeam())) {
                    throw new IllegalStateException("No enemy at that cell");
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
                if (inventoryQuantity(me.getPlayerId(), itemCode) < plannedUses) {
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

    private String[] actions(String plan) {
        return plan == null || plan.isBlank() ? new String[0] : plan.split(";");
    }

    private String actionAt(String[] actions, int index) {
        return index < actions.length ? actions[index] : null;
    }

    // ---------------------------------------------------------------
    // Round resolution
    // ---------------------------------------------------------------

    private void resolveRound(CombatSessionEntity combat) {
        List<CombatParticipant> participants = combat.getParticipants();
        List<CombatParticipant> fighters = participants.stream()
                .filter(CombatParticipant::isFighter)
                .toList();
        Map<String, Integer> beforeHealth = fighters.stream()
                .collect(Collectors.toMap(CombatParticipant::getPlayerId, CombatParticipant::getHealth));
        List<String[]> plans = fighters.stream()
                .map(f -> actions(f.getPlan()))
                .toList();
        int maxActions = plans.stream().mapToInt(a -> a.length).max().orElse(0);
        List<String> roundActions = new ArrayList<>();
        for (int index = 0; index < maxActions; index++) {
            for (int i = 0; i < fighters.size(); i++) {
                CombatParticipant fighter = fighters.get(i);
                String action = actionAt(plans.get(i), index);
                if (action != null && fighter.isAlive()) {
                    int damage = applyAction(combat, fighter, action);
                    addReplayActions(roundActions, combat, fighter, action, damage);
                }
            }
        }
        combat.setLastRoundActions(roundActions.toArray(String[]::new));
        boolean someoneFell = fighters.stream()
                .anyMatch(f -> beforeHealth.getOrDefault(f.getPlayerId(), 0) > 0 && !f.isAlive());
        if (someoneFell) {
            for (CombatParticipant fighter : fighters) {
                if (beforeHealth.getOrDefault(fighter.getPlayerId(), 0) > 0 && !fighter.isAlive()) {
                    spawnDeathLoot(combat, fighter);
                }
            }
            recomputeWinner(combat);
        }
        finalizeAfterDeaths(combat);
        for (CombatParticipant fighter : fighters) {
            fighter.setPlan(null);
            fighter.setReady(false);
        }
        combat.setParticipants(participants);
        if ("IN_PROGRESS".equals(combat.getStatus())) {
            combat.setTurnDeadlineMillis(deadline());
        }
    }

    /**
     * Periodically resolves rounds whose turn timer has expired: fighters that
     * never submitted a plan are auto-skipped (empty plan) so a stalled player
     * cannot block the whole battle forever.
     */
    @Scheduled(fixedRate = 3000)
    @Transactional
    public void autoResolveExpiredTurns() {
        List<CombatSessionEntity> expired =
                combatRepository.findExpiredTurnsForUpdate("IN_PROGRESS", System.currentTimeMillis());
        for (CombatSessionEntity combat : expired) {
            // Auto-skip any human fighter that never submitted a plan.
            combat.fighters().stream()
                    .filter(CombatParticipant::isAlive)
                    .filter(f -> !f.isReady())
                    .filter(f -> !f.isBot())
                    .forEach(f -> {
                        f.setPlan("");
                        f.setReady(true);
                    });
            // Bots always get their turn planned.
            planBots(combat);
            if (allAliveFightersReady(combat)) {
                resolveRound(combat);
            } else {
                combat.setTurnDeadlineMillis(deadline());
            }
            combat.setParticipants(combat.getParticipants());
            combatRepository.save(combat);
        }
    }

    private void recomputeWinner(CombatSessionEntity combat) {
        Set<String> aliveTeams = combat.fighters().stream()
                .filter(CombatParticipant::isAlive)
                .map(CombatParticipant::getTeam)
                .collect(Collectors.toSet());
        if (aliveTeams.size() == 1) {
            combat.setWinnerTeam(aliveTeams.iterator().next());
        } else if (aliveTeams.isEmpty()) {
            combat.setWinnerTeam(null);
        }
    }

    /** Finishes the combat once a winner has no loot left to collect (or nobody is alive). */
    private void finalizeAfterDeaths(CombatSessionEntity combat) {
        if (combat.getWinnerTeam() != null) {
            boolean winnerAlive = combat.fighters().stream()
                    .anyMatch(f -> combat.getWinnerTeam().equals(f.getTeam()) && f.isAlive());
            if (!winnerAlive || combat.getLoot().isEmpty()) {
                combat.setStatus("FINISHED");
                persistCombatHealth(combat);
            }
        } else if (combat.fighters().stream().noneMatch(CombatParticipant::isAlive)) {
            combat.setStatus("FINISHED");
            persistCombatHealth(combat);
        }
    }

    private void spawnDeathLoot(CombatSessionEntity combat, CombatParticipant dead) {
        if (dead.isBot()) {
            spawnEnemyLoot(combat, dead);
        } else if (isBotCombat(combat)) {
            // The player lost to a bot — their marked field loot is lost.
            lootService.discardMarkedItems(dead.getPlayerId());
        } else {
            spawnBagLoot(combat, dead);
        }
    }

    /** Rolls the enemy's configured loot table and places the piles near its body. */
    private void spawnEnemyLoot(CombatSessionEntity combat, CombatParticipant deadBot) {
        EnemyTypeEntity enemy = combat.getEnemyType();
        if (enemy == null) {
            return;
        }
        List<EnemyLootDrop> drops = enemy.getLootDrops();
        if (drops.isEmpty()) {
            return;
        }
        List<CombatLoot> loot = new ArrayList<>(combat.getLoot());
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
                    ? new Cell(deadBot.getX(), deadBot.getY())
                    : findEmptyCellNear(combat, deadBot.getX(), deadBot.getY());
            firstPile = false;
            if (cell == null) {
                break;
            }
            loot.add(new CombatLoot(cell.x(), cell.y(), item.getCode(), item.getName(), quantity));
        }
        combat.setLoot(loot);
    }

    /** Drops the defeated player's marked field loot onto the board near their body. */
    private void spawnBagLoot(CombatSessionEntity combat, CombatParticipant dead) {
        List<PlayerInventoryEntity> marked = lootService.takeMarkedItems(dead.getPlayerId());
        if (marked.isEmpty()) {
            return;
        }
        int bodyX = dead.getX();
        int bodyY = dead.getY();
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

    /** The acting player surrenders: they die and their loot is dropped/lost. */
    @Transactional
    public CombatSessionEntity finishCombat(UUID combatId, String playerId) {
        CombatSessionEntity combat = getCombatForUpdate(combatId);
        ensureInProgress(combat);
        CombatParticipant me = requireFighter(combat, playerId);
        forfeit(combat, me);
        return combatRepository.save(combat);
    }

    private void forfeit(CombatSessionEntity combat, CombatParticipant fighter) {
        fighter.setHealth(0);
        if (isBotCombat(combat)) {
            lootService.discardMarkedItems(fighter.getPlayerId());
        } else {
            lootService.dropMarkedItemsAsWorldLoot(fighter.getPlayerId());
        }
        recomputeWinner(combat);
        finalizeAfterDeaths(combat);
        combat.setParticipants(combat.getParticipants());
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
        CombatParticipant me = requireFighter(combat, playerId);
        if (!me.isAlive()) {
            throw new IllegalStateException("You are down and cannot pick up loot");
        }
        int feetX = me.getX();
        int feetY = me.getY();
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
        finalizeAfterDeaths(combat);
        return combatRepository.save(combat);
    }

    /** Nearest free board cell around {@code (centerX, centerY)} (radius outward). */
    private Cell findEmptyCellNear(CombatSessionEntity combat, int centerX, int centerY) {
        Set<Cell> occupied = new HashSet<>();
        occupied.add(new Cell(centerX, centerY));
        for (CombatParticipant f : combat.fighters()) {
            occupied.add(new Cell(f.getX(), f.getY()));
        }
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

    private int applyAction(CombatSessionEntity combat, CombatParticipant fighter, String action) {
        if (action == null) {
            return 0;
        }
        if (action.startsWith("P:")) {
            fighter.setPosture(normalizePosture(action.substring(2)));
            return 0;
        }
        if (action.startsWith("E:")) {
            fighter.setEquippedItemCode(action.substring(2).toUpperCase());
            return 0;
        }
        if (action.startsWith("U:")) {
            return applyHeal(combat, fighter, action.substring(2).toUpperCase());
        }
        if (action.startsWith("M:")) {
            applyMovement(combat, fighter, action);
            return 0;
        }
        return action.startsWith("A:") ? applyAttack(combat, fighter, action) : 0;
    }

    private void applyMovement(CombatSessionEntity combat, CombatParticipant mover, String action) {
        if (action == null || !action.startsWith("M:")) {
            return;
        }
        String[] parts = action.split(":");
        int newX = mover.getX() + Integer.parseInt(parts[1]);
        int newY = mover.getY() + Integer.parseInt(parts[2]);
        if (aliveFighterAt(combat, newX, newY, mover.getPlayerId()) != null) {
            return;
        }
        mover.setX(newX);
        mover.setY(newY);
    }

    private int applyAttack(CombatSessionEntity combat, CombatParticipant attacker, String action) {
        if (action == null || !action.startsWith("A:")) {
            return 0;
        }
        String[] parts = action.split(":");
        if (parts.length < 3) {
            return 0;
        }
        int targetX = Integer.parseInt(parts[1]);
        int targetY = Integer.parseInt(parts[2]);
        EnemyTypeEntity enemy = attacker.isBot() ? combat.getEnemyType() : null;
        ItemEntity weapon = enemy == null ? getWeapon(combat, attacker) : null;
        int maxShotDistance = enemy != null ? enemy.getAttackRange() : weapon.getAttackRange();
        int shotDamage = enemy != null ? enemy.getDamage() : weapon.getDamage();
        CombatParticipant target = aliveFighterAt(combat, targetX, targetY, attacker.getPlayerId());
        if (target == null || target.getTeam().equals(attacker.getTeam())) {
            return 0;
        }
        if (distance(attacker.getX(), attacker.getY(), targetX, targetY) > maxShotDistance) {
            return 0;
        }
        if (ThreadLocalRandom.current().nextInt(100) >= hitChance(combat, attacker, weapon, target.getPosture())) {
            return 0;
        }
        // Bullets pass through obstacles but damage (and may destroy) them.
        damageObstaclesAlongLine(combat, attacker.getX(), attacker.getY(), targetX, targetY, shotDamage);
        int actualDamage = Math.max(0, shotDamage - armorDefense(target.getPlayerId()));
        target.setHealth(Math.max(0, target.getHealth() - actualDamage));
        return actualDamage;
    }

    /** Applies a consumable heal to the acting fighter and returns the health actually restored. */
    private int applyHeal(CombatSessionEntity combat, CombatParticipant fighter, String itemCode) {
        ItemEntity item = itemRepository.findByCodeIgnoreCase(itemCode).orElse(null);
        if (item == null || !"CONSUMABLE".equalsIgnoreCase(item.getType()) || item.getHeal() <= 0) {
            return 0;
        }
        int healed = Math.min(item.getHeal(), MAX_HEALTH - fighter.getHealth());
        if (healed <= 0) {
            return 0;
        }
        if (fighter.isBot() || !consumeCombatItem(fighter.getPlayerId(), itemCode)) {
            return 0;
        }
        fighter.setHealth(fighter.getHealth() + healed);
        return healed;
    }

    /** Sums the defense of every equipped armor piece of the given player. */
    private int armorDefense(String playerId) {
        if (playerId == null || playerId.startsWith("bot_")) {
            return 0;
        }
        return playerInventoryRepository.findByPlayerIdOrderByItemNameAsc(playerId).stream()
                .filter(entry -> entry.isEquipped() && "ARMOR".equalsIgnoreCase(entry.getItem().getType()))
                .mapToInt(entry -> entry.getItem().getDefense())
                .sum();
    }

    private int hitChance(CombatSessionEntity combat, CombatParticipant attacker, ItemEntity weapon, String targetPosture) {
        int base = STANDING.equals(targetPosture) ? 100 : CROUCHING.equals(targetPosture) ? 75 : 50;
        if (weapon == null) {
            return base;
        }
        String weaponTypeCode = weapon.getWeaponTypeCode();
        if (weaponTypeCode == null || weaponTypeCode.isBlank()) {
            return base;
        }
        int level = weaponProficiencyRepository
                .findByPlayerIdAndWeaponTypeCodeIgnoreCase(attacker.getPlayerId(), weaponTypeCode)
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
        if (posture == null) {
            throw new IllegalArgumentException("Missing posture");
        }
        String normalized = posture.toUpperCase();
        if (!STANDING.equals(normalized) && !CROUCHING.equals(normalized) && !PRONE.equals(normalized)) {
            throw new IllegalArgumentException("Unknown posture");
        }
        return normalized;
    }

    private int movementRange(String posture) {
        return STANDING.equals(posture) ? 3 : CROUCHING.equals(posture) ? 2 : 1;
    }

    private ItemEntity getWeapon(CombatSessionEntity combat, CombatParticipant fighter) {
        String itemCode = fighter.getEquippedItemCode();
        return itemRepository.findByCodeIgnoreCase(itemCode == null ? "PISTOL" : itemCode)
                .orElseThrow(() -> new EntityNotFoundException("Equipped item not found"));
    }

    private int shotRange(CombatSessionEntity combat, CombatParticipant fighter) {
        EnemyTypeEntity enemy = fighter.isBot() ? combat.getEnemyType() : null;
        if (enemy != null) {
            return enemy.getAttackRange();
        }
        return getWeapon(combat, fighter).getAttackRange();
    }

    /**
     * Writes combat health back to the participating players so damage is not
     * "healed" after the battle ends. Bot ids resolve to no player and are skipped.
     */
    private void persistCombatHealth(CombatSessionEntity combat) {
        for (CombatParticipant fighter : combat.fighters()) {
            if (fighter.isBot()) {
                continue;
            }
            playerRepository.findById(fighter.getPlayerId())
                    .ifPresent(player -> player.setHealth(Math.max(0, fighter.getHealth())));
        }
    }

    /** The item code of the weapon currently equipped by the player, or PISTOL if none. */
    private String equippedWeaponCode(String playerId) {
        return playerInventoryRepository.findByPlayerIdOrderByItemNameAsc(playerId).stream()
                .filter(entry -> entry.isEquipped() && "WEAPON".equalsIgnoreCase(entry.getItem().getType()))
                .map(entry -> entry.getItem().getCode())
                .findFirst()
                .orElse("PISTOL");
    }

    private boolean player1HasItem(String playerId, String itemCode) {
        return playerInventoryRepository.existsByPlayerIdAndItemCodeIgnoreCase(playerId, itemCode);
    }

    private int inventoryQuantity(String playerId, String itemCode) {
        return playerInventoryRepository.findByPlayerIdOrderByItemNameAsc(playerId).stream()
                .filter(entry -> entry.getItem().getCode().equalsIgnoreCase(itemCode))
                .mapToInt(PlayerInventoryEntity::getQuantity)
                .sum();
    }

    private boolean consumeCombatItem(String playerId, String itemCode) {
        var entry = playerInventoryRepository.findByPlayerIdOrderByItemNameAsc(playerId).stream()
                .filter(e -> e.getItem().getCode().equalsIgnoreCase(itemCode))
                .findFirst()
                .orElse(null);
        if (entry == null) {
            return false;
        }
        if (entry.getQuantity() <= 1) {
            playerInventoryRepository.delete(entry);
        } else {
            entry.setQuantity(entry.getQuantity() - 1);
            playerInventoryRepository.save(entry);
        }
        return true;
    }

    private boolean isBotCombat(CombatSessionEntity combat) {
        return combat.getEnemyType() != null;
    }

    private void ensureInProgress(CombatSessionEntity combat) {
        if (!"IN_PROGRESS".equals(combat.getStatus())) {
            throw new IllegalStateException("Combat is already finished");
        }
    }

    private CombatParticipant requireFighter(CombatSessionEntity combat, String playerId) {
        CombatParticipant participant = combat.findParticipant(playerId);
        if (participant == null || !participant.isFighter()) {
            throw new IllegalStateException("You are not fighting in this combat");
        }
        return participant;
    }

    private CombatParticipant aliveFighterAt(CombatSessionEntity combat, int x, int y, String excludePlayerId) {
        return combat.fighters().stream()
                .filter(f -> f.isAlive() && f.getX() == x && f.getY() == y
                        && !f.getPlayerId().equals(excludePlayerId))
                .findFirst()
                .orElse(null);
    }

    private boolean allAliveFightersReady(CombatSessionEntity combat) {
        return combat.fighters().stream()
                .filter(CombatParticipant::isAlive)
                .allMatch(CombatParticipant::isReady);
    }

    private boolean isObstacle(CombatSessionEntity combat, int x, int y) {
        return combat.getObstacles().stream()
                .anyMatch(obstacle -> obstacle.isAlive() && obstacle.x() == x && obstacle.y() == y);
    }

    private boolean isOccupied(CombatSessionEntity combat, int x, int y, String excludePlayerId) {
        if (isObstacle(combat, x, y)) {
            return true;
        }
        return aliveFighterAt(combat, x, y, excludePlayerId) != null;
    }

    private void validateMovementPath(CombatSessionEntity combat, CombatParticipant mover,
                                      int startX, int startY, int targetX, int targetY, int maxSteps) {
        if (findMovementPath(combat, mover, startX, startY, targetX, targetY, maxSteps) == null) {
            throw new IllegalStateException("This cell is blocked by terrain");
        }
    }

    private List<Cell> findMovementPath(CombatSessionEntity combat, CombatParticipant mover,
                                        int startX, int startY, int targetX, int targetY, int maxSteps) {
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
            if (distance >= maxSteps) {
                continue;
            }
            for (Cell direction : DIRECTIONS) {
                Cell next = new Cell(current.x() + direction.x(), current.y() + direction.y());
                if (next.x() < 0 || next.x() >= BOARD_SIZE || next.y() < 0 || next.y() >= BOARD_SIZE
                        || visited.contains(next) || isOccupied(combat, next.x(), next.y(), mover.getPlayerId())) {
                    continue;
                }
                visited.add(next);
                parents.put(next, current);
                queue.add(next);
                distances.add(distance + 1);
            }
        }
        return null;
    }

    private List<Cell> findClosestApproachPath(CombatSessionEntity combat, CombatParticipant mover,
                                               int startX, int startY, int targetX, int targetY, int maxSteps) {
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
                if (bestDistance == 0) {
                    break;
                }
            }
            if (distance >= maxSteps) {
                continue;
            }
            for (Cell direction : DIRECTIONS) {
                Cell next = new Cell(current.x() + direction.x(), current.y() + direction.y());
                if (next.x() < 0 || next.x() >= BOARD_SIZE || next.y() < 0 || next.y() >= BOARD_SIZE
                        || visited.contains(next) || isOccupied(combat, next.x(), next.y(), mover.getPlayerId())) {
                    continue;
                }
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
            if (!current.isAlive() || !hitCells.contains(new Cell(current.x(), current.y()))) {
                continue;
            }
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
     * two founders' starting cells.
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
            if (!occupied.add(new Cell(x, y))) {
                continue;
            }
            ObstacleTypeEntity type = types.get(ThreadLocalRandom.current().nextInt(types.size()));
            result.add(new CombatObstacle(x, y, type.getCode(), type.getName(),
                    type.getMaxHealth(), type.getMaxHealth()));
        }
        return result;
    }

    // ---------------------------------------------------------------
    // Replay encoding
    // ---------------------------------------------------------------

    private String replayAction(CombatSessionEntity combat, CombatParticipant fighter, String action, int damage) {
        String actor = fighter.getPlayerId();
        if (!action.startsWith("A:")) {
            return actor + ":" + action + ":" + damage;
        }
        String[] parts = action.split(":");
        CombatParticipant target = fighterAt(combat, Integer.parseInt(parts[1]), Integer.parseInt(parts[2]));
        String targetId = target == null ? "" : target.getPlayerId();
        return actor + ":A:" + targetId + ":" + damage + ":" + shotRange(combat, fighter);
    }

    /** The fighter standing on the given cell (alive or dead). */
    private CombatParticipant fighterAt(CombatSessionEntity combat, int x, int y) {
        return combat.fighters().stream()
                .filter(f -> f.getX() == x && f.getY() == y)
                .findFirst()
                .orElse(null);
    }

    private void addReplayActions(List<String> replay, CombatSessionEntity combat,
                                  CombatParticipant fighter, String action, int damage) {
        if (!action.startsWith("M:")) {
            replay.add(replayAction(combat, fighter, action, damage));
            return;
        }
        String[] parts = action.split(":");
        int dx = Integer.parseInt(parts[1]);
        int dy = Integer.parseInt(parts[2]);
        int endX = fighter.getX();
        int endY = fighter.getY();
        List<Cell> path = findMovementPath(combat, fighter, endX - dx, endY - dy, endX, endY, BOARD_SIZE * BOARD_SIZE);
        if (path == null) {
            return;
        }
        for (int index = 1; index < path.size(); index++) {
            Cell previous = path.get(index - 1);
            Cell current = path.get(index);
            replay.add(fighter.getPlayerId() + ":M:" + (current.x() - previous.x())
                    + ":" + (current.y() - previous.y()) + ":0");
        }
    }

    /** A single cell on the combat board. */
    private record Cell(int x, int y) {
    }
}
