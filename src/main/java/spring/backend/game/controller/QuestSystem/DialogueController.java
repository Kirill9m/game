package spring.backend.game.controller.QuestSystem;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
public class DialogueController {

    private final QuestService questService;

    // Start a dialogue with the NPC (returns the opening line and buttons)
    @GetMapping("/start/{npcId}")
    public ResponseEntity<DialogueNodeDto> startDialogue(
            @PathVariable UUID npcId,
            @RequestParam(required = false) String playerId) {

        // If the quest is finished — block further dialogue with the NPC
        if (playerId != null && questService.isNpcTalkBlocked(playerId, npcId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(questService.startDialogue(npcId));
    }

    // Choose a dialogue reply
    @PostMapping("/choice")
    public ResponseEntity<DialogueNodeDto> selectChoice(
            @RequestParam String playerId,
            @RequestParam UUID choiceId,
            @RequestParam(required = false) UUID activeQuestId) {

        DialogueNodeDto nextNode = questService.selectChoice(playerId, choiceId, activeQuestId);
        if (nextNode == null) {
            return ResponseEntity.noContent().build(); // 204 No Content -> dialogue finished
        }
        return ResponseEntity.ok(nextNode);
    }
}