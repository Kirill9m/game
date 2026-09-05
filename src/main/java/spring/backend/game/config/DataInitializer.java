package spring.backend.game.config;

import java.util.List;
import java.util.Set;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Lazy;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import spring.backend.game.entity.QuestSystem.DialogueChoiceEntity;
import spring.backend.game.entity.QuestSystem.DialogueNodeEntity;
import spring.backend.game.entity.QuestSystem.NpcEntity;
import spring.backend.game.entity.QuestSystem.QuestEntity;
import spring.backend.game.entity.GameMapEntity;
import spring.backend.game.entity.ItemEntity;
import spring.backend.game.entity.LocationBuildingEntity;
import spring.backend.game.entity.LocationEntity;
import spring.backend.game.entity.ObstacleTypeEntity;
import spring.backend.game.entity.WeaponTypeEntity;
import spring.backend.game.repository.GameMapRepository;
import spring.backend.game.repository.ItemRepository;
import spring.backend.game.repository.LocationBuildingRepository;
import spring.backend.game.repository.LocationRepository;
import spring.backend.game.repository.ObstacleTypeRepository;
import spring.backend.game.repository.QuestSystem.DialogueNodeRepository;
import spring.backend.game.repository.QuestSystem.NpcRepository;
import spring.backend.game.repository.QuestSystem.QuestRepository;
import spring.backend.game.repository.WeaponTypeRepository;
import spring.backend.game.service.AdminService;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final NpcRepository npcRepository;
    private final QuestRepository questRepository;
    private final DialogueNodeRepository dialogueNodeRepository;
    private final ItemRepository itemRepository;
    private final GameMapRepository mapRepository;
    private final LocationRepository locationRepository;
    private final LocationBuildingRepository locationBuildingRepository;
    private final WeaponTypeRepository weaponTypeRepository;
    private final ObstacleTypeRepository obstacleTypeRepository;
    private final JdbcTemplate jdbcTemplate;
    @Lazy
    private final AdminService adminService;

    @Override
    public void run(String... args) {
        fixDatabaseSchema();
        seedData();
        adminService.promoteConfiguredAdmins();
    }

    @Transactional
    public void seedData() {
        seedWeaponTypes();
        seedItems();
        seedObstacleTypes();
        seedMaps();

        if (npcRepository.count() > 0) {
            npcRepository.findByCodeIgnoreCase("ELDER").ifPresent(this::seedElderDialogue);
            npcRepository.findByCodeIgnoreCase("SMITH").ifPresent(this::seedSmithDialogue);
            npcRepository.findByCodeIgnoreCase("MERCHANT").ifPresent(this::seedMerchantDialogue);
            seedMeetVillagersQuest();
        } else {
            // 1. Create 3 NPCs
            NpcEntity elder = npcRepository
                    .save(NpcEntity.builder().code("ELDER").name("Elder").positionX(0).positionY(0).build());
            NpcEntity blacksmith = npcRepository
                    .save(NpcEntity.builder().code("SMITH").name("Blacksmith").positionX(1).positionY(1).build());
            NpcEntity merchant = npcRepository
                    .save(NpcEntity.builder().code("MERCHANT").name("Merchant").positionX(2).positionY(2).build());

            // 2. Create the "Meet the Villagers" quest
            seedMeetVillagersQuest();

            seedElderDialogue(elder);
            seedSmithDialogue(blacksmith);
            seedMerchantDialogue(merchant);
        }

        seedLocations();
    }

    /**
     * Seeds an example Location tab (Town hub with an Inn and a Blacksmith)
     * and places the Elder NPC in the town. Runs once; the admin panel can
     * then manage everything.
     */
    private void seedLocations() {
        if (locationRepository.count() > 0) {
            return;
        }

        LocationEntity town = locationRepository.save(LocationEntity.builder()
                .code("TOWN")
                .name("Town")
                .positionX(0)
                .positionY(0)
                .backgroundImageUrl(null)
                .isStart(true)
                .build());
        LocationEntity inn = locationRepository.save(LocationEntity.builder()
                .code("INN")
                .name("Inn")
                .positionX(1)
                .positionY(0)
                .backgroundImageUrl(null)
                .isStart(false)
                .build());
        LocationEntity smithy = locationRepository.save(LocationEntity.builder()
                .code("SMITHY")
                .name("Blacksmith")
                .positionX(2)
                .positionY(0)
                .backgroundImageUrl(null)
                .isStart(false)
                .build());

        LocationBuildingEntity innBuilding = locationBuildingRepository.save(LocationBuildingEntity.builder()
                .location(town)
                .name("Inn")
                .x(25)
                .y(45)
                .width(22)
                .height(30)
                .emoji("🏨")
                .backgroundImageUrl(null)
                .targetLocation(inn)
                .build());
        LocationBuildingEntity smithBuilding = locationBuildingRepository.save(LocationBuildingEntity.builder()
                .location(town)
                .name("Blacksmith")
                .x(68)
                .y(40)
                .width(22)
                .height(30)
                .emoji("⚒️")
                .backgroundImageUrl(null)
                .targetLocation(smithy)
                .build());

        // Place NPCs inside specific buildings so they appear only when
        // the player enters through that building.
        npcRepository.findByCodeIgnoreCase("ELDER").ifPresent(elder -> {
            elder.setLocationId(inn.getId());
            elder.setBuildingId(innBuilding.getId());
            elder.setLocationX(50);
            elder.setLocationY(75);
            npcRepository.save(elder);
        });
        npcRepository.findByCodeIgnoreCase("MERCHANT").ifPresent(merchant -> {
            merchant.setLocationId(inn.getId());
            merchant.setBuildingId(innBuilding.getId());
            merchant.setLocationX(25);
            merchant.setLocationY(50);
            npcRepository.save(merchant);
        });
        npcRepository.findByCodeIgnoreCase("SMITH").ifPresent(smith -> {
            smith.setLocationId(smithy.getId());
            smith.setBuildingId(smithBuilding.getId());
            smith.setLocationX(50);
            smith.setLocationY(50);
            npcRepository.save(smith);
        });

        log.info("Seeded example locations: Town, Inn, Blacksmith");
    }

    private void fixDatabaseSchema() {
        try {
            jdbcTemplate.execute("ALTER TABLE player_quests ALTER COLUMN player_id TYPE VARCHAR(255) USING player_id::text");
        } catch (Exception e) {
            log.warn("Database schema update info (player_quests.player_id): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE player_quests ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN NOT NULL DEFAULT FALSE");
        } catch (Exception e) {
            log.warn("Database schema update info (player_quests.reward_claimed): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE location_buildings ADD COLUMN IF NOT EXISTS background_image_url VARCHAR(1000)");
        } catch (Exception e) {
            log.warn("Database schema update info (location_buildings.background_image_url): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE npcs ADD COLUMN IF NOT EXISTS building_id UUID");
        } catch (Exception e) {
            log.warn("Database schema update info (npcs.building_id): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS current_building_id UUID");
        } catch (Exception e) {
            log.warn("Database schema update info (players.current_building_id): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS gold INTEGER NOT NULL DEFAULT 0");
        } catch (Exception e) {
            log.warn("Database schema update info (players.gold): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS quest_points INTEGER NOT NULL DEFAULT 0");
        } catch (Exception e) {
            log.warn("Database schema update info (players.quest_points): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS health INTEGER NOT NULL DEFAULT 100");
        } catch (Exception e) {
            log.warn("Database schema update info (players.health): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1");
        } catch (Exception e) {
            log.warn("Database schema update info (players.level): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS strength INTEGER NOT NULL DEFAULT 5");
        } catch (Exception e) {
            log.warn("Database schema update info (players.strength): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS energy INTEGER NOT NULL DEFAULT 10");
        } catch (Exception e) {
            log.warn("Database schema update info (players.energy): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS agility INTEGER NOT NULL DEFAULT 5");
        } catch (Exception e) {
            log.warn("Database schema update info (players.agility): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS stamina INTEGER NOT NULL DEFAULT 10");
        } catch (Exception e) {
            log.warn("Database schema update info (players.stamina): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'PLAYER'");
        } catch (Exception e) {
            log.warn("Database schema update info (players.role): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE players ADD COLUMN IF NOT EXISTS starter_items_granted BOOLEAN NOT NULL DEFAULT FALSE");
        } catch (Exception e) {
            log.warn("Database schema update info (players.starter_items_granted): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE items ADD COLUMN IF NOT EXISTS weapon_type_code VARCHAR(50)");
        } catch (Exception e) {
            log.warn("Database schema update info (items.weapon_type_code): {}", e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE items ADD COLUMN IF NOT EXISTS heal INTEGER NOT NULL DEFAULT 0");
        } catch (Exception e) {
            log.warn("Database schema update info (items.heal): {}", e.getMessage());
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

        try {
            jdbcTemplate.execute("CREATE TABLE IF NOT EXISTS quest_log_entries (" +
                    "id UUID PRIMARY KEY, " +
                    "player_quest_id UUID NOT NULL, " +
                    "message VARCHAR(500) NOT NULL, " +
                    "timestamp TIMESTAMP NOT NULL, " +
                    "FOREIGN KEY (player_quest_id) REFERENCES player_quests(id))");
        } catch (Exception e) {
            log.warn("Database schema update info (quest_log_entries): {}", e.getMessage());
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
                    .title("Meet the Villagers")
                    .rewardExp(100)
                    .rewardGold(50)
                    .rewardItemCode("RANDOM")
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
				.text("Greetings, traveler! Welcome to our village. Be careful beyond the safe zone.")
				.isStart(true)
				.build();

		DialogueChoiceEntity elderChoiceClose = DialogueChoiceEntity.builder()
				.node(elderStart)
				.text("Thanks for the advice, Elder.")
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
                .text("Hey there, traveler! I'm the blacksmith of this town.")
                .isStart(true)
                .build();

        DialogueChoiceEntity smithChoiceClose = DialogueChoiceEntity.builder()
                .node(smithStart)
                .text("Nice to meet you, I'll be on my way.")
                .nextNode(null) // Ends the dialogue -> counts the talk
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
				.text("Welcome to my shop! Great goods will be available for sale soon.")
				.isStart(true)
				.build();

		DialogueChoiceEntity merchantChoiceClose = DialogueChoiceEntity.builder()
				.node(merchantStart)
				.text("Alright, I'll check back later.")
				.nextNode(null)
				.build();

		merchantStart.setChoices(List.of(merchantChoiceClose));
		dialogueNodeRepository.save(merchantStart);
	}

        private void seedWeaponTypes() {
                saveWeaponTypeIfMissing("KNIFE", "Knife", 10, 50);
                saveWeaponTypeIfMissing("PISTOL", "Pistol", 5, 25);
                saveWeaponTypeIfMissing("SMG", "Submachine Gun", 4, 20);
                saveWeaponTypeIfMissing("RIFLE", "Rifle", 3, 15);
                saveWeaponTypeIfMissing("SHOTGUN", "Shotgun", 5, 20);
        }

        private void saveWeaponTypeIfMissing(String code, String name, int accuracyPerLevel, int maxAccuracy) {
                if (weaponTypeRepository.existsByCodeIgnoreCase(code)) {
                        return;
                }
                weaponTypeRepository.save(WeaponTypeEntity.builder()
                                .code(code)
                                .name(name)
                                .accuracyPerLevel(accuracyPerLevel)
                                .maxAccuracy(maxAccuracy)
                                .build());
        }

        private void seedItems() {
                saveItemIfMissing("KNIFE", "Knife", "WEAPON", "KNIFE", 15, 1, 1, 2);
                saveItemIfMissing("PISTOL", "Pistol", "WEAPON", "PISTOL", 25, 3, 1, 2);
                saveItemIfMissing("WORLD_MAP", "World Map", "UTILITY", null, 0, 0, 2, 2);
                saveItemIfMissing("DESERT_MAP", "Desert Map", "UTILITY", null, 0, 0, 2, 2);
                // Backfill weapon types on pre-existing seeded weapons.
                backfillWeaponType("KNIFE", "KNIFE");
                backfillWeaponType("PISTOL", "PISTOL");
                // Starter armor set (one piece per equipment slot).
                saveArmorIfMissing("LEATHER_HELMET", "Leather Helmet", "HELMET", 2);
                saveArmorIfMissing("LEATHER_VEST", "Leather Vest", "BODY", 4);
                saveArmorIfMissing("LEATHER_LEGS", "Leather Leggings", "LEGS", 3);
                saveArmorIfMissing("LEATHER_BOOTS", "Leather Boots", "FEET", 1);
                // Health-restoring consumables (usable in and out of combat).
                saveConsumableIfMissing("MEDKIT", "Medkit", 50);
                saveConsumableIfMissing("BANDAGE", "Bandage", 15);
        }

        private void saveConsumableIfMissing(String code, String name, int heal) {
                if (itemRepository.findByCodeIgnoreCase(code).isPresent()) {
                        return;
                }
                itemRepository.save(ItemEntity.builder()
                                .code(code)
                                .name(name)
                                .type("CONSUMABLE")
                                .weaponTypeCode(null)
                                .damage(0)
                                .attackRange(0)
                                .width(1)
                                .height(1)
                                .defense(0)
                                .equipmentSlot(null)
                                .heal(heal)
                                .build());
        }

        private void saveArmorIfMissing(String code, String name, String slot, int defense) {
                if (itemRepository.findByCodeIgnoreCase(code).isPresent()) {
                        return;
                }
                itemRepository.save(ItemEntity.builder()
                                .code(code)
                                .name(name)
                                .type("ARMOR")
                                .weaponTypeCode(null)
                                .damage(0)
                                .attackRange(0)
                                .width(1)
                                .height(1)
                                .defense(defense)
                                .equipmentSlot(slot)
                                .build());
        }

        private void backfillWeaponType(String itemCode, String weaponTypeCode) {
                itemRepository.findByCodeIgnoreCase(itemCode).ifPresent(item -> {
                        if (item.getWeaponTypeCode() == null || item.getWeaponTypeCode().isBlank()) {
                                item.setWeaponTypeCode(weaponTypeCode);
                                itemRepository.save(item);
                        }
                });
        }

        /**
         * Seed the plugin-generated world maps. Each map is a separate world
         * area with its own center / radius, bound to an inventory item code.
         */
        private void seedObstacleTypes() {
                saveObstacleTypeIfMissing("CRATE", "Crate", 20);
                saveObstacleTypeIfMissing("BARREL", "Barrel", 15);
                saveObstacleTypeIfMissing("WALL", "Concrete Wall", 40);
                saveObstacleTypeIfMissing("ROCK", "Boulder", 50);
        }

        private void saveObstacleTypeIfMissing(String code, String name, int maxHealth) {
                if (obstacleTypeRepository.existsByCodeIgnoreCase(code)) {
                        return;
                }
                obstacleTypeRepository.save(ObstacleTypeEntity.builder()
                                .code(code)
                                .name(name)
                                .maxHealth(maxHealth)
                                .build());
        }

        private void seedMaps() {
                saveMapIfMissing("WORLD_MAP", "World Map",
                        "The wilderness around the village. Blue is safe, red is dangerous.",
                        0, 0, 4, "WORLD_MAP");
                saveMapIfMissing("DESERT_MAP", "Desert Map",
                        "Scorched dunes far to the east — watch out for radiation and raiders.",
                        40, -20, 6, "DESERT_MAP");
        }

        private void saveMapIfMissing(String code, String name, String description,
                        int centerX, int centerY, int radius, String itemCode) {
                if (mapRepository.findByCodeIgnoreCase(code).isPresent()) {
                        return;
                }
                mapRepository.save(GameMapEntity.builder()
                                .code(code)
                                .name(name)
                                .description(description)
                                .centerX(centerX)
                                .centerY(centerY)
                                .radius(radius)
                                .itemCode(itemCode)
                                .build());
        }

        private void saveItemIfMissing(
                        String code, String name, String type, String weaponTypeCode, int damage, int attackRange, int width, int height) {
                if (itemRepository.findByCodeIgnoreCase(code).isPresent()) {
                        return;
                }
                itemRepository.save(ItemEntity.builder()
                                .code(code)
                                .name(name)
                                .type(type)
                                .weaponTypeCode(weaponTypeCode)
                                .damage(damage)
                                .attackRange(attackRange)
                                .width(width)
                                .height(height)
                                .build());
        }
}