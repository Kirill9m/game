package spring.backend.game.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.AdminDtos.AdminEnemyTypeDto;
import spring.backend.game.dto.AdminDtos.AdminItemDto;
import spring.backend.game.dto.AdminDtos.AdminNpcDto;
import spring.backend.game.dto.AdminDtos.AdminPlayerDto;
import spring.backend.game.dto.AdminDtos.AdminQuestDto;
import spring.backend.game.dto.AdminDtos.BootstrapAdminRequest;
import spring.backend.game.dto.AdminDtos.CreateDialogueNodeRequest;
import spring.backend.game.dto.AdminDtos.CreateEnemyTypeRequest;
import spring.backend.game.dto.AdminDtos.CreateItemRequest;
import spring.backend.game.dto.AdminDtos.CreateNpcRequest;
import spring.backend.game.dto.AdminDtos.CreateQuestRequest;
import spring.backend.game.dto.AdminDtos.SetRoleRequest;
import spring.backend.game.dto.AdminDtos.UpdateEnemyTypeRequest;
import spring.backend.game.dto.AdminDtos.UpdateNpcRequest;
import spring.backend.game.dto.AdminDtos.UpdatePlayerRequest;
import spring.backend.game.dto.AdminDtos.UpdateQuestRequest;
import spring.backend.game.service.AdminService;

