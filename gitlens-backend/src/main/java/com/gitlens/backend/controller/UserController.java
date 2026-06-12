package com.gitlens.backend.controller;

import com.gitlens.backend.dto.RepoSubmitRequest;
import com.gitlens.backend.dto.UserRepoSummary;
import com.gitlens.backend.gitparser.GitParserService;
import com.gitlens.backend.model.Repository;
import com.gitlens.backend.model.User;
import com.gitlens.backend.repository.RepositoryRepo;
import com.gitlens.backend.security.JwtUtil;
import com.gitlens.backend.repository.UserRepo;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final RepositoryRepo repositoryRepo;
    private final GitParserService gitParserService;
    private final JwtUtil jwtUtil;
    private final UserRepo userRepo;

    public UserController(RepositoryRepo repositoryRepo,
                          GitParserService gitParserService,
                          JwtUtil jwtUtil,
                          UserRepo userRepo) {
        this.repositoryRepo   = repositoryRepo;
        this.gitParserService = gitParserService;
        this.jwtUtil          = jwtUtil;
        this.userRepo         = userRepo;
    }

    // ── GET /api/user/repos ────────────────────────────────────────────────────
    @GetMapping("/repos")
    public ResponseEntity<?> getMyRepos(@AuthenticationPrincipal User user) {
        if (user == null)
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));

        List<UserRepoSummary> list = repositoryRepo
            .findByUserIdOrderByCreatedAtDesc(user.getId())
            .stream()
            .map(repo -> toSummary(repo, repo))  // ← same record is both bookmark and data
            .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    // ── POST /api/user/analyze ────────────────────────────────────────────────
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeForUser(@RequestBody RepoSubmitRequest request,
                                            @AuthenticationPrincipal User user) {
        if (user == null)
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));

        String url = normalizeUrl(request.getRepoUrl().trim());

        // Check if this user already has this repo
        Optional<Repository> existing = repositoryRepo.findByUrlAndUserId(url, user.getId());
        if (existing.isPresent()) {
            return ResponseEntity.ok(Map.of(
                "message", "Already saved",
                "repositoryId", existing.get().getId(),
                "status", existing.get().getStatus(),
                "cached", "COMPLETED".equals(existing.get().getStatus())
            ));
        }

        // Not saved yet — return not found so frontend knows to save via /store
        return ResponseEntity.ok(Map.of(
            "message", "Not saved yet",
            "cached", false
        ));
    }

    // ── DELETE /api/user/repos/{id} ───────────────────────────────────────────
    @DeleteMapping("/repos/{id}")
    public ResponseEntity<?> deleteRepo(@PathVariable Long id,
                                        @AuthenticationPrincipal User user) {
        if (user == null)
            return ResponseEntity.status(401).body(Map.of("error", "Not authenticated"));
        Optional<Repository> repo = repositoryRepo.findById(id);
        if (repo.isEmpty() || !user.getId().equals(repo.get().getUserId()))
            return ResponseEntity.notFound().build();
        repositoryRepo.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Removed"));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private String normalizeUrl(String input) {
        if (input.startsWith("https://") || input.startsWith("http://"))
            return input.replaceAll("\\.git$", "").replaceAll("/$", "");
        if (input.startsWith("github.com/"))
            return "https://" + input.replaceAll("\\.git$", "").replaceAll("/$", "");
        if (input.matches("[^/]+/[^/]+"))
            return "https://github.com/" + input.replaceAll("\\.git$", "");
        return input;
    }

    private UserRepoSummary toSummary(Repository bookmark, Repository dataSource) {
        UserRepoSummary s = new UserRepoSummary();
        s.setId(bookmark.getId());
        s.setName(bookmark.getName() != null ? bookmark.getName() : dataSource.getName());
        s.setUrl(bookmark.getUrl());
        s.setStatus(bookmark.getStatus());
        s.setTotalCommits(dataSource.getTotalCommits());
        s.setAnalyzedAt(dataSource.getAnalyzedAt() != null ? dataSource.getAnalyzedAt().toString() : null);
        return s;
    }
}