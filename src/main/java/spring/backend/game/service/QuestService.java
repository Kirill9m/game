package spring.backend.game.service;

import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import spring.backend.game.dto.QuestSystem.DialogueChoiceDto;
import spring.backend.game.dto.QuestSystem.DialogueNodeDto;
import spring.backend.game.dto.QuestSystem.QuestProgressDto;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.entity.QuestSystem.DialogueChoiceEntity;
import spring.backend.game.entity.QuestSystem.DialogueNodeEntity;
import spring.backend.game.entity.QuestSystem.NpcEntity;
import spring.backend.game.entity.QuestSystem.PlayerQuestEntity;
import spring.backend.game.entity.QuestSystem.QuestEntity;
import spring.backend.game.entity.QuestSystem.QuestStatus;
import spring.backend.game.repository.PlayerInventoryRepository;
import spring.backend.game.repository.PlayerRepository;
import spring.backend.game.repository.QuestSystem.DialogueChoiceRepository;
import spring.backend.game.repository.QuestSystem.DialogueNodeRepository;
import spring.backend.game.repository.QuestSystem.NpcRepository;
import spring.backend.game.repository.QuestSystem.PlayerQuestRepository;
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

    // --- ЛОГИКА ДИАЛОГОВ ---

    @Transactional
    public DialogueNodeDto startDialogue(UUID npcId) {
        DialogueNodeEntity startNode = dialogueNodeRepository.findByNpcIdAndIsStartTrue(npcId)
                .orElseThrow(() -> new EntityNotFoundException("У NPC нет начального диалога"));

        return mapToDto(startNode);
    }

    @Transactional
    public DialogueNodeDto selectChoice(String playerId, UUID choiceId, UUID activeQuestId) {
        DialogueChoiceEntity choice = dialogueChoiceRepository.findById(choiceId)
                .orElseThrow(() -> new EntityNotFoundException("Вариант ответа не найден"));

        // Если этот выбор завершает диалог
        if (choice.getNextNode() == null) {
            try {
                // Фиксируем, что поговорили с NPC для текущего квеста
                recordNpcTalk(playerId, activeQuestId, choice.getNode().getNpc());
            } catch (Exception e) {
                log.error("Ошибка при обновлении прогресса квеста для игрока {}: {}", playerId, e.getMessage(), e);
            }
            return null; // Сигнал клиенту, что диалог закрыт
        }

        return mapToDto(choice.getNextNode());
    }

    // --- ЛОГИКА КВЕСТОВ ---

    @Transactional
    public QuestProgressDto startQuest(String playerId, String questCode) {
        QuestEntity quest = questRepository.findByCode(questCode)
                .orElseThrow(() -> new EntityNotFoundException("Квест не найден: " + questCode));

        PlayerQuestEntity playerQuest = playerQuestRepository.findByPlayerIdAndQuestId(playerId, quest.getId())
                .orElseGet(() -> PlayerQuestEntity.builder()
                        .playerId(playerId)
                        .quest(quest)
                        .status(QuestStatus.IN_PROGRESS)
                        .talkedNpcs(new HashSet<>())
                        .build());

        playerQuestRepository.save(playerQuest);
        return mapToQuestProgressDto(playerQuest);
    }

    @Transactional
    public List<QuestProgressDto> getPlayerQuests(String playerId) {
        return playerQuestRepository.findByPlayerId(playerId).stream()
                .map(this::mapToQuestProgressDto)
                .toList();
    }

    @Transactional
    public void recordNpcTalk(String playerId, UUID questId, NpcEntity npc) {
        PlayerQuestEntity playerQuest = null;
        if (questId != null) {
            playerQuest = playerQuestRepository.findByPlayerIdAndQuestId(playerId, questId).orElse(null);
        }

        if (playerQuest == null) {
            // Ищем активный квест игрока
            List<PlayerQuestEntity> activeQuests = playerQuestRepository.findByPlayerIdAndStatus(playerId, QuestStatus.IN_PROGRESS);
            if (!activeQuests.isEmpty()) {
                playerQuest = activeQuests.stream()
                        .filter(pq -> pq.getQuest().getRequiredNpcs().stream()
                                .anyMatch(req -> req.getId().equals(npc.getId())))
                        .findFirst()
                        .orElse(activeQuests.get(0));
            } else {
                // Если активного квеста нет, проверяем, не завершен ли уже квест MEET_VILLAGERS
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
                    }
                }
            }
        }

        // Если квест активен и ещё не завершён
        if (playerQuest != null && playerQuest.getStatus() == QuestStatus.IN_PROGRESS) {
            Set<UUID> requiredIds = playerQuest.getQuest().getRequiredNpcs().stream()
                    .map(NpcEntity::getId)
                    .collect(Collectors.toSet());

            if (requiredIds.contains(npc.getId())) {
                playerQuest.getTalkedNpcs().add(npc);

                Set<UUID> talkedIds = playerQuest.getTalkedNpcs().stream()
                        .map(NpcEntity::getId)
                        .collect(Collectors.toSet());

                // ПРОВЕРКА ЗАВЕРШЕНИЯ: поговорил со всеми требуемыми NPC?
                if (talkedIds.containsAll(requiredIds)) {
                    playerQuest.setStatus(QuestStatus.COMPLETED);
                    grantReward(playerId, playerQuest.getQuest());
                }

                playerQuestRepository.save(playerQuest);
            }
        }
    }

    private void grantReward(String playerId, QuestEntity quest) {
        PlayerEntity player = playerRepository.findById(playerId).orElse(null);
        if (player == null) {
            return;
        }

        // 1. Начисляем деньги игроку
        player.addGold(quest.getRewardGold());
        playerRepository.save(player);

        // 2. Начисляем награду: пистолет, нож или карту (по умолчанию выбирается из тех, которых нет, либо случайный)
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

        inventoryService.addItem(playerId, itemCode);

        System.out.println("Игрок " + playerId + " получил награду за квест '" + quest.getTitle() + "': "
                + quest.getRewardGold() + " золота, предмет " + itemCode + " и " + quest.getRewardExp() + " опыта!");
    }

    private DialogueNodeDto mapToDto(DialogueNodeEntity node) {
        List<DialogueChoiceDto> choices = node.getChoices().stream()
                .map(c -> new DialogueChoiceDto(c.getId(), c.getText(), c.getNextNode() == null))
                .toList();

        return new DialogueNodeDto(node.getId(), node.getNpc().getName(), node.getText(), choices);
    }

    private QuestProgressDto mapToQuestProgressDto(PlayerQuestEntity pq) {
        return new QuestProgressDto(
                pq.getQuest().getId(),
                pq.getQuest().getCode(),
                pq.getQuest().getTitle(),
                pq.getStatus(),
                pq.getTalkedNpcs().size(),
                pq.getQuest().getRequiredNpcs().size(),
                pq.getStatus() == QuestStatus.COMPLETED);
    }
}