package spring.backend.game.service;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.repository.PlayerRepository;

/**
 * Guards every admin endpoint. Call {@link #requireAdmin(String)} before doing
 * any admin work to reject non-admin callers with a 403.
 */
@Service
@RequiredArgsConstructor
public class AdminAccessService {

    private final PlayerRepository playerRepository;

    /** Throws when the given player is not an admin. */
    public void requireAdmin(String playerId) {
        if (playerId == null || playerId.isBlank()) {
            throw new IllegalArgumentException("playerId is required");
        }
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new EntityNotFoundException("Player not found: " + playerId));
        if (!PlayerEntity.ROLE_ADMIN.equals(player.getRole())) {
            throw new AdminAccessDeniedException("Admin access required");
        }
    }
}
