package spring.backend.game.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MoveRequest {
    private int targetX;
    private int targetY;
}
