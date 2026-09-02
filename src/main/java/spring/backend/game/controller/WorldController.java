package spring.backend.game.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.WorldZoneResponse;
import spring.backend.game.service.WorldZoneService;

@RestController
@RequestMapping("/api/v1/world")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.8.96:3000"})
public class WorldController {
    private final WorldZoneService worldZoneService;

    @GetMapping("/safe-zone")
    public ResponseEntity<WorldZoneResponse> getSafeZone() {
        return ResponseEntity.ok(worldZoneService.getSafeZone());
    }
}
