package spring.backend.game.dto;

import lombok.Data;

@Data
public class PlayerLoginRequest {
    private String githubId;
    private String username;
    private String avatarUrl;
}