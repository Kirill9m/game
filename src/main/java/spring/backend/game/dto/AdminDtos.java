package spring.backend.game.dto;

import java.util.List;
import java.util.Set;
import java.util.UUID;

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
            int questPoints,
            List<AdminProficiencyDto> proficiencies) {
    }

    public record AdminNpcDto(
            UUID id,
            String code,
            String name,
            int positionX,
            int positionY,
            UUID locationId,
            Integer locationX,
            Integer locationY,
            UUID buildingId) {
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
            String weaponTypeCode,
            int damage,
            int attackRange,
            int width,
            int height,
            int defense,
            String equipmentSlot,
            int heal) {
    }

    public record AdminWeaponTypeDto(
            UUID id,
            String code,
            String name,
            int accuracyPerLevel,
            int maxAccuracy) {
    }

    public record AdminProficiencyDto(
            String weaponTypeCode,
            String weaponTypeName,
            int level) {
    }

    public record AdminEnemyTypeDto(
            UUID id,
            String code,
            String name,
            int maxHealth,
            int damage,
            int attackRange,
            int actionPoints,
            int movementRange,
            List<EnemyLootDropDto> lootDrops) {
    }

    /** One configured loot drop entry of an enemy type. */
    public record EnemyLootDropDto(
            String itemCode,
            Integer chance,
            Integer minQuantity,
            Integer maxQuantity) {
    }

    public record AdminWorldCellDto(
            Long id,
            int positionX,
            int positionY,
            boolean blocked,
            int radiation,
            int ambushChance,
            AdminEnemyTypeDto enemyType,
            List<AdminObstacleTypeDto> obstacleTypes) {
    }

    public record AdminGameMapDto(
            java.util.UUID id,
            String code,
            String name,
            String description,
            int centerX,
            int centerY,
            int radius,
            String itemCode) {
    }

    public record AdminObstacleTypeDto(
            UUID id,
            String code,
            String name,
            int maxHealth) {
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

    /** A single dialogue reply in a create-dialogue-node request. */
    public record DialogueChoiceRequest(String text, UUID nextNodeId) {
    }

    public record CreateDialogueNodeRequest(
            UUID npcId,
            String text,
            Boolean isStart,
            List<DialogueChoiceRequest> choices) {
    }

    public record CreateItemRequest(
            String code,
            String name,
            String type,
            String weaponTypeCode,
            Integer damage,
            Integer attackRange,
            Integer width,
            Integer height,
            Integer defense,
            String equipmentSlot,
            Integer heal) {
    }

    public record CreateWeaponTypeRequest(
            String code,
            String name,
            Integer accuracyPerLevel,
            Integer maxAccuracy) {
    }

    public record UpdateWeaponTypeRequest(
            String name,
            Integer accuracyPerLevel,
            Integer maxAccuracy) {
    }

    public record SetProficiencyRequest(String weaponTypeCode, Integer level) {
    }

    public record CreateEnemyTypeRequest(
            String code,
            String name,
            Integer maxHealth,
            Integer damage,
            Integer attackRange,
            Integer actionPoints,
            Integer movementRange,
            List<EnemyLootDropDto> lootDrops) {
    }

    public record UpdateEnemyTypeRequest(
            String name,
            Integer maxHealth,
            Integer damage,
            Integer attackRange,
            Integer actionPoints,
            Integer movementRange,
            List<EnemyLootDropDto> lootDrops) {
    }

    public record CreateObstacleTypeRequest(
            String code,
            String name,
            Integer maxHealth) {
    }

    public record UpdateObstacleTypeRequest(
            String name,
            Integer maxHealth) {
    }

    public record UpdatePlayerRequest(
            String username,
            Integer level,
            Integer gold,
            Integer health,
            Integer strength,
            Integer agility,
            Integer stamina,
            Integer energy,
            Integer positionX,
            Integer positionY) {
    }

    /** Give an item directly to a player's inventory (admin shortcut). */
    public record GiveItemRequest(
            String itemCode,
            Integer quantity) {
    }

    public record UpsertWorldCellRequest(
            Integer positionX,
            Integer positionY,
            Boolean blocked,
            Integer radiation,
            Integer ambushChance,
            UUID enemyTypeId,
            Set<UUID> obstacleTypeIds) {
    }

    public record CreateGameMapRequest(
            String code,
            String name,
            String description,
            Integer centerX,
            Integer centerY,
            Integer radius,
            String itemCode) {
    }

    public record UpdateGameMapRequest(
            String code,
            String name,
            String description,
            Integer centerX,
            Integer centerY,
            Integer radius,
            String itemCode) {
    }

    public record BootstrapAdminRequest(String playerId, String code) {
    }

    public record SetRoleRequest(String role) {
    }

    /** Update payload for the world safe zone (village circle). */
    public record UpdateWorldZoneRequest(
            String name,
            Integer centerX,
            Integer centerY,
            Integer radius) {
    }
}
