package spring.backend.game.controller;

import spring.backend.game.entity.CombatSessionEntity;
import spring.backend.game.service.CombatService;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
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
@CrossOrigin(origins = "http://localhost:3000")
public class CombatController {

    private final CombatService combatService;

    @PostMapping("/start")
    public ResponseEntity<CombatSessionEntity> startCombat(
            @RequestParam String attackerId,
            @RequestParam String targetId) {
        return ResponseEntity.ok(combatService.startCombat(attackerId, targetId));
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
            @RequestParam String playerId) {
        return ResponseEntity.ok(combatService.endTurn(combatId, playerId));
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