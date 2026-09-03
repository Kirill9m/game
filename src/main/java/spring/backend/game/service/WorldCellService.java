package spring.backend.game.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import spring.backend.game.dto.AdminDtos.AdminEnemyTypeDto;
import spring.backend.game.dto.AdminDtos.AdminWorldCellDto;
import spring.backend.game.dto.AdminDtos.UpsertWorldCellRequest;
import spring.backend.game.dto.WorldCellResponse;
import spring.backend.game.entity.EnemyTypeEntity;
import spring.backend.game.entity.WorldCellEntity;
import spring.backend.game.repository.EnemyTypeRepository;
import spring.backend.game.repository.WorldCellRepository;

/**
 * Per-cell world settings (blocking, radiation, enemy ambush).
 * Used by the movement logic and managed from the admin panel.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorldCellService {

    private final WorldCellRepository worldCellRepository;
    private final EnemyTypeRepository enemyTypeRepository;

    // --- Player-facing queries ---

    /** Settings of a single cell (empty when the cell has no custom settings). */
    public Optional<WorldCellEntity> getSettings(int x, int y) {
        return worldCellRepository.findByPositionXAndPositionY(x, y);
    }

    /** True when the cell is configured as blocked. */
    public boolean isBlocked(int x, int y) {
        return worldCellRepository.findByPositionXAndPositionY(x, y)
                .map(WorldCellEntity::isBlocked)
                .orElse(false);
    }

    /** Public list of configured cells for the client world map. */
    @Transactional(readOnly = true)
    public List<WorldCellResponse> getPublicCells() {
        return worldCellRepository.findAllByOrderByIdAsc().stream()
                .map(this::toPublicResponse)
                .toList();
    }

    // --- Admin management ---

    @Transactional(readOnly = true)
    public List<AdminWorldCellDto> getAllCells() {
        return worldCellRepository.findAllByOrderByIdAsc().stream()
                .map(this::toAdminDto)
                .toList();
    }

    /** Create or update settings for a single cell. */
    @Transactional
    public AdminWorldCellDto upsertCell(UpsertWorldCellRequest request) {
        if (request == null || request.positionX() == null || request.positionY() == null) {
            throw new IllegalArgumentException("positionX and positionY are required");
        }
        int x = request.positionX();
        int y = request.positionY();
        if (x < WorldConstants.WORLD_MIN || x > WorldConstants.WORLD_MAX
                || y < WorldConstants.WORLD_MIN || y > WorldConstants.WORLD_MAX) {
            throw new IllegalArgumentException(
                    "Coordinates must be within " + WorldConstants.WORLD_MIN + ".." + WorldConstants.WORLD_MAX);
        }
        boolean blocked = Boolean.TRUE.equals(request.blocked());
        int radiation = clamp(request.radiation(), 0, 1000, 0);
        int ambushChance = clamp(request.ambushChance(), 0, 100, 0);
        EnemyTypeEntity enemy = resolveEnemy(request.enemyTypeId(), ambushChance);

        WorldCellEntity cell = worldCellRepository.findByPositionXAndPositionY(x, y)
                .orElseGet(() -> WorldCellEntity.builder().positionX(x).positionY(y).build());
        cell.setBlocked(blocked);
        cell.setRadiation(radiation);
        cell.setAmbushChance(ambushChance);
        cell.setEnemyType(enemy);
        WorldCellEntity saved = worldCellRepository.save(cell);
        log.info("World cell [{},{}] configured: blocked={}, radiation={}, ambush={}%, enemy={}",
                x, y, blocked, radiation, ambushChance, enemy == null ? "none" : enemy.getCode());
        return toAdminDto(saved);
    }

    @Transactional
    public void deleteCell(Long cellId) {
        WorldCellEntity cell = worldCellRepository.findById(cellId)
                .orElseThrow(() -> new EntityNotFoundException("World cell not found: " + cellId));
        worldCellRepository.delete(cell);
        log.info("World cell [{},{}] settings removed", cell.getPositionX(), cell.getPositionY());
    }

    /** Detach the given enemy type from all cells (called when an enemy type is deleted). */
    @Transactional
    public void detachEnemyType(UUID enemyTypeId) {
        for (WorldCellEntity cell : worldCellRepository.findByEnemyTypeId(enemyTypeId)) {
            cell.setEnemyType(null);
            cell.setAmbushChance(0);
            worldCellRepository.save(cell);
        }
    }

    private EnemyTypeEntity resolveEnemy(UUID enemyTypeId, int ambushChance) {
        if (enemyTypeId == null) {
            return null;
        }
        EnemyTypeEntity enemy = enemyTypeRepository.findById(enemyTypeId)
                .orElseThrow(() -> new EntityNotFoundException("Enemy type not found: " + enemyTypeId));
        if (ambushChance <= 0) {
            throw new IllegalArgumentException("Ambush chance must be above 0 when an enemy is selected");
        }
        return enemy;
    }

    private static int clamp(Integer value, int min, int max, int fallback) {
        int v = value == null ? fallback : value;
        return Math.max(min, Math.min(max, v));
    }

    private WorldCellResponse toPublicResponse(WorldCellEntity cell) {
        return WorldCellResponse.builder()
                .positionX(cell.getPositionX())
                .positionY(cell.getPositionY())
                .blocked(cell.isBlocked())
                .radiation(cell.getRadiation())
                .ambushChance(cell.getAmbushChance())
                .enemyName(cell.getEnemyType() == null ? null : cell.getEnemyType().getName())
                .build();
    }

    private AdminWorldCellDto toAdminDto(WorldCellEntity cell) {
        AdminEnemyTypeDto enemy = cell.getEnemyType() == null ? null : new AdminEnemyTypeDto(
                cell.getEnemyType().getId(),
                cell.getEnemyType().getCode(),
                cell.getEnemyType().getName(),
                cell.getEnemyType().getMaxHealth(),
                cell.getEnemyType().getDamage(),
                cell.getEnemyType().getAttackRange(),
                cell.getEnemyType().getActionPoints(),
                cell.getEnemyType().getMovementRange());
        return new AdminWorldCellDto(cell.getId(), cell.getPositionX(), cell.getPositionY(),
                cell.isBlocked(), cell.getRadiation(), cell.getAmbushChance(), enemy);
    }
}