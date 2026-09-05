package spring.backend.game.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import spring.backend.game.dto.MoveRequest;
import spring.backend.game.dto.MoveResponse;
import spring.backend.game.dto.NpcInfoResponse;
import spring.backend.game.dto.PlayerInfo;
import spring.backend.game.entity.CombatSessionEntity;
import spring.backend.game.entity.EnemyTypeEntity;
import spring.backend.game.entity.PlayerEntity;
import spring.backend.game.entity.WorldCellEntity;
import spring.backend.game.repository.PlayerRepository;
import spring.backend.game.repository.QuestSystem.NpcRepository;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class MovementService {
    private final PlayerRepository playerRepository;
    private final NpcRepository npcRepository;
    private final WorldCellService worldCellService;
    private final WorldZoneService worldZoneService;
    private final CombatService combatService;
    private final LootService lootService;
    private final InventoryService inventoryService;

    @Transactional
    public MoveResponse movePlayer(String playerId, MoveRequest request) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        Instant now = Instant.now();

        if (player.getCooldown() != null && player.getCooldown().isAfter(now)) {
            long secondsLeft = Duration.between(now, player.getCooldown()).toSeconds();
            throw new IllegalStateException("Cooldown is active. Wait " + secondsLeft + "s.");
        }

        int currentX = player.getPositionX();
        int currentY = player.getPositionY();
        int targetX = request.getTargetX();
        int targetY = request.getTargetY();

        int deltaX = Math.abs(targetX - currentX);
        int deltaY = Math.abs(targetY - currentY);

        boolean isAdjacent = (deltaY + deltaX == 1) || (deltaX == 1 && deltaY == 1);
        if (!isAdjacent) {
            throw new IllegalArgumentException("You can move only one coordinate at the same time");
        }

        // World bounds: the map is 1000x1000 and extends into negative coordinates
        if (targetX < WorldConstants.WORLD_MIN || targetX > WorldConstants.WORLD_MAX
                || targetY < WorldConstants.WORLD_MIN || targetY > WorldConstants.WORLD_MAX) {
            throw new IllegalStateException("You cannot move outside the world bounds ("
                    + WorldConstants.WORLD_MIN + ".." + WorldConstants.WORLD_MAX + ")");
        }

        // Admin-configured cells can be completely closed for entering
        if (worldCellService.isBlocked(targetX, targetY)) {
            throw new IllegalStateException("This cell is blocked — you cannot enter it");
        }

        player.setPositionX(targetX);
        player.setPositionY(targetY);
        Instant newCooldown = now.plusSeconds(3);
        player.setCooldown(newCooldown);

        // Entering the city (safe zone) secures every marked field loot item.
        boolean targetInSafeZone = !worldZoneService.isOutsideSafeZone(targetX, targetY);
        int securedLoot = 0;
        if (targetInSafeZone) {
            securedLoot = lootService.clearMarkedItems(playerId);
        }

        // Radiation: configured per cell, damages the player on every step
        int radiationDamage = 0;
        Optional<WorldCellEntity> cellSettings = worldCellService.getSettings(targetX, targetY);
        if (cellSettings.isPresent() && cellSettings.get().getRadiation() > 0) {
            radiationDamage = cellSettings.get().getRadiation();
            player.setHealth(Math.max(0, player.getHealth() - radiationDamage));
        }
        playerRepository.save(player);

        // Enemy ambush: only outside the safe zone, chance and enemy are configured per cell
        UUID combatId = null;
        String enemyName = null;
        boolean combatStarted = false;
        if (worldZoneService.isOutsideSafeZone(targetX, targetY)
                && cellSettings.isPresent()
                && cellSettings.get().getAmbushChance() > 0
                && cellSettings.get().getEnemyType() != null
                && ThreadLocalRandom.current().nextInt(100) < cellSettings.get().getAmbushChance()) {
            EnemyTypeEntity enemy = cellSettings.get().getEnemyType();
            CombatSessionEntity combat = combatService.startBotCombat(playerId, enemy.getCode());
            combatId = combat.getId();
            enemyName = enemy.getName();
            combatStarted = true;
        }

        List<PlayerEntity> playersOnSameTile = playerRepository.findByPositionXAndPositionY(targetX, targetY);

        List<PlayerInfo> playerInfos = playersOnSameTile.stream()
                .map(p -> PlayerInfo.builder()
                        .playerId(p.getId())
                        .username(p.getUsername()) // Since id is now the unique string identifier (GitHub/Guest ID)
                        .build())
                .toList();
                List<NpcInfoResponse> npcInfos = npcRepository.findByPositionXAndPositionYAndLocationIdIsNull(targetX, targetY)
                    .stream()
                    .map(npc -> NpcInfoResponse.builder()
                        .id(npc.getId())
                        .code(npc.getCode())
                        .name(npc.getName())
                        .positionX(npc.getPositionX())
                        .positionY(npc.getPositionY())
                        .build())
                    .toList();

        return MoveResponse.builder()
                .positionX(targetX)
                .positionY(targetY)
                .cooldown(newCooldown)
                .playersOnTile(playerInfos)
                .npcs(npcInfos)
                .health(player.getHealth())
                .radiationDamage(radiationDamage)
                .combatStarted(combatStarted)
                .combatId(combatId)
                .enemyName(enemyName)
                .fieldLoot(lootService.getFieldLoot(targetX, targetY))
                .inventory(inventoryService.getInventory(playerId))
                .lootDeposited(securedLoot > 0)
                .lootDepositedCount(securedLoot)
                .inSafeZone(targetInSafeZone)
                .build();
    }

    /**
     * Teleports a player to an arbitrary world cell (used when entering a
     * building that targets coordinates). No adjacency or ambush checks apply,
     * but cooldown, world bounds, safe-zone loot securing and radiation are
     * handled exactly like a normal move.
     */
    @Transactional
    public MoveResponse teleportPlayer(String playerId, int targetX, int targetY) {
        PlayerEntity player = playerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        Instant now = Instant.now();

        if (player.getCooldown() != null && player.getCooldown().isAfter(now)) {
            long secondsLeft = Duration.between(now, player.getCooldown()).toSeconds();
            throw new IllegalStateException("Cooldown is active. Wait " + secondsLeft + "s.");
        }

        if (targetX < WorldConstants.WORLD_MIN || targetX > WorldConstants.WORLD_MAX
                || targetY < WorldConstants.WORLD_MIN || targetY > WorldConstants.WORLD_MAX) {
            throw new IllegalStateException("You cannot teleport outside the world bounds ("
                    + WorldConstants.WORLD_MIN + ".." + WorldConstants.WORLD_MAX + ")");
        }

        player.setPositionX(targetX);
        player.setPositionY(targetY);
        Instant newCooldown = now.plusSeconds(3);
        player.setCooldown(newCooldown);

        boolean targetInSafeZone = !worldZoneService.isOutsideSafeZone(targetX, targetY);
        int securedLoot = 0;
        if (targetInSafeZone) {
            securedLoot = lootService.clearMarkedItems(playerId);
        }

        int radiationDamage = 0;
        Optional<WorldCellEntity> cellSettings = worldCellService.getSettings(targetX, targetY);
        if (cellSettings.isPresent() && cellSettings.get().getRadiation() > 0) {
            radiationDamage = cellSettings.get().getRadiation();
            player.setHealth(Math.max(0, player.getHealth() - radiationDamage));
        }
        playerRepository.save(player);

        List<PlayerEntity> playersOnSameTile = playerRepository.findByPositionXAndPositionY(targetX, targetY);
        List<PlayerInfo> playerInfos = playersOnSameTile.stream()
                .map(p -> PlayerInfo.builder()
                        .playerId(p.getId())
                        .username(p.getUsername())
                        .build())
                .toList();
        List<NpcInfoResponse> npcInfos = npcRepository
                .findByPositionXAndPositionYAndLocationIdIsNull(targetX, targetY)
                .stream()
                .map(npc -> NpcInfoResponse.builder()
                        .id(npc.getId())
                        .code(npc.getCode())
                        .name(npc.getName())
                        .positionX(npc.getPositionX())
                        .positionY(npc.getPositionY())
                        .build())
                .toList();

        return MoveResponse.builder()
                .positionX(targetX)
                .positionY(targetY)
                .cooldown(newCooldown)
                .playersOnTile(playerInfos)
                .npcs(npcInfos)
                .health(player.getHealth())
                .radiationDamage(radiationDamage)
                .combatStarted(false)
                .combatId(null)
                .enemyName(null)
                .fieldLoot(lootService.getFieldLoot(targetX, targetY))
                .inventory(inventoryService.getInventory(playerId))
                .lootDeposited(securedLoot > 0)
                .lootDepositedCount(securedLoot)
                .inSafeZone(targetInSafeZone)
                .build();
    }
}