package spring.backend.game.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * A single combatant (or spectator) inside a {@link CombatSessionEntity}.
 * <p>
 * A participant is either a {@link #ROLE_FIGHTER} (has a team, position, health
 * and a plan) or a {@link #ROLE_SPECTATOR} (only watching). Up to 10 fighters
 * can share one board, split across teams. A team is an arbitrary string:
 * the two founders use {@code "A"} and {@code "B"}, while a player who joins
 * "for themselves" gets their own player id as the team name (free-for-all).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CombatParticipant {

    public static final String ROLE_FIGHTER = "FIGHTER";
    public static final String ROLE_SPECTATOR = "SPECTATOR";

    private String playerId;
    private String team;
    private String role;

    @Builder.Default
    private int x = 0;
    @Builder.Default
    private int y = 0;
    @Builder.Default
    private int health = 100;
    @Builder.Default
    private String posture = "STANDING";

    /** Weapon code currently equipped by the fighter ({@code null} → default PISTOL). */
    private String equippedItemCode;

    /** The fighter's submitted plan (a {@code ;}-separated list of actions). */
    private String plan;

    @Builder.Default
    private boolean ready = false;

    public boolean isFighter() {
        return ROLE_FIGHTER.equals(role);
    }

    public boolean isSpectator() {
        return ROLE_SPECTATOR.equals(role);
    }

    public boolean isAlive() {
        return isFighter() && health > 0;
    }

    public boolean isBot() {
        return playerId != null && playerId.startsWith("bot_");
    }
}
