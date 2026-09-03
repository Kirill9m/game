package spring.backend.game.config;

import java.util.List;
import java.util.Set;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import spring.backend.game.entity.QuestSystem.DialogueChoiceEntity;
import spring.backend.game.entity.QuestSystem.DialogueNodeEntity;
import spring.backend.game.entity.QuestSystem.NpcEntity;
import spring.backend.game.entity.QuestSystem.QuestEntity;
import spring.backend.game.entity.ItemEntity;
import spring.backend.game.repository.ItemRepository;
import spring.backend.game.repository.QuestSystem.DialogueNodeRepository;
import spring.backend.game.repository.QuestSystem.NpcRepository;
import spring.backend.game.repository.QuestSystem.QuestRepository;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final NpcRepository npcRepository;
    private final QuestRepository questRepository;
    private final DialogueNodeRepository dialogueNodeRepository;
    private final ItemRepository itemRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        fixDatabaseSchema();
        seedData();
    }

    @Transactional
    public void seedData() {
        seedItems();

        if (npcRepository.count() > 0) {
            npcRepository.findByCodeIgnoreCase("ELDER").ifPresent(this::seedElderDialogue);
            npcRepository.findByCodeIgnoreCase("SMITH").ifPresent(this::seedSmithDialogue);
            npcRepository.findByCodeIgnoreCase("MERCHANT").ifPresent(this::seedMerchantDialogue);
            seedMeetVillagersQuest();
            return;
        }

        // 1. Создаем 3-х NPC
        NpcEntity elder = npcRepository
                .save(NpcEntity.builder().code("ELDER").name("Старейшина").positionX(10).positionY(10).build());
        NpcEntity blacksmith = npcRepository
                .save(NpcEntity.builder().code("SMITH").name("Кузнец").positionX(20).positionY(15).build());
        NpcEntity merchant = npcRepository
                .save(NpcEntity.builder().code("MERCHANT").name("Торговец").positionX(5).positionY(30).build());

        // 2. Создаем квест "Познакомиться со всеми"
        seedMeetVillagersQuest();

        seedElderDialogue(elder);
        seedSmithDialogue(blacksmith);
        seedMerchantDialogue(merchant);
    }

    private void fixDatabaseSchema() {
        try {
            jdbcTemplate.execute("ALTER TABLE player_quests ALTER COLUMN player_id TYPE VARCHAR(255) USING player_id::text");
        } catch (Exception e) {
            log.warn("Database schema update info (player_quests.player_id): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS gold INTEGER NOT NULL DEFAULT 0");
        } catch (Exception e) {
            log.warn("Database schema update info (players.gold): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE quests ADD COLUMN IF NOT EXISTS reward_item_code VARCHAR(50)");
        } catch (Exception e) {
            log.warn("Database schema update info (quests.reward_item_code): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS player_talked_npcs (" +
                    "player_quest_id UUID NOT NULL, " +
                    "npc_id UUID NOT NULL, " +
                    "PRIMARY KEY (player_quest_id, npc_id))");
        } catch (Exception e) {
            log.warn("Database schema update info (player_talked_npcs): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS quest_required_npcs (" +
                    "quest_id UUID NOT NULL, " +
                    "npc_id UUID NOT NULL, " +
                    "PRIMARY KEY (quest_id, npc_id))");
        } catch (Exception e) {
            log.warn("Database schema update info (quest_required_npcs): {}", e.getMessage());
        }
    }

    private void seedMeetVillagersQuest() {
        if (questRepository.findByCode("MEET_VILLAGERS").isPresent()) {
            return;
        }

        NpcEntity elder = npcRepository.findByCodeIgnoreCase("ELDER").orElse(null);
        NpcEntity blacksmith = npcRepository.findByCodeIgnoreCase("SMITH").orElse(null);
        NpcEntity merchant = npcRepository.findByCodeIgnoreCase("MERCHANT").orElse(null);

        if (elder != null && blacksmith != null && merchant != null) {
            questRepository.save(QuestEntity.builder()
                    .code("MEET_VILLAGERS")
                    .title("Знакомство с деревней")
                    .rewardExp(100)
                    .rewardGold(50)
                    .requiredNpcs(Set.of(elder, blacksmith, merchant))
                    .build());
        }
    }

	private void seedElderDialogue(NpcEntity elder) {
		if (dialogueNodeRepository.findByNpcIdAndIsStartTrue(elder.getId()).isPresent()) {
			return;
		}

		DialogueNodeEntity elderStart = DialogueNodeEntity.builder()
				.npc(elder)
				.text("Приветствую тебя в нашей деревне, путник! Будь осторожен за пределами безопасной зоны.")
				.isStart(true)
				.build();

		DialogueChoiceEntity elderChoiceClose = DialogueChoiceEntity.builder()
				.node(elderStart)
				.text("Спасибо за совет, старейшина.")
				.nextNode(null)
				.build();

		elderStart.setChoices(List.of(elderChoiceClose));
		dialogueNodeRepository.save(elderStart);
	}

        private void seedSmithDialogue(NpcEntity blacksmith) {
                if (dialogueNodeRepository.findByNpcIdAndIsStartTrue(blacksmith.getId()).isPresent()) {
                        return;
                }

        DialogueNodeEntity smithStart = DialogueNodeEntity.builder()
                .npc(blacksmith)
                .text("Здорово, путник! Я кузнец этого города.")
                .isStart(true)
                .build();

        DialogueChoiceEntity smithChoiceClose = DialogueChoiceEntity.builder()
                .node(smithStart)
                .text("Приятно познакомиться, я пойду дальше.")
                .nextNode(null) // Завершает диалог -> засчитает разговор
                .build();

        smithStart.setChoices(List.of(smithChoiceClose));
        dialogueNodeRepository.save(smithStart);
    }

	private void seedMerchantDialogue(NpcEntity merchant) {
		if (dialogueNodeRepository.findByNpcIdAndIsStartTrue(merchant.getId()).isPresent()) {
			return;
		}

		DialogueNodeEntity merchantStart = DialogueNodeEntity.builder()
				.npc(merchant)
				.text("Добро пожаловать в мою лавку! Скоро у меня появятся отличные товары на продажу.")
				.isStart(true)
				.build();

		DialogueChoiceEntity merchantChoiceClose = DialogueChoiceEntity.builder()
				.node(merchantStart)
				.text("Хорошо, я загляну позже.")
				.nextNode(null)
				.build();

		merchantStart.setChoices(List.of(merchantChoiceClose));
		dialogueNodeRepository.save(merchantStart);
	}

        private void seedItems() {
                saveItemIfMissing("KNIFE", "Knife", "WEAPON", 15, 1, 1, 2);
                saveItemIfMissing("PISTOL", "Pistol", "WEAPON", 25, 3, 1, 2);
                saveItemIfMissing("WORLD_MAP", "World Map", "UTILITY", 0, 0, 2, 2);
        }

        private void saveItemIfMissing(
                        String code, String name, String type, int damage, int attackRange, int width, int height) {
                if (itemRepository.findByCodeIgnoreCase(code).isPresent()) {
                        return;
                }
                itemRepository.save(ItemEntity.builder()
                                .code(code)
                                .name(name)
                                .type(type)
                                .damage(damage)
                                .attackRange(attackRange)
                                .width(width)
                                .height(height)
                                .build());
        }
}