package spring.backend.game.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import spring.backend.game.config.AdminProperties;
import spring.backend.game.dto.AdminDtos;
import spring.backend.game.entity.CombatSessionEntity;
import spring.backend.game.entity.EnemyLootDrop;
import spring.backend.game.entity.EnemyTypeEntity;
import spring.backend.game.entity.ItemEntity;
import spring.backend.game.entity.ObstacleTypeEntity;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.entity.PlayerInventoryEntity;
import spring.backend.game.entity.PlayerWeaponProficiencyEntity;
import spring.backend.game.entity.WeaponTypeEntity;
import spring.backend.game.entity.QuestSystem.DialogueChoiceEntity;
import spring.backend.game.entity.QuestSystem.DialogueNodeEntity;
import spring.backend.game.entity.QuestSystem.NpcEntity;
import spring.backend.game.entity.QuestSystem.PlayerQuestEntity;
import spring.backend.game.entity.QuestSystem.QuestEntity;
import spring.backend.game.entity.QuestSystem.QuestLogEntryEntity;
import spring.backend.game.repository.CombatRepository;
import spring.backend.game.repository.EnemyTypeRepository;
import spring.backend.game.repository.ItemRepository;
import spring.backend.game.repository.ObstacleTypeRepository;
import spring.backend.game.repository.PlayerInventoryRepository;
import spring.backend.game.repository.PlayerRepository;
import spring.backend.game.repository.QuestSystem.DialogueChoiceRepository;
import spring.backend.game.repository.QuestSystem.DialogueNodeRepository;
import spring.backend.game.repository.QuestSystem.NpcRepository;
import spring.backend.game.repository.QuestSystem.PlayerQuestRepository;
import spring.backend.game.repository.QuestSystem.QuestLogEntryRepository;
import spring.backend.game.repository.QuestSystem.QuestRepository;
import spring.backend.game.repository.WeaponProficiencyRepository;
import spring.backend.game.repository.WeaponTypeRepository;
import spring.backend.game.repository.WorldCellRepository;
import spring.backend.game.repository.WorldLootRepository;