/**
 * Admin panel API. Every endpoint (except the code-protected bootstrap)
 * requires the caller's {@code playerId} to belong to a player with the ADMIN
 * role — otherwise a 403 is returned.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.8.96:3000"})
public class AdminController {

    private final AdminService adminService;

    // --- BOOTSTRAP (first admin) ---

    /** Promote the first admin using the secret bootstrap code. */
    @PostMapping("/bootstrap")
    public ResponseEntity<AdminPlayerDto> bootstrapAdmin(@RequestBody BootstrapAdminRequest request) {
        return ResponseEntity.ok(adminService.bootstrapAdmin(request.playerId(), request.code()));
    }

    // --- PLAYERS & ROLES ---

    @GetMapping("/players")
    public ResponseEntity<List<AdminPlayerDto>> getPlayers(@RequestParam String playerId) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.getAllPlayers());
    }

    @PostMapping("/players/{targetPlayerId}/role")
    public ResponseEntity<AdminPlayerDto> setPlayerRole(
            @PathVariable String targetPlayerId,
            @RequestParam String playerId,
            @RequestBody SetRoleRequest request) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.setPlayerRole(targetPlayerId, request.role()));
    }

    /** Update player stats (username, level, gold, health, attributes, position). */
    @PatchMapping("/players/{targetPlayerId}")
    public ResponseEntity<AdminPlayerDto> updatePlayer(
            @PathVariable String targetPlayerId,
            @RequestParam String playerId,
            @RequestBody UpdatePlayerRequest request) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.updatePlayer(targetPlayerId, request));
    }

    /** Delete a player with inventory, quest progress and combat history. */
    @DeleteMapping("/players/{targetPlayerId}")
    public ResponseEntity<Void> deletePlayer(
            @PathVariable String targetPlayerId,
            @RequestParam String playerId) {
        adminService.requireAdmin(playerId);
        adminService.deletePlayer(targetPlayerId);
        return ResponseEntity.noContent().build();
    }

    // --- NPCS ---

    @GetMapping("/npcs")
    public ResponseEntity<List<AdminNpcDto>> getNpcs(@RequestParam String playerId) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.getAllNpcs());
    }

    @PostMapping("/npcs")
    public ResponseEntity<AdminNpcDto> createNpc(
            @RequestParam String playerId,
            @RequestBody CreateNpcRequest request) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.createNpc(
                request.code(),
                request.name(),
                request.positionX() == null ? 0 : request.positionX(),
                request.positionY() == null ? 0 : request.positionY()));
    }

    @PatchMapping("/npcs/{npcId}")
    public ResponseEntity<AdminNpcDto> updateNpc(
            @PathVariable UUID npcId,
            @RequestParam String playerId,
            @RequestBody UpdateNpcRequest request) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.updateNpc(
                npcId, request.name(), request.positionX(), request.positionY()));
    }

    @DeleteMapping("/npcs/{npcId}")
    public ResponseEntity<Void> deleteNpc(@PathVariable UUID npcId, @RequestParam String playerId) {
        adminService.requireAdmin(playerId);
        adminService.deleteNpc(npcId);
        return ResponseEntity.noContent().build();
    }

    // --- QUESTS ---

    @GetMapping("/quests")
    public ResponseEntity<List<AdminQuestDto>> getQuests(@RequestParam String playerId) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.getAllQuests());
    }

    @PostMapping("/quests")
    public ResponseEntity<AdminQuestDto> createQuest(
            @RequestParam String playerId,
            @RequestBody CreateQuestRequest request) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.createQuest(
                request.code(),
                request.title(),
                request.rewardExp() == null ? 0 : request.rewardExp(),
                request.rewardGold() == null ? 0 : request.rewardGold(),
                request.rewardItemCode(),
                request.requiredNpcIds()));
    }

    @PatchMapping("/quests/{questId}")
    public ResponseEntity<AdminQuestDto> updateQuest(
            @PathVariable UUID questId,
            @RequestParam String playerId,
            @RequestBody UpdateQuestRequest request) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.updateQuest(
                questId,
                request.title(),
                request.rewardExp(),
                request.rewardGold(),
                request.rewardItemCode(),
                request.requiredNpcIds()));
    }

    @DeleteMapping("/quests/{questId}")
    public ResponseEntity<Void> deleteQuest(@PathVariable UUID questId, @RequestParam String playerId) {
        adminService.requireAdmin(playerId);
        adminService.deleteQuest(questId);
        return ResponseEntity.noContent().build();
    }

    /** Random quest generator: creates a quest + starter dialogues in one call. */
    @PostMapping("/quests/generate")
    public ResponseEntity<AdminQuestDto> generateQuest(
            @RequestParam String playerId,
            @RequestParam(defaultValue = "false") boolean createNewNpc) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.generateRandomQuest(createNewNpc));
    }

    /** Random enemy generator: difficulty 1 (weak) .. 3 (boss-like). */
    @PostMapping("/enemies/generate")
    public ResponseEntity<AdminEnemyTypeDto> generateEnemy(
            @RequestParam String playerId,
            @RequestParam(defaultValue = "1") int difficulty) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.generateRandomEnemy(difficulty));
    }

    // --- DIALOGUES ---

    @GetMapping("/dialogues")
    public ResponseEntity<?> getDialogueNodes(
            @RequestParam String playerId,
            @RequestParam(required = false) UUID npcId) {
        adminService.requireAdmin(playerId);
        if (npcId == null) {
            return ResponseEntity.badRequest().body("npcId is required");
        }
        return ResponseEntity.ok(adminService.getDialogueNodes(npcId));
    }

    @PostMapping("/dialogues")
    public ResponseEntity<?> createDialogueNode(
            @RequestParam String playerId,
            @RequestBody CreateDialogueNodeRequest request) {
        adminService.requireAdmin(playerId);
        if (request.npcId() == null) {
            return ResponseEntity.badRequest().body("npcId is required");
        }
        return ResponseEntity.ok(adminService.createDialogueNode(
                request.npcId(),
                request.text(),
                Boolean.TRUE.equals(request.isStart()),
                request.choices()));
    }

    @PostMapping("/dialogues/{nodeId}/start")
    public ResponseEntity<?> setStartNode(@PathVariable UUID nodeId, @RequestParam String playerId) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.setStartNode(nodeId));
    }

    @DeleteMapping("/dialogues/{nodeId}")
    public ResponseEntity<Void> deleteDialogueNode(@PathVariable UUID nodeId, @RequestParam String playerId) {
        adminService.requireAdmin(playerId);
        adminService.deleteDialogueNode(nodeId);
        return ResponseEntity.noContent().build();
    }

    // --- ITEMS ---

    @GetMapping("/items")
    public ResponseEntity<List<AdminItemDto>> getItems(@RequestParam String playerId) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.getAllItems());
    }

    @PostMapping("/items")
    public ResponseEntity<AdminItemDto> createItem(
            @RequestParam String playerId,
            @RequestBody CreateItemRequest request) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.createItem(
                request.code(),
                request.name(),
                request.type(),
                request.damage() == null ? 0 : request.damage(),
                request.attackRange() == null ? 0 : request.attackRange(),
                request.width() == null ? 1 : request.width(),
                request.height() == null ? 1 : request.height()));
    }

    /** Random item generator: random type (WEAPON/ARMOR/UTILITY), name and stats. */
    @PostMapping("/items/generate")
    public ResponseEntity<AdminItemDto> generateItem(@RequestParam String playerId) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.generateRandomItem());
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<Void> deleteItem(@PathVariable UUID itemId, @RequestParam String playerId) {
        adminService.requireAdmin(playerId);
        adminService.deleteItem(itemId);
        return ResponseEntity.noContent().build();
    }

    // --- ENEMY TYPES ---

    @GetMapping("/enemies")
    public ResponseEntity<List<AdminEnemyTypeDto>> getEnemyTypes(@RequestParam String playerId) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.getAllEnemyTypes());
    }

    @PostMapping("/enemies")
    public ResponseEntity<AdminEnemyTypeDto> createEnemyType(
            @RequestParam String playerId,
            @RequestBody CreateEnemyTypeRequest request) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.createEnemyType(request));
    }

    @PatchMapping("/enemies/{enemyId}")
    public ResponseEntity<AdminEnemyTypeDto> updateEnemyType(
            @PathVariable UUID enemyId,
            @RequestParam String playerId,
            @RequestBody UpdateEnemyTypeRequest request) {
        adminService.requireAdmin(playerId);
        return ResponseEntity.ok(adminService.updateEnemyType(enemyId, request));
    }

    @DeleteMapping("/enemies/{enemyId}")
    public ResponseEntity<Void> deleteEnemyType(@PathVariable UUID enemyId, @RequestParam String playerId) {
        adminService.requireAdmin(playerId);
        adminService.deleteEnemyType(enemyId);
        return ResponseEntity.noContent().build();
    }
}
