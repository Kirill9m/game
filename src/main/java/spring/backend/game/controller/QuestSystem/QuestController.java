package spring.backend.game.controller.QuestSystem;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.QuestSystem.QuestProgressDto;
import spring.backend.game.service.QuestService;

@RestController
@RequestMapping("/api/quests")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.8.96:3000"})
public class QuestController {

    private final QuestService questService;

    // Взять квест (например, "TALK_TO_ALL")
    @PostMapping("/start")
    public ResponseEntity<QuestProgressDto> startQuest(
            @RequestParam String playerId,
            @RequestParam String questCode) {
        return ResponseEntity.ok(questService.startQuest(playerId, questCode));
    }
}