package spring.backend.game.controller.QuestSystem;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.QuestSystem.AvailableQuestDto;
import spring.backend.game.dto.QuestSystem.QuestProgressDto;
import spring.backend.game.service.QuestService;

@RestController
@RequestMapping("/api/quests")
@RequiredArgsConstructor
public class QuestController {

    private final QuestService questService;

    /** Взять квест */
    @PostMapping("/start")
    public ResponseEntity<QuestProgressDto> startQuest(
            @RequestParam String playerId,
            @RequestParam String questCode) {
        return ResponseEntity.ok(questService.startQuest(playerId, questCode));
    }

    /** Список всех квестов игрока с прогрессом */
    @GetMapping("/progress")
    public ResponseEntity<List<QuestProgressDto>> getQuestProgress(@RequestParam String playerId) {
        return ResponseEntity.ok(questService.getPlayerQuests(playerId));
    }

    /** Quests the player can accept (not started yet) */
    @GetMapping("/available")
    public ResponseEntity<List<AvailableQuestDto>> getAvailableQuests(@RequestParam String playerId) {
        return ResponseEntity.ok(questService.getAvailableQuests(playerId));
    }

    /** Получить награду за завершённый квест */
    @PostMapping("/claim")
    public ResponseEntity<QuestProgressDto> claimReward(
            @RequestParam String playerId,
            @RequestParam UUID playerQuestId) {
        return ResponseEntity.ok(questService.claimReward(playerId, playerQuestId));
    }
}