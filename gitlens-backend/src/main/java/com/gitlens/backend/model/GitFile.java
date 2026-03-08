package com.gitlens.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "git_files")
public class GitFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_path", columnDefinition = "TEXT", nullable = false)
    private String filePath;

    @Column(name = "churn_score")
    private Integer churnScore;

    @Column(name = "commit_count")
    private Integer commitCount;

    @Column(name = "bus_factor")
    private Integer busFactor;

    @Column(name = "hotspot_score")
    private Double hotspotScore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public Integer getChurnScore() { return churnScore; }
    public void setChurnScore(Integer churnScore) { this.churnScore = churnScore; }

    public Integer getCommitCount() { return commitCount; }
    public void setCommitCount(Integer commitCount) { this.commitCount = commitCount; }

    public Integer getBusFactor() { return busFactor; }
    public void setBusFactor(Integer busFactor) { this.busFactor = busFactor; }

    public Double getHotspotScore() { return hotspotScore; }
    public void setHotspotScore(Double hotspotScore) { this.hotspotScore = hotspotScore; }

    public Repository getRepository() { return repository; }
    public void setRepository(Repository repository) { this.repository = repository; }
}