package com.gitlens.backend.dto;

public class RepoStatusResponse {
    private Long id;
    private String name;
    private String url;
    private String status;
    private Integer totalCommits;
    private String createdAt;
    private String analyzedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getTotalCommits() { return totalCommits; }
    public void setTotalCommits(Integer totalCommits) { this.totalCommits = totalCommits; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getAnalyzedAt() { return analyzedAt; }
    public void setAnalyzedAt(String analyzedAt) { this.analyzedAt = analyzedAt; }
}