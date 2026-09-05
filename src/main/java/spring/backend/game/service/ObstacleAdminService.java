package spring.backend.game.service;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import spring.backend.game.dto.AdminDtos;
import spring.backend.game.entity.ObstacleTypeEntity;
import spring.backend.game.repository.ObstacleTypeRepository;
import spring.backend.game.repository.WorldCellRepository;

/**
 * Admin operations for destructible combat obstacle types.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ObstacleAdminService {

    private final ObstacleTypeRepository obstacleTypeRepository;
    private final WorldCellRepository worldCellRepository;

    @Transactional(readOnly = true)
    public List<AdminDtos.AdminObstacleTypeDto> getAllObstacleTypes() {
        return obstacleTypeRepository.findAllByOrderByNameAsc().stream()
                .map(this::toObstacleTypeDto)
                .toList();
    }

    @Transactional
    public AdminDtos.AdminObstacleTypeDto createObstacleType(String code, String name, Integer maxHealth) {
        String normalizedCode = requireNonBlank(code, "Obstacle type code is required").trim().toUpperCase(Locale.ROOT);
        if (obstacleTypeRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new IllegalArgumentException("Obstacle type code already exists: " + normalizedCode);
        }
        ObstacleTypeEntity type = obstacleTypeRepository.save(ObstacleTypeEntity.builder()
                .code(normalizedCode)
                .name(requireNonBlank(name, "Obstacle type name is required").trim())
                .maxHealth(Math.max(1, maxHealth == null ? 30 : maxHealth))
                .build());
        log.info("Admin created obstacle type '{}' ({}, {} HP)", type.getName(), type.getCode(), type.getMaxHealth());
        return toObstacleTypeDto(type);
    }

    @Transactional
    public AdminDtos.AdminObstacleTypeDto updateObstacleType(UUID obstacleTypeId, String name, Integer maxHealth) {
        ObstacleTypeEntity type = obstacleTypeRepository.findById(obstacleTypeId)
                .orElseThrow(() -> new EntityNotFoundException("Obstacle type not found: " + obstacleTypeId));
        if (name != null && !name.isBlank()) {
            type.setName(name.trim());
        }
        if (maxHealth != null) {
            type.setMaxHealth(Math.max(1, maxHealth));
        }
        obstacleTypeRepository.save(type);
        log.info("Admin updated obstacle type '{}' ({})", type.getName(), type.getCode());
        return toObstacleTypeDto(type);
    }

    @Transactional
    public void deleteObstacleType(UUID obstacleTypeId) {
        ObstacleTypeEntity type = obstacleTypeRepository.findById(obstacleTypeId)
                .orElseThrow(() -> new EntityNotFoundException("Obstacle type not found: " + obstacleTypeId));
        // Detach the type from every world cell before deleting it.
        worldCellRepository.findAll().forEach(cell -> {
            if (cell.getObstacleTypes().removeIf(obstacle -> obstacle.getId().equals(type.getId()))) {
                worldCellRepository.save(cell);
            }
        });
        obstacleTypeRepository.delete(type);
        log.info("Admin deleted obstacle type '{}'", type.getCode());
    }

    private AdminDtos.AdminObstacleTypeDto toObstacleTypeDto(ObstacleTypeEntity type) {
        return new AdminDtos.AdminObstacleTypeDto(type.getId(), type.getCode(), type.getName(), type.getMaxHealth());
    }

    private static String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return value;
    }
}
