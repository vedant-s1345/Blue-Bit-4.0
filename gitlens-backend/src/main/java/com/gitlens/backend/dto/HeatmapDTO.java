package com.gitlens.backend.dto;

public class HeatmapDTO {
    private String filePath;
    private Integer churnScore;
    private Integer commitCount;
    private Double hotspotScore;
    private String risk; // HIGH, MEDIUM, LOW

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public Integer getChurnScore() { return churnScore; }
    public void setChurnScore(Integer churnScore) { this.churnScore = churnScore; }

    public Integer getCommitCount() { return commitCount; }
    public void setCommitCount(Integer commitCount) { this.commitCount = commitCount; }

    public Double getHotspotScore() { return hotspotScore; }
    public void setHotspotScore(Double hotspotScore) { this.hotspotScore = hotspotScore; }

    public String getRisk() { return risk; }
    public void setRisk(String risk) { this.risk = risk; }
}