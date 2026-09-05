package spring.backend.game.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import spring.backend.game.dto.AdminDtos;
import spring.backend.game.entity.QuestSystem.DialogueChoiceEntity;
import spring.backend.game.entity.QuestSystem.DialogueNodeEntity;
import spring.backend.game.entity.QuestSystem.NpcEntity;
import spring.backend.game.entity.QuestSystem.PlayerQuestEntity;
import spring.backend.game.entity.QuestSystem.QuestEntity;
import spring.backend.game.entity.QuestSystem.QuestLogEntryEntity;
import spring.backend.game.repository.QuestSystem.DialogueChoiceRepository;
import spring.backend.game.repository.QuestSystem.DialogueNodeRepository;
import spring.backend.game.repository.QuestSystem.NpcRepository;
import spring.backend.game.repository.QuestSystem.PlayerQuestRepository;
import spring.backend.game.repository.QuestSystem.QuestLogEntryRepository;
import spring.backend.game.repository.QuestSystem.QuestRepository;

/**
 * Admin operations for the quest system: NPCs, quests (including the random
 * quest generator) and dialogue trees.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuestAdminService {

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

    private final NpcRepository npcRepository;
    private final QuestRepository questRepository;
    private final DialogueNodeRepository dialogueNodeRepository;
    private final DialogueChoiceRepository dialogueChoiceRepository;
    private final PlayerQuestRepository playerQuestRepository;
    private final QuestLogEntryRepository questLogEntryRepository;
    private final Random random = new Random();

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
                        new AdminDtos.DialogueChoiceRequest("I'm on my way.", null),
                        new AdminDtos.DialogueChoiceRequest("Tell me more.", null)));
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
                                                             List<AdminDtos.DialogueChoiceRequest> choices) {
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
            for (AdminDtos.DialogueChoiceRequest choiceRequest : choices) {
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

    // --- DTO MAPPERS ---

    private AdminDtos.AdminNpcDto toNpcDto(NpcEntity npc) {
        return new AdminDtos.AdminNpcDto(npc.getId(), npc.getCode(), npc.getName(),
                npc.getPositionX(), npc.getPositionY(), npc.getLocationId(), npc.getLocationX(), npc.getLocationY(),
                npc.getBuildingId());
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

    private static String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }
}

