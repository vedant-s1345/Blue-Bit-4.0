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

    @Value("${gemini.api.key}")
    private String geminiApiKey;
    private static final HttpClient httpClient = HttpClient.newHttpClient();

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

    public AiInsightDTO generateInsights(Long repoId) throws Exception {
        List<HeatmapDTO> hotspots = analyticsService.getHeatmap(repoId);
        List<ContributorDTO> contributors = analyticsService.getContributors(repoId);
        List<Commit> commits = commitRepo.findByRepositoryIdOrderByCommitDateAsc(repoId);

        // Try Gemini first; fall back to rule-based if key is missing or call fails
        if (geminiApiKey != null && !geminiApiKey.isBlank() && !geminiApiKey.equals("YOUR_KEY_HERE")) {
            try {
                String prompt = buildPrompt(commits, hotspots, contributors);
                String aiResponse = callGemini(prompt);
                return parseResponse(aiResponse);
            } catch (Exception e) {
                // log and fall through to fallback
            }
        }

        // Rule-based fallback
        return buildFallbackInsights(hotspots, contributors, commits.size());
    }
    
    private AiInsightDTO buildFallbackInsights(List<HeatmapDTO> hotspots,
										            List<ContributorDTO> contributors,
										            int totalCommits) {
		long highRiskCount = hotspots.stream()
					.filter(h -> "HIGH".equals(h.getRisk())).count();
		
		String topContributor = contributors.isEmpty() ? "Unknown"
						: contributors.get(0).getName();
		
		AiInsightDTO dto = new AiInsightDTO();
		
		dto.setSummary("This repository has " + totalCommits +
						" commits from " + contributors.size() +
						" contributors. Development activity shows " +
						highRiskCount + " high-risk files requiring attention.");
		
		dto.setTechnicalDebt(highRiskCount > 0
								? "Found " + highRiskCount + " high-churn files indicating technical debt. " +
								"Files with hotspot score above 66 need refactoring."
								: "No significant technical debt detected. Codebase appears stable.");
		
		dto.setBusFactorWarning(contributors.size() <= 2
								? "WARNING: Only " + contributors.size() +
								" contributor(s) detected. High bus factor risk."
								: "Bus factor is acceptable with " + contributors.size() +
								" contributors. Top contributor: " + topContributor + ".");
		
		dto.setRecommendations("Focus code reviews on high-churn files. " +
								"Encourage knowledge sharing across the team. " +
								"Add tests for files with hotspot score above 80.");
		
		return dto;
	}
    
    


    private String buildPrompt(List<Commit> commits, List<HeatmapDTO> hotspots,
                                List<ContributorDTO> contributors) {

        // Take last 20 commits max to keep prompt short
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

        return """
                You are a senior software engineer analyzing a Git repository.
                Based on the data below, provide a JSON response with exactly these 4 fields:
                "summary", "technicalDebt", "busFactorWarning", "recommendations"
                
                Keep each field to 2-3 sentences. Be specific and actionable.
                Return ONLY valid JSON, no markdown, no extra text.
                
                RECENT COMMITS:
                """ + String.join("\n", recentCommits) + """
                
                HIGH RISK FILES (most changed):
                """ + String.join("\n", highRiskFiles.isEmpty() ?
                        List.of("No high risk files detected") : highRiskFiles) + """
                
                CONTRIBUTORS:
                """ + String.join("\n", contributorSummary) + """
                
                Respond with JSON only:
                {
                  "summary": "...",
                  "technicalDebt": "...",
                  "busFactorWarning": "...",
                  "recommendations": "..."
                }
                """;
    }

    // ── Multi-turn chat used by the frontend bot ──────────────────────────────
    public String chat(String systemPrompt, java.util.List<ChatRequest.Message> messages) throws Exception {
        if (geminiApiKey == null || geminiApiKey.isBlank() || geminiApiKey.equals("YOUR_KEY_HERE")) {
            return "AI chat is not configured — add your Gemini API key to application.properties (gemini.api.key).";
        }

        // Gemini multi-turn format: inject system prompt as first user turn
        com.google.gson.JsonArray contents = new com.google.gson.JsonArray();

        // System prompt as first user message + empty model ack (Gemini has no system role)
        com.google.gson.JsonObject sysUser = new com.google.gson.JsonObject();
        sysUser.addProperty("role", "user");
        com.google.gson.JsonArray sysParts = new com.google.gson.JsonArray();
        com.google.gson.JsonObject sysText = new com.google.gson.JsonObject();
        sysText.addProperty("text", systemPrompt);
        sysParts.add(sysText);
        sysUser.add("parts", sysParts);
        contents.add(sysUser);

        com.google.gson.JsonObject sysAck = new com.google.gson.JsonObject();
        sysAck.addProperty("role", "model");
        com.google.gson.JsonArray ackParts = new com.google.gson.JsonArray();
        com.google.gson.JsonObject ackText = new com.google.gson.JsonObject();
        ackText.addProperty("text", "Understood. I have full context of this repository and am ready to answer questions.");
        ackParts.add(ackText);
        sysAck.add("parts", ackParts);
        contents.add(sysAck);

        // Actual conversation history
        for (ChatRequest.Message msg : messages) {
            com.google.gson.JsonObject turn = new com.google.gson.JsonObject();
            // Gemini uses "model" not "assistant"
            turn.addProperty("role", "assistant".equals(msg.getRole()) ? "model" : "user");
            com.google.gson.JsonArray parts = new com.google.gson.JsonArray();
            com.google.gson.JsonObject text = new com.google.gson.JsonObject();
            text.addProperty("text", msg.getContent());
            parts.add(text);
            turn.add("parts", parts);
            contents.add(turn);
        }

        com.google.gson.JsonObject body = new com.google.gson.JsonObject();
        body.add("contents", contents);

        com.google.gson.JsonObject genConfig = new com.google.gson.JsonObject();
        genConfig.addProperty("temperature", 0.7);
        genConfig.addProperty("maxOutputTokens", 800);
        body.add("generationConfig", genConfig);

        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + geminiApiKey;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Gemini error " + response.statusCode() + ": " + response.body());
        }

        com.google.gson.JsonObject json = com.google.gson.JsonParser.parseString(response.body()).getAsJsonObject();
        return json.getAsJsonArray("candidates")
                .get(0).getAsJsonObject()
                .getAsJsonObject("content")
                .getAsJsonArray("parts")
                .get(0).getAsJsonObject()
                .get("text").getAsString();
    }

    private String callGemini(String prompt) throws Exception {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" +
        		"gemini-1.5-flash:generateContent?key=" + geminiApiKey;

        String requestBody = """
                {
                  "contents": [{
                    "parts": [{
                      "text": %s
                    }]
                  }]
                }
                """.formatted(new Gson().toJson(prompt));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request,
                HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Gemini API error: " + response.body());
        }

        // Extract text from Gemini response
        JsonObject json = JsonParser.parseString(response.body()).getAsJsonObject();
        return json.getAsJsonArray("candidates")
                .get(0).getAsJsonObject()
                .getAsJsonObject("content")
                .getAsJsonArray("parts")
                .get(0).getAsJsonObject()
                .get("text").getAsString();
    }

    private AiInsightDTO parseResponse(String aiResponse) {
        AiInsightDTO dto = new AiInsightDTO();
        try {
            // Clean up response in case Gemini adds markdown
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
}