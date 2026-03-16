package com.gitlens.backend.controller;

import com.gitlens.backend.dto.*;
import com.gitlens.backend.gitparser.GitParserService;
import com.gitlens.backend.model.Repository;
import com.gitlens.backend.repository.RepositoryRepo;
import com.gitlens.backend.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.gitlens.backend.service.AiInsightService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class GitLensController {

    private final RepositoryRepo repositoryRepo;
    private final GitParserService gitParserService;
    private final AnalyticsService analyticsService;
    private final AiInsightService aiInsightService;

    public GitLensController(RepositoryRepo repositoryRepo,
                             GitParserService gitParserService,
                             AnalyticsService analyticsService,
                             AiInsightService aiInsightService) {
        this.repositoryRepo = repositoryRepo;
        this.gitParserService = gitParserService;
        this.analyticsService = analyticsService;
        this.aiInsightService = aiInsightService;
    }

    // POST /api/analyze — submit a repo URL for analysis
    @PostMapping("/analyze")
    public ResponseEntity<?> analyzeRepo(@RequestBody RepoSubmitRequest request) {
    	if (request.getRepoUrl() == null || request.getRepoUrl().isBlank()) {
    	    return ResponseEntity.badRequest().body(Map.of("error", "repoUrl is required"));
    	}

    	if (!isValidGitUrl(request.getRepoUrl())) {
    	    return ResponseEntity.badRequest().body(Map.of(
    	        "error", "Invalid Git URL. Must be a valid GitHub, GitLab, Bitbucket, or Azure DevOps URL."
    	    ));
    	}

        // Check if already analyzed
        var existing = repositoryRepo.findByUrl(request.getRepoUrl());
        if (existing.isPresent()) {
            String currentStatus = existing.get().getStatus();

            // If FAILED, reset and allow re-analysis
            if ("FAILED".equals(currentStatus)) {
                existing.get().setStatus("PENDING");
                repositoryRepo.save(existing.get());
                gitParserService.parseRepository(existing.get().getId());
                return ResponseEntity.ok(Map.of(
                    "message", "Re-analysis started for previously failed repository",
                    "repositoryId", existing.get().getId(),
                    "status", "PENDING"
                ));
            }

            // If already COMPLETED or PROCESSING, just return current state
            return ResponseEntity.ok(Map.of(
                "message", "Repository already exists",
                "repositoryId", existing.get().getId(),
                "status", currentStatus
            ));
        }

        // Extract repo name from URL
        String url = request.getRepoUrl();
        String repoName = url.substring(url.lastIndexOf("/") + 1).replace(".git", "");

     // Save repo entry
        try {
            Repository repo = new Repository();
            repo.setUrl(url);
            repo.setName(repoName);
            repo.setStatus("PENDING");
            repositoryRepo.save(repo);

            // Trigger async parsing
            gitParserService.parseRepository(repo.getId());

            return ResponseEntity.ok(Map.of(
                "message", "Analysis started",
                "repositoryId", repo.getId(),
                "status", "PENDING"
            ));
        } catch (Exception e) {
            // Handles rare race condition where two requests sneak past the duplicate check
            var raceConditionRepo = repositoryRepo.findByUrl(url);
            if (raceConditionRepo.isPresent()) {
                return ResponseEntity.ok(Map.of(
                    "message", "Repository already exists",
                    "repositoryId", raceConditionRepo.get().getId(),
                    "status", raceConditionRepo.get().getStatus()
                ));
            }
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to start analysis: " + e.getMessage()));
        }
    }

    // GET /api/status/{id} — check analysis progress
    @GetMapping("/status/{id}")
    public ResponseEntity<?> getStatus(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(analyticsService.getRepoStatus(id));
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    // GET /api/timeline/{id} — get commit timeline
    @GetMapping("/timeline/{id}")
    public ResponseEntity<Page<CommitDTO>> getTimeline(
            @PathVariable Long id,
            @PageableDefault(size = 50, sort = "commitDate") Pageable pageable) {
        return ResponseEntity.ok(analyticsService.getTimelinePaged(id, pageable));
    }

    // GET /api/heatmap/{id} — get file heatmap
    @GetMapping("/heatmap/{id}")
    public ResponseEntity<List<HeatmapDTO>> getHeatmap(@PathVariable Long id) {
        return ResponseEntity.ok(analyticsService.getHeatmap(id));
    }

    // GET /api/contributors/{id} — get contributor graph data
    @GetMapping("/contributors/{id}")
    public ResponseEntity<List<ContributorDTO>> getContributors(@PathVariable Long id) {
        return ResponseEntity.ok(analyticsService.getContributors(id));
    }
    
 // GET /api/ai-insights/{id} — get AI-powered insights
    @GetMapping("/ai-insights/{id}")
    public ResponseEntity<?> getAiInsights(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(aiInsightService.generateInsights(id));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    private boolean isValidGitUrl(String url) {
        if (url == null || url.isBlank()) return false;

        // Must start with a known Git protocol
        boolean hasValidProtocol = url.startsWith("https://")
                || url.startsWith("http://")
                || url.startsWith("git@")
                || url.startsWith("git://");

        if (!hasValidProtocol) return false;

        // Must be a parseable URI
        try {
            new java.net.URI(url);
        } catch (Exception e) {
            return false;
        }

        // Common Git hosts — extend this list as needed
        boolean isKnownHost = url.contains("github.com")
                || url.contains("gitlab.com")
                || url.contains("bitbucket.org")
                || url.contains("dev.azure.com");

        return isKnownHost;
    }
}
