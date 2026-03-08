package com.gitlens.backend.dto;

public class CommitDTO {
    private String commitHash;
    private String author;
    private String authorEmail;
    private String message;
    private String commitDate;
    private Integer linesAdded;
    private Integer linesDeleted;

    public String getCommitHash() { return commitHash; }
    public void setCommitHash(String commitHash) { this.commitHash = commitHash; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getAuthorEmail() { return authorEmail; }
    public void setAuthorEmail(String authorEmail) { this.authorEmail = authorEmail; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getCommitDate() { return commitDate; }
    public void setCommitDate(String commitDate) { this.commitDate = commitDate; }

    public Integer getLinesAdded() { return linesAdded; }
    public void setLinesAdded(Integer linesAdded) { this.linesAdded = linesAdded; }

    public Integer getLinesDeleted() { return linesDeleted; }
    public void setLinesDeleted(Integer linesDeleted) { this.linesDeleted = linesDeleted; }
}