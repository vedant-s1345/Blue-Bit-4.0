package com.gitlens.backend.controller;

import com.gitlens.backend.repository.RepositoryRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class Keepalivecontroller {

    private final RepositoryRepo repositoryRepo;

    public Keepalivecontroller(RepositoryRepo repositoryRepo) {
        this.repositoryRepo = repositoryRepo;
    }

    // GET /api/ping
    // Runs a real DB query (COUNT) to prevent Supabase from going idle.
    // Called by cron-job.org every 10 minutes.
    @GetMapping("/ping")
    public ResponseEntity<?> ping() {
        long count = repositoryRepo.count(); // actual DB round-trip
        return ResponseEntity.ok(Map.of(
            "status", "ok",
            "time",   LocalDateTime.now().toString(),
            "repos",  count
        ));
    }
}