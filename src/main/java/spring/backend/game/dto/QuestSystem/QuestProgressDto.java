package spring.backend.game.dto.QuestSystem;

import java.util.List;
import java.util.UUID;

import spring.backend.game.entity.QuestSystem.QuestStatus;

public record QuestProgressDto(
        UUID questId,
        String questCode,
        String title,
        QuestStatus status,
        int talkedNpcsCount,
        int totalNpcsCount,
        boolean isCompleted,
        List<QuestLogEntryDto> logEntries) {
}