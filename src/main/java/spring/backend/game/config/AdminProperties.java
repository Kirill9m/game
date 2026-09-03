package spring.backend.game.config;

import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

/**
 * Admin configuration.
 *
 * <p>Ways to become an admin:</p>
 * <ul>
 *   <li>Add your player id to {@code game.admin.player-ids} (or the
 *       {@code ADMIN_PLAYER_IDS} env var, comma separated) — the player is
 *       promoted automatically on login / startup.</li>
 *   <li>Use the one-time bootstrap endpoint with {@code game.admin.bootstrap-code}
 *       (default: {@code let-me-in}) from the admin screen in the client.</li>
 * </ul>
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "game.admin")
public class AdminProperties {

    /** Player ids that are automatically granted the ADMIN role. */
    private List<String> adminPlayerIds = new ArrayList<>();

    /** Secret code for the one-time bootstrap promotion endpoint. */
    private String bootstrapCode = "let-me-in";
}