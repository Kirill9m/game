package spring.backend.game.dto;

import java.util.List;

public record CombatPlanRequest(List<CombatActionRequest> actions) {
    public CombatPlanRequest {
        actions = actions == null ? List.of() : List.copyOf(actions);
    }

    public record CombatActionRequest(String type, Integer dx, Integer dy, Integer targetX, Integer targetY, String posture, String itemCode) {
    }
}
