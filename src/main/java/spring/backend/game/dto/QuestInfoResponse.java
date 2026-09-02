package spring.backend.game.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QuestInfoResponse {
    private String code;
    private String title;
    private String description;
    private String reward;
    private String status;
}
