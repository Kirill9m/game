package spring.backend.game.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.util.List;

import org.junit.jupiter.api.Test;

import spring.backend.game.entity.CombatObstacle;
import spring.backend.game.entity.CombatParticipant;
import spring.backend.game.entity.CombatSessionEntity;
import spring.backend.game.entity.EnemyTypeEntity;

/**
 * Unit test for the AI-enemy turn planner ({@code createBotPlan}).
 * Covers two regressions: the bot must keep approaching the player even when
 * it cannot reach him in a single turn, and it must not "shoot" out of range.
 */
class CombatBotPlanTest {

    private final CombatService service =
            new CombatService(null, null, null, null, null, null, null, null, null, null);

    private String botPlan(CombatSessionEntity combat) throws Exception {
        CombatParticipant bot = combat.findParticipant("bot_wolf");
        Method method = CombatService.class.getDeclaredMethod(
                "createBotPlan", CombatSessionEntity.class, CombatParticipant.class);
        method.setAccessible(true);
        return (String) method.invoke(service, combat, bot);
    }

    private EnemyTypeEntity wolf() {
        return EnemyTypeEntity.builder()
                .code("WOLF")
                .name("Wolf")
                .maxHealth(80)
                .damage(15)
                .attackRange(1)
                .actionPoints(3)
                .movementRange(3)
                .build();
    }

    private CombatSessionEntity combat(EnemyTypeEntity enemy, int p1X, int p1Y, int p2X, int p2Y) {
        CombatSessionEntity combat = CombatSessionEntity.builder()
                .enemyType(enemy)
                .build();
        combat.setParticipants(List.of(
                CombatParticipant.builder()
                        .playerId("player-1")
                        .team("A")
                        .role(CombatParticipant.ROLE_FIGHTER)
                        .x(p1X)
                        .y(p1Y)
                        .health(100)
                        .posture("STANDING")
                        .build(),
                CombatParticipant.builder()
                        .playerId("bot_wolf")
                        .team("B")
                        .role(CombatParticipant.ROLE_FIGHTER)
                        .x(p2X)
                        .y(p2Y)
                        .health(enemy.getMaxHealth())
                        .posture("STANDING")
                        .build()));
        return combat;
    }

    @Test
    void movesTowardPlayerEvenWhenCannotReachHimThisTurn() throws Exception {
        // 7 cells between the fighters — more than the wolf's movementRange (3).
        CombatSessionEntity combat = combat(wolf(), 1, 5, 8, 5);
        String plan = botPlan(combat);
        assertFalse(plan.isEmpty(), "bot must move instead of standing still");
        String[] actions = plan.split(";");
        assertEquals(3, actions.length);
        // Out of range the bot only moves, with no wasted shots.
        for (String action : actions) {
            assertTrue(action.startsWith("M:"), "out of range the bot must only walk: " + plan);
            String[] parts = action.split(":");
            int dx = Integer.parseInt(parts[1]);
            int dy = Integer.parseInt(parts[2]);
            assertEquals(1, Math.abs(dx) + Math.abs(dy), "each step must be exactly one cell");
        }
    }

    @Test
    void attacksImmediatelyWhenAlreadyInRange() throws Exception {
        // Distance 1 = attackRange — attacks right away without spending turns on movement.
        CombatSessionEntity combat = combat(wolf(), 2, 5, 1, 5);
        assertEquals("A:2:5", botPlan(combat));
    }

    @Test
    void stopsAndAttacksOnceEnemyEntersAttackRange() throws Exception {
        // Player (1,5), bot (4,5): distance 3 → bot closes in over 2 steps and attacks.
        CombatSessionEntity combat = combat(wolf(), 1, 5, 4, 5);
        assertEquals("M:-1:0;M:-1:0;A:1:5", botPlan(combat));
    }

    @Test
    void doesNotShootWhenOutOfRangeAndCannotMove() throws Exception {
        // Bot (0,5) is walled in by obstacles on all sides — it must not
        // "shoot into the void", but simply skip the turn.
        CombatSessionEntity combat = combat(wolf(), 5, 5, 0, 5);
        combat.setObstacles(List.of(
                new CombatObstacle(1, 5, "WALL", "Stena", 50, 50),
                new CombatObstacle(0, 4, "WALL", "Stena", 50, 50),
                new CombatObstacle(0, 6, "WALL", "Stena", 50, 50)));
        assertEquals("", botPlan(combat));
    }

    @Test
    void rangedBotDoesNotAttackBeyondRange() throws Exception {
        EnemyTypeEntity ranged = EnemyTypeEntity.builder()
                .code("GUNNER")
                .name("Gunner")
                .maxHealth(60)
                .damage(10)
                .attackRange(3)
                .actionPoints(3)
                .movementRange(2)
                .build();
        // Distance 6, movement 2 → after moving the distance is still greater than
        // attackRange(3): the plan only moves, no attack is added.
        CombatSessionEntity combat = combat(ranged, 1, 5, 7, 5);
        String plan = botPlan(combat);
        String[] actions = plan.split(";");
        assertEquals(2, actions.length, plan);
        assertTrue(actions[0].startsWith("M:"), plan);
        assertTrue(actions[1].startsWith("M:"), plan);
        assertFalse(plan.contains("A:"), plan);
    }
}