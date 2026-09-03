package spring.backend.game.dto.QuestSystem;

import java.util.UUID;

public record DialogueChoiceDto(
        UUID id,
        String text,
        boolean endsDialogue) {
}