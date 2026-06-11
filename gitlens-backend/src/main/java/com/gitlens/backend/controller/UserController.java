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
        List<UserRepoSummary> list = repositoryRepo
            .findByUserIdOrderByCreatedAtDesc(user.getId())
            .stream()
            .map(bookmark -> {
                // For each bookmark, find the canonical data record so we can
                // return accurate commit counts and analyzedAt
                Optional<Repository> completed = repositoryRepo.findByUrl(bookmark.getUrl());
                Repository dataSource = completed.isEmpty() ? bookmark : completed.get();
                return toSummary(bookmark, dataSource);
            })
            .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    // ── POST /api/user/analyze ────────────────────────────────────────────────
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeForUser(@RequestBody RepoSubmitRequest request,
                                            @AuthenticationPrincipal User user) {
        if (request.getRepoUrl() == null || request.getRepoUrl().isBlank())
            return ResponseEntity.badRequest().body(Map.of("error", "repoUrl is required"));

        String url = normalizeUrl(request.getRepoUrl().trim());

        // 1. User already has a bookmark for this URL
        Optional<Repository> existingBookmark = repositoryRepo.findByUrlAndUserId(url, user.getId());
        if (existingBookmark.isPresent()) {
            Repository bm = existingBookmark.get();
            if ("COMPLETED".equals(bm.getStatus())) {
                // Find the canonical data record to return its id
                Optional<Repository> completed = repositoryRepo.findByUrl(url);
                Long dataId = completed.isEmpty() ? bm.getId() : completed.get().getId();
                return ResponseEntity.ok(Map.of(
                    "message", "Already saved — loading cached results",
                    "repositoryId", dataId,
                    "bookmarkId", bm.getId(),
                    "status", "COMPLETED",
                    "cached", true
                ));
            }
            if ("FAILED".equals(bm.getStatus())) {
                bm.setStatus("PENDING");
                repositoryRepo.save(bm);
                gitParserService.parseRepository(bm.getId());
                return ResponseEntity.ok(Map.of(
                    "message", "Re-analyzing previously failed repository",
                    "repositoryId", bm.getId(),
                    "status", "PENDING",
                    "cached", false
                ));
            }
            // PENDING / PROCESSING
            return ResponseEntity.ok(Map.of(
                "message", "Analysis already in progress",
                "repositoryId", bm.getId(),
                "status", bm.getStatus(),
                "cached", false
            ));
        }

        // 2. No user bookmark yet — check if any global COMPLETED parse exists
        Optional<Repository> completed = repositoryRepo.findByUrl(url);
        if (!completed.isEmpty()) {
            Repository global = completed.get();
            // Create thin bookmark pointing to this URL
            Repository bookmark = new Repository();
            bookmark.setUrl(url);
            bookmark.setName(global.getName());
            bookmark.setStatus("COMPLETED");
            bookmark.setTotalCommits(global.getTotalCommits());
            bookmark.setDefaultBranch(global.getDefaultBranch());
            bookmark.setUserId(user.getId());
            bookmark.setAnalyzedAt(global.getAnalyzedAt());
            repositoryRepo.save(bookmark);

            return ResponseEntity.ok(Map.of(
                "message", "Loaded from global cache",
                "repositoryId", global.getId(),   // actual data lives here
                "bookmarkId", bookmark.getId(),
                "status", "COMPLETED",
                "cached", true
            ));
        }

        // 3. Completely new — create bookmark + kick off parse
        String repoName = url.substring(url.lastIndexOf("/") + 1).replace(".git", "");
        try {
            Repository repo = new Repository();
            repo.setUrl(url);
            repo.setName(repoName);
            repo.setStatus("PENDING");
            repo.setUserId(user.getId());
            repositoryRepo.save(repo);

            gitParserService.parseRepository(repo.getId());

            return ResponseEntity.ok(Map.of(
                "message", "Analysis started",
                "repositoryId", repo.getId(),
                "status", "PENDING",
                "cached", false
            ));
        } catch (Exception e) {
            Optional<Repository> race = repositoryRepo.findByUrlAndUserId(url, user.getId());
            if (race.isPresent())
                return ResponseEntity.ok(Map.of(
                    "repositoryId", race.get().getId(),
                    "status", race.get().getStatus(),
                    "cached", false
                ));
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to start: " + e.getMessage()));
        }
    }

    // ── DELETE /api/user/repos/{id} ───────────────────────────────────────────
    @DeleteMapping("/repos/{id}")
    public ResponseEntity<?> deleteRepo(@PathVariable Long id,
                                        @AuthenticationPrincipal User user) {
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
