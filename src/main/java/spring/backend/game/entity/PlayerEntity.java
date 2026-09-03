package spring.backend.game.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "players")
public class PlayerEntity {

    @Id
    @Column(name = "player_id", unique = true, nullable = false)
    private String id;

    private String username;

    private String avatarUrl;

    @Column(name = "position_x", nullable = false)
    private int positionX;

    @Column(name = "position_y", nullable = false)
    private int positionY;

    @Column(name = "turn_order", nullable = false)
    private int turnOrder;

    private Instant cooldown;

    @Column(name = "gold", columnDefinition = "integer default 0")
    @Builder.Default
    private int gold = 0;

    public void addGold(int amount) {
        this.gold += amount;
    }

    public int getMoney() {
        return this.gold;
    }

    public void setMoney(int money) {
        this.gold = money;
    }
}