/**
 * Admin-only service: manages players/roles, NPCs, quests (including a random
 * quest generator), dialogue trees and items. Every admin controller endpoint
 * must verify the caller's role via {@link #requireAdmin(String)}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private static final List<String> QUEST_TITLES = List.of(
            "Rumors in the Village", "The Missing Shipment", "Wolves at the Gates",
            "The Old Lighthouse", "Whispers from the Well", "A Merchant's Plea",
            "The Blacksmith's Debt", "Shadows in the Forest", "The Lost Scout",
            "Night Watch");
    private static final List<String> QUEST_OBJECTIVES = List.of(
            "Gather information from the locals",
            "Deliver a sealed letter",
            "Scout the old road",
            "Recover the lost cargo",
            "Find the missing villager",
            "Inspect the broken cart",
            "Warn the outposts",
            "Search the ruins");
    private static final List<String> NPC_DIALOGUE_OPENINGS = List.of(
            "Hello there, traveler. What brings you to these parts?",
            "Ah, a new face in the village. How can I help you?",
            "Good day! Care to lend an old friend a hand?",
            "You look like someone who gets things done...");
    private static final List<String> NPC_DIALOGUE_CLOSINGS = List.of(
            "Thank you! Come back when the job is done.",
            "I'll be waiting here. Good luck out there.",
            "May the road treat you kindly, friend.",
            "Be careful. It's dangerous beyond the safe zone.");
    private static final List<String> RANDOM_NPC_NAMES = List.of(
            "Old Harold", "Wandering Trader", "Herbalist Mira", "Watch Captain",
            "Fisherman Finn", "Tavern Keeper", "Blacksmith's Apprentice", "Village Doctor");

    /** Name pools for the random item generator. */
    private static final List<String> WEAPON_PREFIXES = List.of(
            "Rusty", "Iron", "Steel", "Silver", "Enchanted", "Cursed", "Dragonbone", "Runed");
    private static final List<String> WEAPON_NAMES = List.of(
            "Sword", "Axe", "Dagger", "Spear", "Mace", "Halberd", "Scimitar", "Warhammer");
    private static final List<String> ARMOR_NAMES = List.of(
            "Vest", "Tunic", "Cuirass", "Brigandine", "Cloak", "Gauntlets", "Boots", "Shield");
    private static final List<String> UTILITY_NAMES = List.of(
            "Health Potion", "Lockpick", "Torch", "Rope", "Scroll", "Amulet", "Talisman", "Whetstone");
    private static final List<String> CONSUMABLE_NAMES = List.of(
            "Medkit", "Bandage", "Stimpack", "Healing Salve", "Herbal Remedy", "Antidote");
    private static final List<String> ITEM_PREFIXES = List.of(
            "Simple", "Fine", "Rare", "Ancient", "Traveler's", "Hunter's", "Wanderer's", "Mystic");

    /** Valid armor equipment slots, in the order used by the random generator. */
    private static final List<String> ARMOR_SLOTS = List.of("HELMET", "BODY", "LEGS", "FEET");

    /** Name pools for the random enemy generator. */
    private static final List<String> ENEMY_NAMES = List.of(
            "Goblin", "Wolf", "Bandit", "Skeleton", "Orc Brute", "Swamp Slime",
            "Cave Spider", "Wraith", "Marauder", "Imp", "Scavenger", "Beast");
    private static final List<String> ENEMY_TITLES = List.of(
            "Scout", "Warrior", "Stalker", "Champion", "Elder", "Runts",
            "Alpha", "Rogue", "Brute", "Hunter", "Seer", "Fiend");

    private final AdminProperties adminProperties;
    private final PlayerRepository playerRepository;
    private final NpcRepository npcRepository;
    private final QuestRepository questRepository;
    private final DialogueNodeRepository dialogueNodeRepository;
    private final DialogueChoiceRepository dialogueChoiceRepository;
    private final ItemRepository itemRepository;
    private final PlayerQuestRepository playerQuestRepository;
    private final QuestLogEntryRepository questLogEntryRepository;
    private final EnemyTypeRepository enemyTypeRepository;
    private final PlayerInventoryRepository playerInventoryRepository;
    private final CombatRepository combatRepository;
    private final WeaponTypeRepository weaponTypeRepository;
    private final WeaponProficiencyRepository weaponProficiencyRepository;
    private final ObstacleTypeRepository obstacleTypeRepository;
    private final WorldCellRepository worldCellRepository;
    private final WorldCellService worldCellService;
    private final WorldLootRepository worldLootRepository;
    private final InventoryService inventoryService;
    private final Random random = new Random();

    // --- ACCESS CONTROL ---

    /** Throws when the given player is not an admin. */
    public void requireAdmin(String playerId) {
        if (playerId == null || playerId.isBlank()) {
            throw new IllegalArgumentException("playerId is required");
        }
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + playerId));
        if (!PlayerEntity.ROLE_ADMIN.equals(player.getRole())) {
            throw new AdminAccessDeniedException("Admin access required");
        }
    }

    // --- ROLE MANAGEMENT ---

    /** Promotes every configured admin player id to the ADMIN role. */
    @Transactional
    public void promoteConfiguredAdmins() {
        for (String id : adminProperties.getAdminPlayerIds()) {
            playerRepository.findById(id).ifPresent(player -> {
                if (!PlayerEntity.ROLE_ADMIN.equals(player.getRole())) {
                    player.setRole(PlayerEntity.ROLE_ADMIN);
                    playerRepository.save(player);
                    log.info("Player '{}' promoted to ADMIN from configuration", id);
                }
            });
        }
    }

    /** Bootstrap promotion using the secret code (for the very first admin). */
    @Transactional
    public AdminDtos.AdminPlayerDto bootstrapAdmin(String playerId, String code) {
        if (code == null || code.isBlank() || !code.equals(adminProperties.getBootstrapCode())) {
            throw new IllegalArgumentException("Invalid admin bootstrap code");
        }
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + playerId));
        player.setRole(PlayerEntity.ROLE_ADMIN);
        playerRepository.save(player);
        log.info("Player '{}' promoted to ADMIN via bootstrap code", playerId);
        return toPlayerDto(player);
    }

    @Transactional
    public AdminDtos.AdminPlayerDto setPlayerRole(String targetPlayerId, String role) {
        PlayerEntity player = playerRepository.findById(targetPlayerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + targetPlayerId));
        String normalized = role == null ? "" : role.trim().toUpperCase(Locale.ROOT);
        if (!PlayerEntity.ROLE_ADMIN.equals(normalized) && !PlayerEntity.ROLE_PLAYER.equals(normalized)) {
            throw new IllegalArgumentException("Role must be ADMIN or PLAYER");
        }
        player.setRole(normalized);
        return toPlayerDto(playerRepository.save(player));
    }

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminPlayerDto> getAllPlayers() {
        return playerRepository.findAll().stream()
                .map(this::toPlayerDto)
                .toList();
    }

    /** Update player stats/profile. Only provided (non-null) fields are applied. */
    @Transactional
    public AdminDtos.AdminPlayerDto updatePlayer(String targetPlayerId, AdminDtos.UpdatePlayerRequest request) {
        PlayerEntity player = playerRepository.findById(targetPlayerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + targetPlayerId));
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (request.username() != null) {
            String name = request.username().trim();
            if (name.isEmpty()) {
                throw new IllegalArgumentException("Username cannot be empty");
            }
            player.setUsername(name);
        }
        if (request.level() != null) {
            player.setLevel(Math.max(1, request.level()));
        }
        if (request.gold() != null) {
            player.setGold(Math.max(0, request.gold()));
        }
        if (request.health() != null) {
            player.setHealth(Math.max(0, request.health()));
        }
        if (request.strength() != null) {
            player.setStrength(Math.max(0, request.strength()));
        }
        if (request.agility() != null) {
            player.setAgility(Math.max(0, request.agility()));
        }
        if (request.stamina() != null) {
            player.setStamina(Math.max(0, request.stamina()));
        }
        if (request.energy() != null) {
            player.setEnergy(Math.max(0, request.energy()));
        }
        if (request.positionX() != null) {
            player.setPositionX(request.positionX());
        }
        if (request.positionY() != null) {
            player.setPositionY(request.positionY());
        }
        log.info("Admin updated player {}", targetPlayerId);
        return toPlayerDto(playerRepository.save(player));
    }

    /** Delete a player together with inventory, quest progress and combat history. */
    @Transactional
    public void deletePlayer(String targetPlayerId) {
        PlayerEntity player = playerRepository.findById(targetPlayerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + targetPlayerId));

        // Inventory
        playerInventoryRepository.deleteAll(playerInventoryRepository.findByPlayerIdOrderByItemNameAsc(targetPlayerId));

        // Dropped world loot
        worldLootRepository.deleteByOwnerId(targetPlayerId);

        // Quest progress (and log entries)
        for (PlayerQuestEntity playerQuest : playerQuestRepository.findByPlayerId(targetPlayerId)) {
            List<QuestLogEntryEntity> logs =
                    questLogEntryRepository.findByPlayerQuestIdOrderByTimestampAsc(playerQuest.getId());
            questLogEntryRepository.deleteAll(logs);
            playerQuestRepository.delete(playerQuest);
        }

        // Combat history
        combatRepository.deleteAll(combatRepository.findByPlayer1IdOrPlayer2Id(targetPlayerId, targetPlayerId));

        playerRepository.delete(player);
        log.info("Admin deleted player {}", targetPlayerId);
    }

    /**
     * Gives an item directly to a player's inventory. Stacks with an existing
     * copy of the item or places it in the first free grid slot; throws when the
     * inventory has no room.
     */
    @Transactional
    public AdminDtos.AdminItemDto giveItemToPlayer(String targetPlayerId, String itemCode, Integer quantity) {
        String normalizedCode = requireNonBlank(itemCode, "Item code is required")
                .trim().toUpperCase(Locale.ROOT);
        ItemEntity item = itemRepository.findByCodeIgnoreCase(normalizedCode)
                .orElseThrow(() -> new IllegalArgumentException("Item not found: " + normalizedCode));
        int qty = Math.max(1, quantity == null ? 1 : quantity);
        inventoryService.addItem(targetPlayerId, item.getCode(), qty);
        log.info("Admin gave {}x '{}' to player {}", qty, item.getCode(), targetPlayerId);
        return toItemDto(item);
    }

    // --- NPC MANAGEMENT ---

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminNpcDto> getAllNpcs() {
        return npcRepository.findAll().stream()
                .map(this::toNpcDto)
                .toList();
    }

    @Transactional
    public AdminDtos.AdminNpcDto createNpc(String code, String name, int positionX, int positionY) {
        String normalizedCode = requireNonBlank(code, "NPC code is required").trim().toUpperCase(Locale.ROOT);
        if (npcRepository.findByCodeIgnoreCase(normalizedCode).isPresent()) {
            throw new IllegalArgumentException("NPC code already exists: " + normalizedCode);
        }
        NpcEntity npc = npcRepository.save(NpcEntity.builder()
                .code(normalizedCode)
                .name(requireNonBlank(name, "NPC name is required").trim())
                .positionX(positionX)
                .positionY(positionY)
                .build());
        return toNpcDto(npc);
    }

    @Transactional
    public AdminDtos.AdminNpcDto updateNpc(UUID npcId, String name, Integer positionX, Integer positionY) {
        NpcEntity npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new EntityNotFoundException("NPC not found: " + npcId));
        if (name != null && !name.isBlank()) {
            npc.setName(name.trim());
        }
        if (positionX != null) {
            npc.setPositionX(positionX);
        }
        if (positionY != null) {
            npc.setPositionY(positionY);
        }
        return toNpcDto(npcRepository.save(npc));
    }

    @Transactional
    public void deleteNpc(UUID npcId) {
        NpcEntity npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new EntityNotFoundException("NPC not found: " + npcId));

        // Detach the NPC from all quests
        for (QuestEntity quest : questRepository.findAll()) {
            if (quest.getRequiredNpcs() != null
                    && quest.getRequiredNpcs().removeIf(n -> n.getId().equals(npcId))) {
                questRepository.save(quest);
            }
        }

        // Detach the NPC from player quest progress
        for (PlayerQuestEntity playerQuest : playerQuestRepository.findAll()) {
            if (playerQuest.getTalkedNpcs() != null
                    && playerQuest.getTalkedNpcs().removeIf(n -> n.getId().equals(npcId))) {
                playerQuestRepository.save(playerQuest);
            }
        }

        // Detach choices pointing to the NPC's dialogue nodes, then delete the nodes
        for (DialogueNodeEntity node : dialogueNodeRepository.findByNpcId(npcId)) {
            for (DialogueChoiceEntity inbound : dialogueChoiceRepository.findByNextNodeId(node.getId())) {
                inbound.setNextNode(null);
                dialogueChoiceRepository.save(inbound);
            }
            dialogueNodeRepository.delete(node);
        }

        npcRepository.delete(npc);
        log.info("Admin deleted NPC {}", npc.getCode());
    }

    // --- QUEST MANAGEMENT ---

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminQuestDto> getAllQuests() {
        return questRepository.findAll().stream()
                .map(this::toQuestDto)
                .toList();
    }

    @Transactional
    public AdminDtos.AdminQuestDto createQuest(String code, String title, int rewardExp, int rewardGold,
                                               String rewardItemCode, Set<UUID> requiredNpcIds) {
        String normalizedCode = requireNonBlank(code, "Quest code is required").trim()
                .toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_]", "_");
        if (questRepository.findByCode(normalizedCode).isPresent()) {
            throw new IllegalArgumentException("Quest code already exists: " + normalizedCode);
        }
        Set<NpcEntity> requiredNpcs = resolveNpcs(requiredNpcIds);

        QuestEntity quest = questRepository.save(QuestEntity.builder()
                .code(normalizedCode)
                .title(requireNonBlank(title, "Quest title is required").trim())
                .rewardExp(Math.max(0, rewardExp))
                .rewardGold(Math.max(0, rewardGold))
                .rewardItemCode(rewardItemCode == null || rewardItemCode.isBlank() ? "RANDOM" : rewardItemCode.trim())
                .requiredNpcs(requiredNpcs)
                .build());
        return toQuestDto(quest);
    }

    @Transactional
    public AdminDtos.AdminQuestDto updateQuest(UUID questId, String title, Integer rewardExp, Integer rewardGold,
                                               String rewardItemCode, Set<UUID> requiredNpcIds) {
        QuestEntity quest = questRepository.findById(questId)
                .orElseThrow(() -> new EntityNotFoundException("Quest not found: " + questId));
        if (title != null && !title.isBlank()) {
            quest.setTitle(title.trim());
        }
        if (rewardExp != null) {
            quest.setRewardExp(Math.max(0, rewardExp));
        }
        if (rewardGold != null) {
            quest.setRewardGold(Math.max(0, rewardGold));
        }
        if (rewardItemCode != null) {
            quest.setRewardItemCode(rewardItemCode.isBlank() ? "RANDOM" : rewardItemCode.trim());
        }
        if (requiredNpcIds != null) {
            quest.setRequiredNpcs(resolveNpcs(requiredNpcIds));
        }
        return toQuestDto(questRepository.save(quest));
    }

    @Transactional
    public void deleteQuest(UUID questId) {
        QuestEntity quest = questRepository.findById(questId)
                .orElseThrow(() -> new EntityNotFoundException("Quest not found: " + questId));

        // Remove player progress (and its log entries) for this quest
        for (PlayerQuestEntity playerQuest : playerQuestRepository.findByQuestId(questId)) {
            List<QuestLogEntryEntity> logs =
                    questLogEntryRepository.findByPlayerQuestIdOrderByTimestampAsc(playerQuest.getId());
            questLogEntryRepository.deleteAll(logs);
            playerQuestRepository.delete(playerQuest);
        }

        questRepository.delete(quest);
        log.info("Admin deleted quest {}", quest.getCode());
    }

    /**
     * Quest generator: creates a quest with a random title, random rewards and
     * a random set of required NPCs, then seeds a simple starter dialogue for
     * every involved NPC that has none yet. Optionally creates a brand new NPC
     * for the quest.
     */
    @Transactional
    public AdminDtos.AdminQuestDto generateRandomQuest(boolean createNewNpc) {
        if (npcRepository.count() == 0) {
            throw new IllegalStateException("Create at least one NPC before generating quests");
        }

        NpcEntity newNpc = createNewNpc ? createRandomNpc() : null;

        List<NpcEntity> pool = new ArrayList<>(npcRepository.findAll());
        int requiredCount = Math.min(1 + random.nextInt(Math.min(3, pool.size())), pool.size());
        Set<NpcEntity> requiredNpcs = new HashSet<>();
        if (newNpc != null) {
            requiredNpcs.add(newNpc);
        }
        while (requiredNpcs.size() < requiredCount) {
            requiredNpcs.add(pool.get(random.nextInt(pool.size())));
        }

        String title = QUEST_TITLES.get(random.nextInt(QUEST_TITLES.size()))
                + " #" + (random.nextInt(90) + 10);
        String objective = QUEST_OBJECTIVES.get(random.nextInt(QUEST_OBJECTIVES.size()));
        String code = "QUEST_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        int rewardExp = 30 + random.nextInt(8) * 10; // 30..100
        int rewardGold = 20 + random.nextInt(9) * 10; // 20..100

        AdminDtos.AdminQuestDto quest = createQuest(code, title, rewardExp, rewardGold, "RANDOM",
                requiredNpcs.stream().map(NpcEntity::getId).collect(Collectors.toSet()));

        // Seed a simple starter dialogue for each involved NPC that has none yet
        for (NpcEntity required : requiredNpcs) {
            if (dialogueNodeRepository.findByNpcIdAndIsStartTrue(required.getId()).isEmpty()) {
                String opening = NPC_DIALOGUE_OPENINGS.get(random.nextInt(NPC_DIALOGUE_OPENINGS.size()));
                String closing = NPC_DIALOGUE_CLOSINGS.get(random.nextInt(NPC_DIALOGUE_CLOSINGS.size()));
                createDialogueNode(required.getId(), objective + ". " + opening, true, List.of(
                        new DialogueChoiceRequest("I'm on my way.", null),
                        new DialogueChoiceRequest("Tell me more.", null)));
                // The second choice ends the dialogue too; keep it simple for generated content
                log.debug("Seeded starter dialogue for NPC {}", required.getCode());
            }
        }

        log.info("Generated random quest '{}' ({}) with {} required NPCs", title, code, requiredNpcs.size());
        return quest;
    }

    private NpcEntity createRandomNpc() {
        String name = RANDOM_NPC_NAMES.get(random.nextInt(RANDOM_NPC_NAMES.size()))
                + " " + (npcRepository.count() + 1);
        String code = "NPC_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        AdminDtos.AdminNpcDto created = createNpc(code, name, random.nextInt(7) - 3, random.nextInt(7) - 3);
        return npcRepository.findById(created.id())
                .orElseThrow(() -> new EntityNotFoundException("NPC not found after creation: " + code));
    }

    private Set<NpcEntity> resolveNpcs(Set<UUID> requiredNpcIds) {
        if (requiredNpcIds == null || requiredNpcIds.isEmpty()) {
            throw new IllegalArgumentException("Select at least one required NPC");
        }
        Set<NpcEntity> npcs = new HashSet<>();
        for (UUID id : requiredNpcIds) {
            npcs.add(npcRepository.findById(id)
                    .orElseThrow(() -> new EntityNotFoundException("NPC not found: " + id)));
        }
        return npcs;
    }

    // --- DIALOGUE MANAGEMENT ---

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminDialogueNodeDto> getDialogueNodes(UUID npcId) {
        if (npcId == null) {
            return List.of();
        }
        return dialogueNodeRepository.findByNpcId(npcId).stream()
                .map(this::toDialogueNodeDto)
                .toList();
    }

    @Transactional
    public AdminDtos.AdminDialogueNodeDto createDialogueNode(UUID npcId, String text, boolean isStart,
                                                             List<DialogueChoiceRequest> choices) {
        NpcEntity npc = npcRepository.findById(npcId)
                .orElseThrow(() -> new EntityNotFoundException("NPC not found: " + npcId));

        if (isStart) {
            // Only one start node per NPC: clear the previous start flag
            dialogueNodeRepository.findByNpcIdAndIsStartTrue(npcId).ifPresent(previous -> {
                previous.setStart(false);
                dialogueNodeRepository.save(previous);
            });
        }

        DialogueNodeEntity node = DialogueNodeEntity.builder()
                .npc(npc)
                .text(requireNonBlank(text, "Dialogue text is required").trim())
                .isStart(isStart)
                .choices(new ArrayList<>())
                .build();
        node = dialogueNodeRepository.save(node);

        if (choices != null) {
            for (DialogueChoiceRequest choiceRequest : choices) {
                if (choiceRequest.text() == null || choiceRequest.text().isBlank()) {
                    continue;
                }
                DialogueChoiceEntity choice = DialogueChoiceEntity.builder()
                        .node(node)
                        .text(choiceRequest.text().trim())
                        .build();
                if (choiceRequest.nextNodeId() != null) {
                    choice.setNextNode(dialogueNodeRepository.findById(choiceRequest.nextNodeId())
                            .orElseThrow(() -> new EntityNotFoundException(
                                    "Dialogue node not found: " + choiceRequest.nextNodeId())));
                }
                dialogueChoiceRepository.save(choice);
                node.getChoices().add(choice);
            }
            node = dialogueNodeRepository.save(node);
        }
        return toDialogueNodeDto(node);
    }

    @Transactional
    public AdminDtos.AdminDialogueNodeDto setStartNode(UUID nodeId) {
        DialogueNodeEntity node = dialogueNodeRepository.findById(nodeId)
                .orElseThrow(() -> new EntityNotFoundException("Dialogue node not found: " + nodeId));
        for (DialogueNodeEntity other : dialogueNodeRepository.findByNpcId(node.getNpc().getId())) {
            other.setStart(false);
        }
        node.setStart(true);
        return toDialogueNodeDto(dialogueNodeRepository.save(node));
    }

    @Transactional
    public void deleteDialogueNode(UUID nodeId) {
        DialogueNodeEntity node = dialogueNodeRepository.findById(nodeId)
                .orElseThrow(() -> new EntityNotFoundException("Dialogue node not found: " + nodeId));

        // Detach choices in other nodes that lead to this node
        for (DialogueChoiceEntity inbound : dialogueChoiceRepository.findByNextNodeId(nodeId)) {
            inbound.setNextNode(null);
            dialogueChoiceRepository.save(inbound);
        }

        dialogueNodeRepository.delete(node);
    }

    // --- ITEM MANAGEMENT ---

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminItemDto> getAllItems() {
        return itemRepository.findAll().stream()
                .map(this::toItemDto)
                .toList();
    }

    @Transactional
    public AdminDtos.AdminItemDto createItem(String code, String name, String type, String weaponTypeCode,
                                             int damage, int attackRange,
                                             int width, int height, int defense, String equipmentSlot, int heal) {
        String normalizedCode = requireNonBlank(code, "Item code is required").trim().toUpperCase(Locale.ROOT);
        if (itemRepository.findByCodeIgnoreCase(normalizedCode).isPresent()) {
            throw new IllegalArgumentException("Item code already exists: " + normalizedCode);
        }
        String normalizedType = type == null || type.isBlank() ? "UTILITY" : type.trim().toUpperCase(Locale.ROOT);
        String normalizedSlot = equipmentSlot == null || equipmentSlot.isBlank()
                ? null
                : equipmentSlot.trim().toUpperCase(Locale.ROOT);
        if ("ARMOR".equals(normalizedType)) {
            if (normalizedSlot == null || !ARMOR_SLOTS.contains(normalizedSlot)) {
                throw new IllegalArgumentException(
                        "ARMOR items require an equipmentSlot of " + String.join(", ", ARMOR_SLOTS));
            }
        } else {
            normalizedSlot = null;
        }
        int normalizedHeal = "CONSUMABLE".equals(normalizedType) ? Math.max(0, heal) : 0;
        if ("CONSUMABLE".equals(normalizedType) && normalizedHeal <= 0) {
            throw new IllegalArgumentException("CONSUMABLE items require a heal amount greater than 0");
        }
        ItemEntity item = itemRepository.save(ItemEntity.builder()
                .code(normalizedCode)
                .name(requireNonBlank(name, "Item name is required").trim())
                .type(normalizedType)
                .weaponTypeCode(normalizeWeaponTypeCode(weaponTypeCode))
                .damage(Math.max(0, damage))
                .attackRange(Math.max(0, attackRange))
                .width(Math.max(1, width))
                .height(Math.max(1, height))
                .defense("ARMOR".equals(normalizedType) ? Math.max(0, defense) : 0)
                .equipmentSlot(normalizedSlot)
                .heal(normalizedHeal)
                .build());
        return toItemDto(item);
    }

    /**
     * Item generator: creates an item with a random name, type and stats.
     * Types: WEAPON (damage + short range), ARMOR (defense + equipment slot),
     * CONSUMABLE (heals health), UTILITY.
     */
    @Transactional
    public AdminDtos.AdminItemDto generateRandomItem() {
        String type = switch (random.nextInt(4)) {
            case 0 -> "WEAPON";
            case 1 -> "ARMOR";
            case 2 -> "CONSUMABLE";
            default -> "UTILITY";
        };
        String name;
        int damage = 0;
        int attackRange = 0;
        int width = 1;
        int height = 1;
        int defense = 0;
        int heal = 0;
        String equipmentSlot = null;
        switch (type) {
            case "WEAPON" -> {
                name = WEAPON_PREFIXES.get(random.nextInt(WEAPON_PREFIXES.size())) + " "
                        + WEAPON_NAMES.get(random.nextInt(WEAPON_NAMES.size()));
                damage = 3 + random.nextInt(13); // 3..15
                attackRange = 1 + random.nextInt(3); // 1..3
            }
            case "ARMOR" -> {
                name = ITEM_PREFIXES.get(random.nextInt(ITEM_PREFIXES.size())) + " "
                        + ARMOR_NAMES.get(random.nextInt(ARMOR_NAMES.size()));
                equipmentSlot = ARMOR_SLOTS.get(random.nextInt(ARMOR_SLOTS.size()));
                defense = 1 + random.nextInt(5); // 1..5 damage reduction
            }
            case "CONSUMABLE" -> {
                name = ITEM_PREFIXES.get(random.nextInt(ITEM_PREFIXES.size())) + " "
                        + CONSUMABLE_NAMES.get(random.nextInt(CONSUMABLE_NAMES.size()));
                heal = 15 + random.nextInt(36); // 15..50 health restored
            }
            default -> {
                name = ITEM_PREFIXES.get(random.nextInt(ITEM_PREFIXES.size())) + " "
                        + UTILITY_NAMES.get(random.nextInt(UTILITY_NAMES.size()));
                // Utility items occasionally occupy a 2x1 slot
                if (random.nextInt(4) == 0) {
                    width = 2;
                }
            }
        }
        String code = "ITEM_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        String weaponTypeCode = "WEAPON".equals(type) ? randomWeaponTypeCode() : null;
        AdminDtos.AdminItemDto created = createItem(code, name, type, weaponTypeCode, damage, attackRange, width, height, defense, equipmentSlot, heal);
        log.info("Generated random item '{}' ({}, {})", created.name(), created.code(), type);
        return created;
    }

    private String randomWeaponTypeCode() {
        List<WeaponTypeEntity> weaponTypes = weaponTypeRepository.findAll();
        return weaponTypes.isEmpty() ? null : weaponTypes.get(random.nextInt(weaponTypes.size())).getCode();
    }

    // --- WEAPON TYPE MANAGEMENT ---

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminWeaponTypeDto> getAllWeaponTypes() {
        return weaponTypeRepository.findAllByOrderByNameAsc().stream()
                .map(this::toWeaponTypeDto)
                .toList();
    }

    @Transactional
    public AdminDtos.AdminWeaponTypeDto createWeaponType(String code, String name, Integer accuracyPerLevel, Integer maxAccuracy) {
        String normalizedCode = requireNonBlank(code, "Weapon type code is required").trim().toUpperCase(Locale.ROOT);
        if (weaponTypeRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new IllegalArgumentException("Weapon type code already exists: " + normalizedCode);
        }
        WeaponTypeEntity weaponType = weaponTypeRepository.save(WeaponTypeEntity.builder()
                .code(normalizedCode)
                .name(requireNonBlank(name, "Weapon type name is required").trim())
                .accuracyPerLevel(Math.max(0, accuracyPerLevel == null ? 5 : accuracyPerLevel))
                .maxAccuracy(Math.max(0, maxAccuracy == null ? 25 : maxAccuracy))
                .build());
        log.info("Admin created weapon type '{}' ({})", weaponType.getName(), weaponType.getCode());
        return toWeaponTypeDto(weaponType);
    }

    @Transactional
    public AdminDtos.AdminWeaponTypeDto updateWeaponType(UUID weaponTypeId, String name, Integer accuracyPerLevel, Integer maxAccuracy) {
        WeaponTypeEntity weaponType = weaponTypeRepository.findById(weaponTypeId)
                .orElseThrow(() -> new EntityNotFoundException("Weapon type not found: " + weaponTypeId));
        if (name != null && !name.isBlank()) {
            weaponType.setName(name.trim());
        }
        if (accuracyPerLevel != null) {
            weaponType.setAccuracyPerLevel(Math.max(0, accuracyPerLevel));
        }
        if (maxAccuracy != null) {
            weaponType.setMaxAccuracy(Math.max(0, maxAccuracy));
        }
        weaponTypeRepository.save(weaponType);
        log.info("Admin updated weapon type '{}' ({})", weaponType.getName(), weaponType.getCode());
        return toWeaponTypeDto(weaponType);
    }

    @Transactional
    public void deleteWeaponType(UUID weaponTypeId) {
        WeaponTypeEntity weaponType = weaponTypeRepository.findById(weaponTypeId)
                .orElseThrow(() -> new EntityNotFoundException("Weapon type not found: " + weaponTypeId));
        // Remove related proficiencies and clear the reference on items
        weaponProficiencyRepository.deleteAll(weaponProficiencyRepository.findByWeaponTypeCodeIgnoreCase(weaponType.getCode()));
        itemRepository.findAll().forEach(item -> {
            if (weaponType.getCode().equalsIgnoreCase(item.getWeaponTypeCode())) {
                item.setWeaponTypeCode(null);
            }
        });
        weaponTypeRepository.delete(weaponType);
        log.info("Admin deleted weapon type '{}'", weaponType.getCode());
    }

    // --- OBSTACLE TYPES (destructible combat obstacles) ---

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminObstacleTypeDto> getAllObstacleTypes() {
        return obstacleTypeRepository.findAllByOrderByNameAsc().stream()
                .map(this::toObstacleTypeDto)
                .toList();
    }

    @Transactional
    public AdminDtos.AdminObstacleTypeDto createObstacleType(String code, String name, Integer maxHealth) {
        String normalizedCode = requireNonBlank(code, "Obstacle type code is required").trim().toUpperCase(Locale.ROOT);
        if (obstacleTypeRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new IllegalArgumentException("Obstacle type code already exists: " + normalizedCode);
        }
        ObstacleTypeEntity type = obstacleTypeRepository.save(ObstacleTypeEntity.builder()
                .code(normalizedCode)
                .name(requireNonBlank(name, "Obstacle type name is required").trim())
                .maxHealth(Math.max(1, maxHealth == null ? 30 : maxHealth))
                .build());
        log.info("Admin created obstacle type '{}' ({}, {} HP)", type.getName(), type.getCode(), type.getMaxHealth());
        return toObstacleTypeDto(type);
    }

    @Transactional
    public AdminDtos.AdminObstacleTypeDto updateObstacleType(UUID obstacleTypeId, String name, Integer maxHealth) {
        ObstacleTypeEntity type = obstacleTypeRepository.findById(obstacleTypeId)
                .orElseThrow(() -> new EntityNotFoundException("Obstacle type not found: " + obstacleTypeId));
        if (name != null && !name.isBlank()) {
            type.setName(name.trim());
        }
        if (maxHealth != null) {
            type.setMaxHealth(Math.max(1, maxHealth));
        }
        obstacleTypeRepository.save(type);
        log.info("Admin updated obstacle type '{}' ({})", type.getName(), type.getCode());
        return toObstacleTypeDto(type);
    }

    @Transactional
    public void deleteObstacleType(UUID obstacleTypeId) {
        ObstacleTypeEntity type = obstacleTypeRepository.findById(obstacleTypeId)
                .orElseThrow(() -> new EntityNotFoundException("Obstacle type not found: " + obstacleTypeId));
        // Detach the type from every world cell before deleting it.
        worldCellRepository.findAll().forEach(cell -> {
            if (cell.getObstacleTypes().removeIf(obstacle -> obstacle.getId().equals(type.getId()))) {
                worldCellRepository.save(cell);
            }
        });
        obstacleTypeRepository.delete(type);
        log.info("Admin deleted obstacle type '{}'", type.getCode());
    }

    private AdminDtos.AdminObstacleTypeDto toObstacleTypeDto(ObstacleTypeEntity type) {
        return new AdminDtos.AdminObstacleTypeDto(type.getId(), type.getCode(), type.getName(), type.getMaxHealth());
    }

    // --- PLAYER WEAPON PROFICIENCY ---

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminProficiencyDto> getPlayerProficiencies(String playerId) {
        playerRepository.findById(playerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + playerId));
        return weaponProficiencyRepository.findByPlayerIdOrderByWeaponTypeCodeAsc(playerId).stream()
                .map(this::toProficiencyDto)
                .toList();
    }

    @Transactional
    public List<AdminDtos.AdminProficiencyDto> setPlayerProficiency(String playerId, String weaponTypeCode, Integer level) {
        playerRepository.findById(playerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + playerId));
        String normalizedCode = normalizeWeaponTypeCode(weaponTypeCode);
        if (normalizedCode == null) {
            throw new IllegalArgumentException("Unknown weapon type: " + weaponTypeCode);
        }
        int clampedLevel = Math.max(0, level == null ? 0 : level);
        weaponProficiencyRepository.findByPlayerIdAndWeaponTypeCodeIgnoreCase(playerId, normalizedCode)
                .ifPresentOrElse(
                        existing -> {
                            existing.setLevel(clampedLevel);
                            weaponProficiencyRepository.save(existing);
                        },
                        () -> weaponProficiencyRepository.save(PlayerWeaponProficiencyEntity.builder()
                                .playerId(playerId)
                                .weaponTypeCode(normalizedCode)
                                .level(clampedLevel)
                                .build()));
        return getPlayerProficiencies(playerId);
    }

    private String normalizeWeaponTypeCode(String weaponTypeCode) {
        if (weaponTypeCode == null || weaponTypeCode.isBlank()) {
            return null;
        }
        WeaponTypeEntity weaponType = weaponTypeRepository.findByCodeIgnoreCase(weaponTypeCode.trim())
                .orElseThrow(() -> new IllegalArgumentException("Unknown weapon type: " + weaponTypeCode));
        return weaponType.getCode();
    }

    @Transactional
    public void deleteItem(UUID itemId) {
        ItemEntity item = itemRepository.findById(itemId)
                .orElseThrow(() -> new EntityNotFoundException("Item not found: " + itemId));

        // Remove the item from all inventories first
        playerInventoryRepository.deleteAll(playerInventoryRepository.findByItemId(itemId));

        itemRepository.delete(item);
        log.info("Admin deleted item {}", item.getCode());
    }

    // --- ENEMY TYPE MANAGEMENT ---

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminEnemyTypeDto> getAllEnemyTypes() {
        return enemyTypeRepository.findAllByOrderByNameAsc().stream()
                .map(this::toEnemyTypeDto)
                .toList();
    }

    @Transactional
    public AdminDtos.AdminEnemyTypeDto createEnemyType(AdminDtos.CreateEnemyTypeRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        String normalizedCode = requireNonBlank(request.code(), "Enemy code is required")
                .trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_]", "_");
        if (enemyTypeRepository.findByCodeIgnoreCase(normalizedCode).isPresent()) {
            throw new IllegalArgumentException("Enemy code already exists: " + normalizedCode);
        }
        EnemyTypeEntity enemy = enemyTypeRepository.save(EnemyTypeEntity.builder()
                .code(normalizedCode)
                .name(requireNonBlank(request.name(), "Enemy name is required").trim())
                .maxHealth(clampMin1(request.maxHealth(), 30))
                .damage(clampMin0(request.damage(), 5))
                .attackRange(clampMin0(request.attackRange(), 1))
                .actionPoints(clampMin1(request.actionPoints(), 3))
                .movementRange(clampMin1(request.movementRange(), 2))
                .build());
        enemy.setLootDrops(toLootDrops(request.lootDrops()));
        enemyTypeRepository.save(enemy);
        log.info("Admin created enemy type {}", enemy.getCode());
        return toEnemyTypeDto(enemy);
    }

    @Transactional
    public AdminDtos.AdminEnemyTypeDto updateEnemyType(UUID enemyId, AdminDtos.UpdateEnemyTypeRequest request) {
        EnemyTypeEntity enemy = enemyTypeRepository.findById(enemyId)
                .orElseThrow(() -> new EntityNotFoundException("Enemy type not found: " + enemyId));
        if (request == null) {
            throw new IllegalArgumentException("Request body is required");
        }
        if (request.name() != null && !request.name().isBlank()) {
            enemy.setName(request.name().trim());
        }
        if (request.maxHealth() != null) {
            enemy.setMaxHealth(clampMin1(request.maxHealth(), 1));
        }
        if (request.damage() != null) {
            enemy.setDamage(clampMin0(request.damage(), 0));
        }
        if (request.attackRange() != null) {
            enemy.setAttackRange(clampMin0(request.attackRange(), 0));
        }
        if (request.actionPoints() != null) {
            enemy.setActionPoints(clampMin1(request.actionPoints(), 1));
        }
        if (request.movementRange() != null) {
            enemy.setMovementRange(clampMin1(request.movementRange(), 1));
        }
        if (request.lootDrops() != null) {
            enemy.setLootDrops(toLootDrops(request.lootDrops()));
        }
        return toEnemyTypeDto(enemyTypeRepository.save(enemy));
    }

    @Transactional
    public void deleteEnemyType(UUID enemyId) {
        EnemyTypeEntity enemy = enemyTypeRepository.findById(enemyId)
                .orElseThrow(() -> new EntityNotFoundException("Enemy type not found: " + enemyId));

        // Detach combat sessions that reference this enemy type, then remove them
        List<CombatSessionEntity> sessions = combatRepository.findByEnemyTypeId(enemyId);
        combatRepository.deleteAll(sessions);

        // Detach world cells that use this enemy type for ambushes
        worldCellService.detachEnemyType(enemyId);

        enemyTypeRepository.delete(enemy);
        log.info("Admin deleted enemy type {} ({} combat sessions removed)", enemy.getCode(), sessions.size());
    }

    /**
     * Enemy generator: creates an enemy type with a random name and combat
     * stats within reasonable ranges. Difficulty 1 (weak) .. 3 (boss-like).
     */
    @Transactional
    public AdminDtos.AdminEnemyTypeDto generateRandomEnemy(int difficulty) {
        int tier = Math.min(3, Math.max(1, difficulty));
        String name = ENEMY_NAMES.get(random.nextInt(ENEMY_NAMES.size())) + " "
                + ENEMY_TITLES.get(random.nextInt(ENEMY_TITLES.size()));
        String code = "ENEMY_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);

        int maxHealth = 20 + tier * 20 + random.nextInt(21); // tier1: 40..60, tier2: 60..80, tier3: 80..100
        int damage = 2 + tier * 2 + random.nextInt(5); // tier1: 4..8, tier2: 6..10, tier3: 8..12
        int attackRange = 1 + random.nextInt(tier + 1); // melee..ranged for higher tiers
        int actionPoints = 2 + random.nextInt(2) + (tier >= 2 ? 1 : 0); // 2..5
        int movementRange = 1 + random.nextInt(3); // 1..3

        // Randomised loot table: 0..2 drops of existing weapon items.
        List<AdminDtos.EnemyLootDropDto> lootDrops = new ArrayList<>();
        List<ItemEntity> weaponItems = itemRepository.findAll().stream()
                .filter(item -> "WEAPON".equalsIgnoreCase(item.getType()))
                .toList();
        if (!weaponItems.isEmpty()) {
            int dropCount = random.nextInt(3); // 0..2
            for (int index = 0; index < dropCount; index++) {
                ItemEntity weapon = weaponItems.get(random.nextInt(weaponItems.size()));
                lootDrops.add(new AdminDtos.EnemyLootDropDto(
                        weapon.getCode(), 40 + random.nextInt(51), 1, 1));
            }
        }

        AdminDtos.AdminEnemyTypeDto created = createEnemyType(new AdminDtos.CreateEnemyTypeRequest(
                code, name, maxHealth, damage, attackRange, actionPoints, movementRange, lootDrops));
        log.info("Generated random enemy '{}' ({}, difficulty {})", created.name(), created.code(), tier);
        return created;
    }

    private static int clampMin0(Integer value, int fallback) {
        return Math.max(0, value == null ? fallback : value);
    }

    private static int clampMin1(Integer value, int fallback) {
        return Math.max(1, value == null ? fallback : value);
    }

    // --- DTO MAPPERS ---

    private AdminDtos.AdminPlayerDto toPlayerDto(PlayerEntity player) {
        List<AdminDtos.AdminProficiencyDto> proficiencies = weaponProficiencyRepository
                .findByPlayerIdOrderByWeaponTypeCodeAsc(player.getId()).stream()
                .map(this::toProficiencyDto)
                .toList();
        return new AdminDtos.AdminPlayerDto(player.getId(), player.getUsername(), player.getAvatarUrl(),
                player.getRole(), player.getLevel(), player.getGold(), player.getQuestPoints(), proficiencies);
    }

    private AdminDtos.AdminNpcDto toNpcDto(NpcEntity npc) {
        return new AdminDtos.AdminNpcDto(npc.getId(), npc.getCode(), npc.getName(),
                npc.getPositionX(), npc.getPositionY());
    }

    private AdminDtos.AdminQuestDto toQuestDto(QuestEntity quest) {
        List<AdminDtos.AdminNpcDto> npcs = quest.getRequiredNpcs() == null ? List.of()
                : quest.getRequiredNpcs().stream().map(this::toNpcDto).toList();
        return new AdminDtos.AdminQuestDto(quest.getId(), quest.getCode(), quest.getTitle(),
                quest.getRewardExp(), quest.getRewardGold(), quest.getRewardItemCode(), npcs);
    }

    private AdminDtos.AdminDialogueNodeDto toDialogueNodeDto(DialogueNodeEntity node) {
        List<AdminDtos.AdminDialogueChoiceDto> choices = node.getChoices() == null ? List.of()
                : node.getChoices().stream()
                        .map(choice -> new AdminDtos.AdminDialogueChoiceDto(choice.getId(), choice.getText(),
                                choice.getNextNode() == null ? null : choice.getNextNode().getId()))
                        .toList();
        return new AdminDtos.AdminDialogueNodeDto(node.getId(), node.getNpc().getId(), node.getText(),
                node.isStart(), choices);
    }

    private AdminDtos.AdminItemDto toItemDto(ItemEntity item) {
        return new AdminDtos.AdminItemDto(item.getId(), item.getCode(), item.getName(), item.getType(),
                item.getWeaponTypeCode(), item.getDamage(), item.getAttackRange(), item.getWidth(), item.getHeight(),
                item.getDefense(), item.getEquipmentSlot(), item.getHeal());
    }

    private AdminDtos.AdminWeaponTypeDto toWeaponTypeDto(WeaponTypeEntity weaponType) {
        return new AdminDtos.AdminWeaponTypeDto(weaponType.getId(), weaponType.getCode(), weaponType.getName(),
                weaponType.getAccuracyPerLevel(), weaponType.getMaxAccuracy());
    }

    private AdminDtos.AdminProficiencyDto toProficiencyDto(PlayerWeaponProficiencyEntity proficiency) {
        String weaponTypeName = weaponTypeRepository.findByCodeIgnoreCase(proficiency.getWeaponTypeCode())
                .map(WeaponTypeEntity::getName)
                .orElse(proficiency.getWeaponTypeCode());
        return new AdminDtos.AdminProficiencyDto(proficiency.getWeaponTypeCode(), weaponTypeName, proficiency.getLevel());
    }

    private AdminDtos.AdminEnemyTypeDto toEnemyTypeDto(EnemyTypeEntity enemy) {
        List<AdminDtos.EnemyLootDropDto> drops = enemy.getLootDrops().stream()
                .map(drop -> new AdminDtos.EnemyLootDropDto(
                        drop.itemCode(), drop.chance(), drop.minQuantity(), drop.maxQuantity()))
                .toList();
        return new AdminDtos.AdminEnemyTypeDto(enemy.getId(), enemy.getCode(), enemy.getName(),
                enemy.getMaxHealth(), enemy.getDamage(), enemy.getAttackRange(),
                enemy.getActionPoints(), enemy.getMovementRange(), drops);
    }

    private List<EnemyLootDrop> toLootDrops(List<AdminDtos.EnemyLootDropDto> drops) {
        if (drops == null || drops.isEmpty()) {
            return List.of();
        }
        return drops.stream()
                .filter(drop -> drop != null && drop.itemCode() != null && !drop.itemCode().isBlank())
                .map(drop -> new EnemyLootDrop(
                        drop.itemCode().trim().toUpperCase(Locale.ROOT),
                        Math.max(0, Math.min(100, drop.chance() == null ? 100 : drop.chance())),
                        Math.max(1, drop.minQuantity() == null ? 1 : drop.minQuantity()),
                        Math.max(1, drop.maxQuantity() == null ? 1 : drop.maxQuantity())))
                .toList();
    }

    private static String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }

    /** Request payload for a dialogue choice. */
    public record DialogueChoiceRequest(String text, UUID nextNodeId) {
    }

    /** Thrown when a non-admin tries to use an admin endpoint. */
    public static class AdminAccessDeniedException extends RuntimeException {
        public AdminAccessDeniedException(String message) {
            super(message);
        }
    }
}