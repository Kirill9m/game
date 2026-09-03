package spring.backend.game.dto.QuestSystem;

import java.time.Instant;

public record QuestLogEntryDto(
        String message,
        Instant timestamp) {
}