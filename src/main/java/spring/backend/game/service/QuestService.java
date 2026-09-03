package spring.backend.game.service;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import spring.backend.game.dto.QuestSystem.DialogueChoiceDto;
import spring.backend.game.dto.QuestSystem.DialogueNodeDto;
import spring.backend.game.dto.QuestSystem.QuestLogEntryDto;
import spring.backend.game.dto.QuestSystem.QuestProgressDto;
import spring.backend.game.entity.ItemEntity;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.entity.QuestSystem.DialogueChoiceEntity;
import spring.backend.game.entity.QuestSystem.DialogueNodeEntity;
import spring.backend.game.entity.QuestSystem.NpcEntity;
import spring.backend.game.entity.QuestSystem.PlayerQuestEntity;
import spring.backend.game.entity.QuestSystem.QuestEntity;
import spring.backend.game.entity.QuestSystem.QuestLogEntryEntity;
import spring.backend.game.entity.QuestSystem.QuestStatus;
import spring.backend.game.repository.ItemRepository;
import spring.backend.game.repository.PlayerInventoryRepository;
import spring.backend.game.repository.PlayerRepository;
import spring.backend.game.repository.QuestSystem.DialogueChoiceRepository;
import spring.backend.game.repository.QuestSystem.DialogueNodeRepository;
import spring.backend.game.repository.QuestSystem.NpcRepository;
import spring.backend.game.repository.QuestSystem.PlayerQuestRepository;
import spring.backend.game.repository.QuestSystem.QuestLogEntryRepository;
import spring.backend.game.repository.QuestSystem.QuestRepository;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuestService {

    private static final List<String> REWARD_ITEMS = List.of("PISTOL", "KNIFE", "WORLD_MAP");

    private final NpcRepository npcRepository;
    private final DialogueNodeRepository dialogueNodeRepository;
    private final DialogueChoiceRepository dialogueChoiceRepository;
    private final QuestRepository questRepository;
    private final PlayerQuestRepository playerQuestRepository;
    private final PlayerRepository playerRepository;
    private final InventoryService inventoryService;
    private final PlayerInventoryRepository inventoryRepository;
    private final ItemRepository itemRepository;
    private final PlatformTransactionManager transactionManager;
    private final QuestLogEntryRepository questLogEntryRepository;

    // --- DIALOGUE LOGIC ---

    @Transactional
    public DialogueNodeDto startDialogue(UUID npcId) {
        DialogueNodeEntity startNode = dialogueNodeRepository.findByNpcIdAndIsStartTrue(npcId)
                .orElseThrow(() -> new EntityNotFoundException("NPC has no starting dialogue"));

        return mapToDto(startNode);
    }

    @Transactional
    public DialogueNodeDto selectChoice(String playerId, UUID choiceId, UUID activeQuestId) {
        DialogueChoiceEntity choice = dialogueChoiceRepository.findById(choiceId)
                .orElseThrow(() -> new EntityNotFoundException("Dialogue choice not found"));

        // If this choice ends the dialogue
        if (choice.getNextNode() == null) {
            try {
                // Load NPC within current transaction
                NpcEntity npc = (NpcEntity) Hibernate.unproxy(choice.getNode().getNpc());

                // Update quest progress in a separate transaction
                // so reward errors don't break the dialogue response
                TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
                txTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
                txTemplate.execute(status -> {
                    recordNpcTalk(playerId, activeQuestId, npc);
                    return null;
                });
            } catch (Exception e) {
                log.error("Failed to update quest progress for player {}: {}", playerId, e.getMessage(), e);
            }
            return null; // Signal to the client that the dialogue is closed
        }

        return mapToDto(choice.getNextNode());
    }

    /**
     * Checks whether the quest involving this NPC is completed.
     * If the quest is completed — the NPC no longer talks.
     */
    @Transactional
    public boolean isNpcTalkBlocked(String playerId, UUID npcId) {
        // If the MEET_VILLAGERS quest is completed — all NPCs "go silent"
        boolean meetVillagersCompleted = playerQuestRepository.findByPlayerId(playerId).stream()
                .anyMatch(pq -> "MEET_VILLAGERS".equalsIgnoreCase(pq.getQuest().getCode())
                        && pq.getStatus() == QuestStatus.COMPLETED);
        return meetVillagersCompleted;
    }

    // --- QUEST LOGIC ---

    @Transactional
    public QuestProgressDto startQuest(String playerId, String questCode) {
        QuestEntity quest = questRepository.findByCode(questCode)
                .orElseThrow(() -> new EntityNotFoundException("Quest not found: " + questCode));

        PlayerQuestEntity playerQuest = playerQuestRepository.findByPlayerIdAndQuestId(playerId, quest.getId())
                .orElseGet(() -> PlayerQuestEntity.builder()
                        .playerId(playerId)
                        .quest(quest)
                        .status(QuestStatus.IN_PROGRESS)
                        .talkedNpcs(new HashSet<>())
                        .build());

        playerQuestRepository.save(playerQuest);

        // Record in the quest log
        addLogEntry(playerQuest, "Quest \"" + quest.getTitle() + "\" accepted. Talk to the villagers.");

        return mapToQuestProgressDto(playerQuest);
    }

    @Transactional
    public List<QuestProgressDto> getPlayerQuests(String playerId) {
        return playerQuestRepository.findByPlayerId(playerId).stream()
                .map(this::mapToQuestProgressDto)
                .toList();
    }

    /**
     * Claim the reward for a completed quest.
     */
    @Transactional
    public QuestProgressDto claimReward(String playerId, UUID playerQuestId) {
        PlayerQuestEntity playerQuest = playerQuestRepository.findById(playerQuestId)
                .orElseThrow(() -> new EntityNotFoundException("Quest not found"));

        if (!playerQuest.getPlayerId().equals(playerId)) {
            throw new IllegalArgumentException("This quest does not belong to the player");
        }

        if (playerQuest.getStatus() != QuestStatus.COMPLETED) {
            throw new IllegalArgumentException("Quest is not completed yet");
        }

        if (playerQuest.isRewardClaimed()) {
            throw new IllegalArgumentException("Reward has already been claimed");
        }

        // Grant the reward
        grantReward(playerId, playerQuest.getQuest());

        // Mark the reward as claimed
        playerQuest.setRewardClaimed(true);
        playerQuestRepository.save(playerQuest);

        // Record in the log
        addLogEntry(playerQuest, "\uD83C\uDF81 Reward for quest \"" + playerQuest.getQuest().getTitle() + "\" claimed!");

        return mapToQuestProgressDto(playerQuest);
    }

    @Transactional
    public void recordNpcTalk(String playerId, UUID questId, NpcEntity npc) {
        PlayerQuestEntity playerQuest = null;
        if (questId != null) {
            playerQuest = playerQuestRepository.findByPlayerIdAndQuestId(playerId, questId).orElse(null);
        }

        if (playerQuest == null) {
            // Look for an active quest
            List<PlayerQuestEntity> activeQuests = playerQuestRepository.findByPlayerIdAndStatus(playerId, QuestStatus.IN_PROGRESS);
            if (!activeQuests.isEmpty()) {
                playerQuest = activeQuests.stream()
                        .filter(pq -> pq.getQuest().getRequiredNpcs().stream()
                                .anyMatch(req -> req.getId().equals(npc.getId())))
                        .findFirst()
                        .orElse(activeQuests.get(0));
            } else {
                // If there is no active quest, check if MEET_VILLAGERS is already completed
                boolean alreadyCompleted = playerQuestRepository.findByPlayerId(playerId).stream()
                        .anyMatch(pq -> "MEET_VILLAGERS".equalsIgnoreCase(pq.getQuest().getCode())
                                && pq.getStatus() == QuestStatus.COMPLETED);

                if (!alreadyCompleted) {
                    QuestEntity defaultQuest = questRepository.findByCode("MEET_VILLAGERS").orElse(null);
                    if (defaultQuest != null) {
                        playerQuest = playerQuestRepository.save(PlayerQuestEntity.builder()
                                .playerId(playerId)
                                .quest(defaultQuest)
                                .status(QuestStatus.IN_PROGRESS)
                                .talkedNpcs(new HashSet<>())
                                .build());
                        addLogEntry(playerQuest, "Quest \"" + defaultQuest.getTitle() + "\" accepted automatically.");
                    }
                }
            }
        }

        // If the quest is active and not completed yet
        if (playerQuest != null && playerQuest.getStatus() == QuestStatus.IN_PROGRESS) {
            Set<UUID> requiredIds = playerQuest.getQuest().getRequiredNpcs().stream()
                    .map(NpcEntity::getId)
                    .collect(Collectors.toSet());

            if (requiredIds.contains(npc.getId())) {
                boolean alreadyTalked = playerQuest.getTalkedNpcs().stream()
                        .anyMatch(t -> t.getId().equals(npc.getId()));

                playerQuest.getTalkedNpcs().add(npc);

                if (!alreadyTalked) {
                    // Record in the log
                    addLogEntry(playerQuest, "Talked to: " + npc.getName());
                }

                Set<UUID> talkedIds = playerQuest.getTalkedNpcs().stream()
                        .map(NpcEntity::getId)
                        .collect(Collectors.toSet());

                // COMPLETION CHECK: talked to all required NPCs?
                if (talkedIds.containsAll(requiredIds)) {
                    playerQuest.setStatus(QuestStatus.COMPLETED);
                    addLogEntry(playerQuest, "✅ Quest \"" + playerQuest.getQuest().getTitle() + "\" completed! Claim your reward in the quest journal.");
                }

                playerQuestRepository.save(playerQuest);
            }
        }
    }

    private void addLogEntry(PlayerQuestEntity playerQuest, String message) {
        questLogEntryRepository.save(QuestLogEntryEntity.builder()
                .playerQuest(playerQuest)
                .message(message)
                .timestamp(Instant.now())
                .build());
    }

    private void grantReward(String playerId, QuestEntity quest) {
        PlayerEntity player = playerRepository.findById(playerId).orElse(null);
        if (player == null) {
            return;
        }

        // 1. Grant gold
        player.addGold(quest.getRewardGold());

        // 2. Grant quest points and level up experience
        player.addQuestPoints(quest.getRewardExp());
        // Simple level formula: every 100 quest points = 1 level
        int newLevel = Math.max(1, player.getQuestPoints() / 100 + 1);
        if (newLevel > player.getLevel()) {
            player.setLevel(newLevel);
            log.info("Player {} leveled up to level {}", playerId, newLevel);
        }

        playerRepository.save(player);

        // 3. Grant the reward item (default: from missing items or random)
        String itemCode = quest.getRewardItemCode();
        if (itemCode == null || itemCode.isBlank() || "RANDOM".equalsIgnoreCase(itemCode)) {
            List<String> missingItems = REWARD_ITEMS.stream()
                    .filter(code -> !inventoryRepository.existsByPlayerAndItemCode(playerId, code))
                    .toList();
            if (!missingItems.isEmpty()) {
                itemCode = missingItems.get(new Random().nextInt(missingItems.size()));
            } else {
                itemCode = REWARD_ITEMS.get(new Random().nextInt(REWARD_ITEMS.size()));
            }
        }

        try {
            inventoryService.addItem(playerId, itemCode);
        } catch (Exception e) {
            log.error("Failed to grant item {} to player {}: {}", itemCode, playerId, e.getMessage(), e);
        }

        System.out.println("Player " + playerId + " claimed the reward for quest '" + quest.getTitle() + "': "
                + quest.getRewardGold() + " gold, item " + itemCode + " and " + quest.getRewardExp() + " quest points!");
    }

    private DialogueNodeDto mapToDto(DialogueNodeEntity node) {
        List<DialogueChoiceDto> choices = node.getChoices().stream()
                .map(c -> new DialogueChoiceDto(c.getId(), c.getText(), c.getNextNode() == null))
                .toList();

        return new DialogueNodeDto(node.getId(), node.getNpc().getName(), node.getText(), choices);
    }

    private QuestProgressDto mapToQuestProgressDto(PlayerQuestEntity pq) {
        List<QuestLogEntryDto> logs = questLogEntryRepository.findByPlayerQuestIdOrderByTimestampAsc(pq.getId()).stream()
                .map(e -> new QuestLogEntryDto(e.getMessage(), e.getTimestamp()))
                .toList();

        // Resolve the reward item name from the DB
        String rewardItemName = null;
        String rewardItemCode = pq.getQuest().getRewardItemCode();
        if (rewardItemCode != null && !rewardItemCode.isBlank() && !"RANDOM".equalsIgnoreCase(rewardItemCode)) {
            rewardItemName = itemRepository.findByCodeIgnoreCase(rewardItemCode)
                    .map(ItemEntity::getName)
                    .orElse(rewardItemCode);
        } else if ("RANDOM".equalsIgnoreCase(rewardItemCode)) {
            rewardItemName = "Random item";
        }

        return new QuestProgressDto(
                pq.getId(),
                pq.getQuest().getId(),
                pq.getQuest().getCode(),
                pq.getQuest().getTitle(),
                pq.getStatus(),
                pq.getTalkedNpcs().size(),
                pq.getQuest().getRequiredNpcs().size(),
                pq.getStatus() == QuestStatus.COMPLETED,
                pq.isRewardClaimed(),
                pq.getQuest().getRewardGold(),
                pq.getQuest().getRewardExp(),
                rewardItemName,
                logs);
    }
}