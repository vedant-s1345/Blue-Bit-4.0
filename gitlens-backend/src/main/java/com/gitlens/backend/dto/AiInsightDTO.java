package com.gitlens.backend.dto;

public class AiInsightDTO {
    private String summary;
    private String technicalDebt;
    private String busFactorWarning;
    private String recommendations;

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getTechnicalDebt() { return technicalDebt; }
    public void setTechnicalDebt(String technicalDebt) { this.technicalDebt = technicalDebt; }

    public String getBusFactorWarning() { return busFactorWarning; }
    public void setBusFactorWarning(String busFactorWarning) { this.busFactorWarning = busFactorWarning; }

    public String getRecommendations() { return recommendations; }
    public void setRecommendations(String recommendations) { this.recommendations = recommendations; }
}