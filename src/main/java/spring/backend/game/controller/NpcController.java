package spring.backend.game.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import spring.backend.game.dto.NpcDialogueResponse;
import spring.backend.game.dto.NpcInfoResponse;
import spring.backend.game.service.NpcService;

@RestController
@RequestMapping("/api/v1/npcs")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.8.96:3000"})
public class NpcController {
    private final NpcService npcService;

    @GetMapping
    public ResponseEntity<List<NpcInfoResponse>> getNpcsAt(
            @RequestParam int x,
            @RequestParam int y) {
        return ResponseEntity.ok(npcService.getNpcsAt(x, y));
    }

    @PostMapping("/{npcCode}/talk")
    public ResponseEntity<NpcDialogueResponse> talk(
            @PathVariable String npcCode,
            @RequestParam String playerId) {
        return ResponseEntity.ok(npcService.talk(playerId, npcCode));
    }
}