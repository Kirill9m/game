package spring.backend.game.dto;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import spring.backend.game.service.AdminService;

/**
 * Container for admin panel request/response payloads.
 */
public final class AdminDtos {

    private AdminDtos() {
    }

    // --- RESPONSES ---

    public record AdminPlayerDto(
            String id,
            String username,
            String avatarUrl,
            String role,
            int level,
            int gold,
            int questPoints) {
    }

    public record AdminNpcDto(
            UUID id,
            String code,
            String name,
            int positionX,
            int positionY) {
    }

    public record AdminQuestDto(
            UUID id,
            String code,
            String title,
            int rewardExp,
            int rewardGold,
            String rewardItemCode,
            List<AdminNpcDto> requiredNpcs) {
    }

    public record AdminDialogueChoiceDto(
            UUID id,
            String text,
            UUID nextNodeId) {
    }

    public record AdminDialogueNodeDto(
            UUID id,
            UUID npcId,
            String text,
            boolean isStart,
            List<AdminDialogueChoiceDto> choices) {
    }

    public record AdminItemDto(
            UUID id,
            String code,
            String name,
            String type,
            int damage,
            int attackRange,
            int width,
            int height) {
    }

    // --- REQUESTS ---

    public record CreateNpcRequest(String code, String name, Integer positionX, Integer positionY) {
    }

    public record UpdateNpcRequest(String name, Integer positionX, Integer positionY) {
    }

    public record CreateQuestRequest(
            String code,
            String title,
            Integer rewardExp,
            Integer rewardGold,
            String rewardItemCode,
            Set<UUID> requiredNpcIds) {
    }

    public record UpdateQuestRequest(
            String title,
            Integer rewardExp,
            Integer rewardGold,
            String rewardItemCode,
            Set<UUID> requiredNpcIds) {
    }

    public record CreateDialogueNodeRequest(
            UUID npcId,
            String text,
            Boolean isStart,
            List<AdminService.DialogueChoiceRequest> choices) {
    }

    public record CreateItemRequest(
            String code,
            String name,
            String type,
            Integer damage,
            Integer attackRange,
            Integer width,
            Integer height) {
    }

    public record BootstrapAdminRequest(String playerId, String code) {
    }

    public record SetRoleRequest(String role) {
    }
}