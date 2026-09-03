package spring.backend.game.dto.QuestSystem;

import java.util.List;
import java.util.UUID;

public record DialogueNodeDto(
        UUID id,
        String npcName,
        String text,
        List<DialogueChoiceDto> choices) {
}