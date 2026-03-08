package com.gitlens.backend.controller;

import com.gitlens.backend.dto.*;
import com.gitlens.backend.gitparser.GitParserService;
import com.gitlens.backend.model.Repository;
import com.gitlens.backend.repository.RepositoryRepo;
import com.gitlens.backend.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.gitlens.backend.service.AiInsightService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {
	    "http://localhost:5173",  // Vite default port
	    "http://localhost:3000",  // Create React App default
	    "http://localhost:4173"   // Vite preview port
	})
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

        // Check if already analyzed
        var existing = repositoryRepo.findByUrl(request.getRepoUrl());
        if (existing.isPresent()) {
            return ResponseEntity.ok(Map.of(
                "message", "Repository already exists",
                "repositoryId", existing.get().getId(),
                "status", existing.get().getStatus()
            ));
        }

        // Extract repo name from URL
        String url = request.getRepoUrl();
        String repoName = url.substring(url.lastIndexOf("/") + 1).replace(".git", "");

        // Save repo entry
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
    public ResponseEntity<List<CommitDTO>> getTimeline(@PathVariable Long id) {
        return ResponseEntity.ok(analyticsService.getTimeline(id));
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
}
