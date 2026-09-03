package spring.backend.game.dto.QuestSystem;

import java.util.UUID;

/** A quest the player can accept (not started yet). */
public record AvailableQuestDto(
        UUID questId,
        String code,
        String title,
        int rewardGold,
        int rewardExp,
        int requiredNpcCount) {
}