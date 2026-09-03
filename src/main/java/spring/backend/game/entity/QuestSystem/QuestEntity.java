package spring.backend.game.entity.QuestSystem;

import java.util.Set;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "quests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String code; // e.g. "TALK_TO_ALL_VILLAGERS"

    @Column(nullable = false)
    private String title;

    private int rewardExp;
    private int rewardGold;

    @Column(name = "reward_item_code")
    private String rewardItemCode;

    @ManyToMany
    @JoinTable(name = "quest_required_npcs", joinColumns = @JoinColumn(name = "quest_id"), inverseJoinColumns = @JoinColumn(name = "npc_id"))
    private Set<NpcEntity> requiredNpcs;
}