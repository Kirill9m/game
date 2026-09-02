package spring.backend.game.dto;

import java.util.List;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NpcDialogueResponse {
    private String code;
    private String name;
    private String dialogue;
    private List<QuestInfoResponse> quests;
}
