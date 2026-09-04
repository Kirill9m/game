package spring.backend.game.controller;

import spring.backend.game.entity.CombatSessionEntity;
import spring.backend.game.entity.EnemyTypeEntity;
import spring.backend.game.dto.CombatLootPickupRequest;
import spring.backend.game.dto.CombatPlanRequest;
import spring.backend.game.service.CombatService;

import java.util.UUID;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/combat")
@RequiredArgsConstructor
public class CombatController {

    private final CombatService combatService;

    @PostMapping("/start")
    public ResponseEntity<CombatSessionEntity> startCombat(
            @RequestParam String attackerId,
            @RequestParam String targetId) {
        return ResponseEntity.ok(combatService.startCombat(attackerId, targetId));
    }

    @PostMapping("/start-bot")
    public ResponseEntity<CombatSessionEntity> startBotCombat(
            @RequestParam String playerId,
            @RequestParam(defaultValue = "WOLF") String enemyCode) {
        return ResponseEntity.ok(combatService.startBotCombat(playerId, enemyCode));
    }

    @GetMapping("/enemy-types")
    public ResponseEntity<List<EnemyTypeEntity>> getEnemyTypes() {
        return ResponseEntity.ok(combatService.getEnemyTypes());
    }

    @GetMapping("/{combatId}")
    public ResponseEntity<CombatSessionEntity> getCombat(@PathVariable UUID combatId) {
        return ResponseEntity.ok(combatService.getCombat(combatId));
    }

    @PostMapping("/{combatId}/move")
    public ResponseEntity<CombatSessionEntity> combatMove(
            @PathVariable UUID combatId,
            @RequestParam String playerId,
            @RequestParam int dx,
            @RequestParam int dy) {
        return ResponseEntity.ok(combatService.moveInCombat(combatId, playerId, dx, dy));
    }

    @PostMapping("/{combatId}/end-turn")
    public ResponseEntity<CombatSessionEntity> endTurn(
            @PathVariable UUID combatId,
            @RequestParam String playerId,
            @org.springframework.web.bind.annotation.RequestBody(required = false) CombatPlanRequest plan) {
        return ResponseEntity.ok(combatService.endTurn(combatId, playerId, plan));
    }

    @PostMapping("/{combatId}/pickup-loot")
    public ResponseEntity<CombatSessionEntity> pickupLoot(
            @PathVariable UUID combatId,
            @RequestParam String playerId,
            @org.springframework.web.bind.annotation.RequestBody(required = false) CombatLootPickupRequest request) {
        return ResponseEntity.ok(combatService.pickupLoot(combatId, playerId,
                request == null ? List.of() : request.pileIndexes()));
    }

    @PostMapping("/{combatId}/attack")
    public ResponseEntity<CombatSessionEntity> attack(
            @PathVariable UUID combatId,
            @RequestParam String playerId) {
        return ResponseEntity.ok(combatService.attack(combatId, playerId));
    }

    @PostMapping("/{combatId}/finish")
    public ResponseEntity<CombatSessionEntity> finishCombat(
            @PathVariable UUID combatId,
            @RequestParam String playerId) {
        return ResponseEntity.ok(combatService.finishCombat(combatId, playerId));
    }

    @GetMapping("/active")
    public ResponseEntity<CombatSessionEntity> getActiveCombat(@RequestParam String playerId) {
        CombatSessionEntity activeCombat = combatService.getActiveCombatForPlayer(playerId);
        if (activeCombat != null) {
            return ResponseEntity.ok(activeCombat);
        }
        return ResponseEntity.noContent().build();
    }
}