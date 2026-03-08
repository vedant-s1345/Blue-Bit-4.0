package com.gitlens.backend.dto;

public class ContributorDTO {
    private String name;
    private String email;
    private Integer totalCommits;
    private Integer linesAdded;
    private Integer linesDeleted;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Integer getTotalCommits() { return totalCommits; }
    public void setTotalCommits(Integer totalCommits) { this.totalCommits = totalCommits; }

    public Integer getLinesAdded() { return linesAdded; }
    public void setLinesAdded(Integer linesAdded) { this.linesAdded = linesAdded; }

    public Integer getLinesDeleted() { return linesDeleted; }
    public void setLinesDeleted(Integer linesDeleted) { this.linesDeleted = linesDeleted; }
}