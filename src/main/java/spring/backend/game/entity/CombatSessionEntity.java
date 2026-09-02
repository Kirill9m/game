package spring.backend.game.entity;

import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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

    private String currentTurnPlayerId;

    @Builder.Default
    private int actionPoints = 3;

    private int p1X = 0;
    private int p1Y = 0;
    private int p2X = 5;
    private int p2Y = 5;

    @Builder.Default
    private String status = "IN_PROGRESS";
}
