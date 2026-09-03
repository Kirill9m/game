package spring.backend.game.controller.QuestSystem;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.QuestSystem.DialogueNodeDto;
import spring.backend.game.service.QuestService;

@RestController
@RequestMapping("/api/dialogues")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.8.96:3000"})
public class DialogueController {

    private final QuestService questService;

    // Старт диалога с NPC (возвращает первую реплику и кнопки)
    @GetMapping("/start/{npcId}")
    public ResponseEntity<DialogueNodeDto> startDialogue(
            @PathVariable UUID npcId,
            @RequestParam(required = false) String playerId) {

        // Если квест завершён — блокируем диалог с NPC
        if (playerId != null && questService.isNpcTalkBlocked(playerId, npcId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(questService.startDialogue(npcId));
    }

    // Выбор ответа в диалоге
    @PostMapping("/choice")
    public ResponseEntity<DialogueNodeDto> selectChoice(
            @RequestParam String playerId,
            @RequestParam UUID choiceId,
            @RequestParam(required = false) UUID activeQuestId) {

        DialogueNodeDto nextNode = questService.selectChoice(playerId, choiceId, activeQuestId);
        if (nextNode == null) {
            return ResponseEntity.noContent().build(); // 204 No Content -> Диалог окончен
        }
        return ResponseEntity.ok(nextNode);
    }
}