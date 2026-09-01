package spring.backend.game.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import spring.backend.game.entity.PlayerEntity;

import java.util.List;

@Repository
public interface PlayerRepository extends JpaRepository<PlayerEntity, String> {
    List<PlayerEntity> findByPositionXAndPositionY(int positionX, int positionY);
}
