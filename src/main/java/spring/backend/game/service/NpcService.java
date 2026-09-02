package spring.backend.game.service;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.NpcDialogueResponse;
import spring.backend.game.dto.NpcInfoResponse;
import spring.backend.game.dto.QuestInfoResponse;
import spring.backend.game.entity.NpcEntity;
import spring.backend.game.entity.PlayerQuestEntity;
import spring.backend.game.entity.QuestEntity;
import spring.backend.game.repository.NpcRepository;
import spring.backend.game.repository.PlayerQuestRepository;
import spring.backend.game.repository.PlayerRepository;
import spring.backend.game.repository.QuestRepository;

@Service
@RequiredArgsConstructor
public class NpcService {
    private static final String FIRST_MEETING_QUEST = "FIRST_MEETING";

    private final NpcRepository npcRepository;
    private final QuestRepository questRepository;
    private final PlayerQuestRepository playerQuestRepository;
    private final PlayerRepository playerRepository;

    public List<NpcInfoResponse> getNpcsAt(int positionX, int positionY) {
        return npcRepository.findByPositionXAndPositionY(positionX, positionY).stream()
                .map(npc -> NpcInfoResponse.builder()
                        .code(npc.getCode())
                        .name(npc.getName())
                        .positionX(npc.getPositionX())
                        .positionY(npc.getPositionY())
                        .build())
                .toList();
    }

    @Transactional
    public NpcDialogueResponse talk(String playerId, String npcCode) {
        var player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Player not found"));
        NpcEntity npc = npcRepository.findByCodeIgnoreCase(npcCode)
                .orElseThrow(() -> new RuntimeException("NPC not found"));
        if (player.getPositionX() != npc.getPositionX() || player.getPositionY() != npc.getPositionY()) {
            throw new RuntimeException("Move to the NPC's cell first");
        }

        List<QuestInfoResponse> quests = questRepository.findByGiverNpcCodeIgnoreCase(npc.getCode()).stream()
                .map(quest -> toQuestResponse(playerId, quest))
                .toList();
        return NpcDialogueResponse.builder()
                .code(npc.getCode())
                .name(npc.getName())
                .dialogue(npc.getDialogue())
                .quests(quests)
                .build();
    }

    private QuestInfoResponse toQuestResponse(String playerId, QuestEntity quest) {
        PlayerQuestEntity progress = playerQuestRepository
                .findByPlayerIdAndQuestCodeIgnoreCase(playerId, quest.getCode())
                .orElseGet(() -> completeFirstMeetingQuest(playerId, quest));
        return QuestInfoResponse.builder()
                .code(quest.getCode())
                .title(quest.getTitle())
                .description(quest.getDescription())
                .reward(quest.getReward())
                .status(progress.getStatus())
                .build();
    }

    private PlayerQuestEntity completeFirstMeetingQuest(String playerId, QuestEntity quest) {
        String status = FIRST_MEETING_QUEST.equalsIgnoreCase(quest.getCode()) ? "COMPLETED" : "AVAILABLE";
        return playerQuestRepository.save(PlayerQuestEntity.builder()
                .player(playerRepository.getReferenceById(playerId))
                .quest(quest)
                .status(status)
                .completedAt("COMPLETED".equals(status) ? Instant.now() : null)
                .build());
    }
}
