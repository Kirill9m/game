package spring.backend.game.entity;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Column;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "combats")
public class CombatSessionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private String player1Id;
    private String player2Id;

    @Column(name = "p1_equipped_item_code", length = 50)
    private String p1EquippedItemCode;

    @Column(name = "p2_equipped_item_code", length = 50)
    private String p2EquippedItemCode;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "enemy_type_id")
    private EnemyTypeEntity enemyType;

    private String currentTurnPlayerId;

    @Column(length = 4000)
    private String p1Plan;

    @Column(length = 4000)
    private String p2Plan;

    @Builder.Default
    private boolean p1Ready = false;

    @Builder.Default
    private boolean p2Ready = false;

    @Builder.Default
    private int actionPoints = 3;

    @Builder.Default
    private int p1X = 0;

    @Builder.Default
    private int p1Y = 0;

    @Builder.Default
    private int p2X = 5;

    @Builder.Default
    private int p2Y = 5;

    @Builder.Default
    private int p1Health = 100;

    @Builder.Default
    private int p2Health = 100;

    private String winnerId;

    @Builder.Default
    private String status = "IN_PROGRESS";

    @Builder.Default
    private String p1Posture = "STANDING";

    @Builder.Default
    private String p2Posture = "STANDING";

    @Column(length = 4000)
    @JsonIgnore
    private String lastRoundActionsData;

    @Transient
    @Builder.Default
    private String[] lastRoundActions = new String[0];

    public String[] getLastRoundActions() {
        if (lastRoundActions.length == 0 && lastRoundActionsData != null && !lastRoundActionsData.isBlank()) {
            lastRoundActions = lastRoundActionsData.split("\\n", -1);
        }
        return lastRoundActions;
    }

    public void setLastRoundActions(String[] actions) {
        lastRoundActions = actions == null ? new String[0] : actions;
        lastRoundActionsData = String.join("\n", lastRoundActions);
    }

    @Transient
    public String getEnemyTypeCode() {
        return enemyType == null ? null : enemyType.getCode();
    }

    @Transient
    public String getEnemyName() {
        return enemyType == null ? null : enemyType.getName();
    }
}
