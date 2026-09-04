package spring.backend.game.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.Method;
import java.util.List;

import org.junit.jupiter.api.Test;

import spring.backend.game.entity.CombatObstacle;
import spring.backend.game.entity.CombatSessionEntity;
import spring.backend.game.entity.EnemyTypeEntity;

/**
 * Юнит-тест планировщика хода ИИ-врага ({@code createBotPlan}).
 * Проверяются две регрессии: бот обязан подходить к игроку, даже когда не может
 * дойти до него за один ход, и не должен "стрелять" вне зоны поражения.
 */
class CombatBotPlanTest {

    private final CombatService service =
            new CombatService(null, null, null, null, null, null, null, null, null);

    private String botPlan(CombatSessionEntity combat) throws Exception {
        Method method = CombatService.class.getDeclaredMethod("createBotPlan", CombatSessionEntity.class);
        method.setAccessible(true);
        return (String) method.invoke(service, combat);
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
        return CombatSessionEntity.builder()
                .player1Id("player-1")
                .player2Id("bot_wolf")
                .enemyType(enemy)
                .p1X(p1X)
                .p1Y(p1Y)
                .p2X(p2X)
                .p2Y(p2Y)
                .build();
    }

    @Test
    void movesTowardPlayerEvenWhenCannotReachHimThisTurn() throws Exception {
        // 7 клеток между бойцами — больше, чем movementRange (3) волка.
        CombatSessionEntity combat = combat(wolf(), 1, 5, 8, 5);
        String plan = botPlan(combat);
        assertFalse(plan.isEmpty(), "бот обязан двигаться, а не стоять на месте");
        String[] actions = plan.split(";");
        assertEquals(3, actions.length);
        // Вне зоны поражения бот делает только перемещения, без холостых выстрелов.
        for (String action : actions) {
            assertTrue(action.startsWith("M:"), "вне зоны поражения бот должен только идти: " + plan);
            String[] parts = action.split(":");
            int dx = Integer.parseInt(parts[1]);
            int dy = Integer.parseInt(parts[2]);
            assertEquals(1, Math.abs(dx) + Math.abs(dy), "шаг должен быть на одну клетку");
        }
    }

    @Test
    void attacksImmediatelyWhenAlreadyInRange() throws Exception {
        // Дистанция 1 = attackRange — атакует сразу, не тратя ходы на движение.
        CombatSessionEntity combat = combat(wolf(), 2, 5, 1, 5);
        assertEquals("A:2:5", botPlan(combat));
    }

    @Test
    void stopsAndAttacksOnceEnemyEntersAttackRange() throws Exception {
        // Игрок (1,5), бот (4,5): дистанция 3 → бот подходит вплотную за 2 шага и атакует.
        CombatSessionEntity combat = combat(wolf(), 1, 5, 4, 5);
        assertEquals("M:-1:0;M:-1:0;A:1:5", botPlan(combat));
    }

    @Test
    void doesNotShootWhenOutOfRangeAndCannotMove() throws Exception {
        // Бот (0,5) замурован препятствиями со всех сторон — он не должен
        // "стрелять в пустоту", а просто пропустить ход.
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
        // Дистанция 6, движение 2 → после хода дистанция остаётся больше
        // attackRange(3): план состоит только из перемещения, атака не добавляется.
        CombatSessionEntity combat = combat(ranged, 1, 5, 7, 5);
        String plan = botPlan(combat);
        String[] actions = plan.split(";");
        assertEquals(2, actions.length, plan);
        assertTrue(actions[0].startsWith("M:"), plan);
        assertTrue(actions[1].startsWith("M:"), plan);
        assertFalse(plan.contains("A:"), plan);
    }
}