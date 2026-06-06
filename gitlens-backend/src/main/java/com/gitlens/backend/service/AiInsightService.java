package com.gitlens.backend.service;

import com.gitlens.backend.dto.AiInsightDTO;
import com.gitlens.backend.dto.ChatRequest;
import com.gitlens.backend.dto.ContributorDTO;
import com.gitlens.backend.dto.HeatmapDTO;
import com.gitlens.backend.model.Commit;
import com.gitlens.backend.repository.CommitRepo;
import com.gitlens.backend.repository.GitFileRepo;
import com.gitlens.backend.repository.ContributorRepo;
import com.google.gson.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AiInsightService {

    @Value("${groq.api.key:}")
    private String groqApiKey;

    private static final HttpClient httpClient = HttpClient.newHttpClient();
    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "llama-3.1-8b-instant";

    private final CommitRepo commitRepo;
    private final GitFileRepo gitFileRepo;
    private final ContributorRepo contributorRepo;
    private final AnalyticsService analyticsService;

    public AiInsightService(CommitRepo commitRepo,
                            GitFileRepo gitFileRepo,
                            ContributorRepo contributorRepo,
                            AnalyticsService analyticsService) {
        this.commitRepo = commitRepo;
        this.gitFileRepo = gitFileRepo;
        this.contributorRepo = contributorRepo;
        this.analyticsService = analyticsService;
    }

    // ── AI Insights ────────────────────────────────────────────────────────────
    public AiInsightDTO generateInsights(Long repoId) throws Exception {
        List<HeatmapDTO> hotspots = analyticsService.getHeatmap(repoId);
        List<ContributorDTO> contributors = analyticsService.getContributors(repoId);
        List<Commit> commits = commitRepo.findByRepositoryIdOrderByCommitDateAsc(repoId);

        if (groqApiKey != null && !groqApiKey.isBlank()) {
            try {
                String prompt = buildPrompt(commits, hotspots, contributors);
                String aiResponse = callGroq(
                    "You are a senior software engineer analyzing a Git repository. " +
                    "Respond ONLY with valid JSON, no markdown, no extra text.",
                    prompt
                );
                return parseResponse(aiResponse);
            } catch (Exception e) {
                System.err.println("Groq AI failed, using fallback: " + e.getMessage());
            }
        }
        return buildFallbackInsights(hotspots, contributors, commits.size());
    }

    // ── Multi-turn chat ────────────────────────────────────────────────────────
    public String chat(String systemPrompt, List<ChatRequest.Message> messages) throws Exception {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            return "AI chat is not configured — add your Groq API key to application.properties (groq.api.key).";
        }

        JsonArray messagesArray = new JsonArray();

        // System message
        JsonObject sysMsg = new JsonObject();
        sysMsg.addProperty("role", "system");
        sysMsg.addProperty("content", systemPrompt);
        messagesArray.add(sysMsg);

        // Conversation history
        for (ChatRequest.Message msg : messages) {
            JsonObject turn = new JsonObject();
            turn.addProperty("role", "assistant".equals(msg.getRole()) ? "assistant" : "user");
            turn.addProperty("content", msg.getContent());
            messagesArray.add(turn);
        }

        JsonObject body = new JsonObject();
        body.addProperty("model", MODEL);
        body.add("messages", messagesArray);
        body.addProperty("temperature", 0.7);
        body.addProperty("max_tokens", 800);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_URL))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + groqApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq error " + response.statusCode() + ": " + response.body());
        }

        JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
        return json.getAsJsonArray("choices")
                .get(0).getAsJsonObject()
                .getAsJsonObject("message")
                .get("content").getAsString();
    }

    // ── Private helpers ────────────────────────────────────────────────────────
    private String callGroq(String systemPrompt, String userPrompt) throws Exception {
        JsonArray messages = new JsonArray();

        JsonObject sysMsg = new JsonObject();
        sysMsg.addProperty("role", "system");
        sysMsg.addProperty("content", systemPrompt);
        messages.add(sysMsg);

        JsonObject userMsg = new JsonObject();
        userMsg.addProperty("role", "user");
        userMsg.addProperty("content", userPrompt);
        messages.add(userMsg);

        JsonObject body = new JsonObject();
        body.addProperty("model", MODEL);
        body.add("messages", messages);
        body.addProperty("temperature", 0.7);
        body.addProperty("max_tokens", 1000);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_URL))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + groqApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq error " + response.statusCode() + ": " + response.body());
        }

        JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
        return json.getAsJsonArray("choices")
                .get(0).getAsJsonObject()
                .getAsJsonObject("message")
                .get("content").getAsString();
    }

    private String buildPrompt(List<Commit> commits, List<HeatmapDTO> hotspots,
                                List<ContributorDTO> contributors) {
        List<String> recentCommits = commits.stream()
                .skip(Math.max(0, commits.size() - 10))
                .map(c -> "- " + c.getAuthor() + ": " + c.getMessage())
                .collect(Collectors.toList());

        List<String> highRiskFiles = hotspots.stream()
                .filter(h -> "HIGH".equals(h.getRisk()))
                .map(h -> "- " + h.getFilePath() +
                          " (churn: " + h.getChurnScore() +
                          ", commits: " + h.getCommitCount() + ")")
                .collect(Collectors.toList());

        List<String> contributorSummary = contributors.stream()
                .map(c -> "- " + c.getName() + ": " + c.getTotalCommits() + " commits")
                .collect(Collectors.toList());

        return "Analyze this Git repository and return ONLY a JSON object with exactly " +
               "these 4 string fields: summary, technicalDebt, busFactorWarning, recommendations. " +
               "2-3 sentences each. No markdown.\n\n" +
               "RECENT COMMITS:\n" + String.join("\n", recentCommits) +
               "\n\nHIGH RISK FILES:\n" +
               String.join("\n", highRiskFiles.isEmpty() ? List.of("None") : highRiskFiles) +
               "\n\nCONTRIBUTORS:\n" + String.join("\n", contributorSummary);
    }

    private AiInsightDTO parseResponse(String aiResponse) {
        AiInsightDTO dto = new AiInsightDTO();
        try {
            String cleaned = aiResponse
                    .replaceAll("```json", "")
                    .replaceAll("```", "")
                    .trim();
            JsonObject json = JsonParser.parseString(cleaned).getAsJsonObject();
            dto.setSummary(json.get("summary").getAsString());
            dto.setTechnicalDebt(json.get("technicalDebt").getAsString());
            dto.setBusFactorWarning(json.get("busFactorWarning").getAsString());
            dto.setRecommendations(json.get("recommendations").getAsString());
        } catch (Exception e) {
            dto.setSummary("AI analysis complete.");
            dto.setTechnicalDebt("Could not parse AI response.");
            dto.setBusFactorWarning("Manual review recommended.");
            dto.setRecommendations(aiResponse);
        }
        return dto;
    }

    private AiInsightDTO buildFallbackInsights(List<HeatmapDTO> hotspots,
                                               List<ContributorDTO> contributors,
                                               int totalCommits) {
        long highRiskCount = hotspots.stream()
                .filter(h -> "HIGH".equals(h.getRisk())).count();
        String topContributor = contributors.isEmpty() ? "Unknown" : contributors.get(0).getName();
        AiInsightDTO dto = new AiInsightDTO();
        dto.setSummary("This repository has " + totalCommits + " commits from " +
                contributors.size() + " contributors. Development activity shows " +
                highRiskCount + " high-risk files requiring attention.");
        dto.setTechnicalDebt(highRiskCount > 0
                ? "Found " + highRiskCount + " high-churn files indicating technical debt."
                : "No significant technical debt detected.");
        dto.setBusFactorWarning(contributors.size() <= 2
                ? "WARNING: Only " + contributors.size() + " contributor(s). High bus factor risk."
                : "Bus factor acceptable with " + contributors.size() + " contributors. Top: " + topContributor);
        dto.setRecommendations("Focus code reviews on high-churn files. " +
                "Encourage knowledge sharing. Add tests for hotspot files.");
        return dto;
    }
}