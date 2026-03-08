package com.gitlens.backend.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "commits")
public class Commit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "commit_hash", nullable = false, length = 100)
    private String commitHash;

    @Column(nullable = false)
    private String author;

    @Column(name = "author_email")
    private String authorEmail;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "commit_date")
    private LocalDateTime commitDate;

    @Column(name = "lines_added")
    private Integer linesAdded;

    @Column(name = "lines_deleted")
    private Integer linesDeleted;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @OneToMany(mappedBy = "commit", cascade = CascadeType.ALL)
    private List<FileChange> fileChanges;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCommitHash() { return commitHash; }
    public void setCommitHash(String commitHash) { this.commitHash = commitHash; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getAuthorEmail() { return authorEmail; }
    public void setAuthorEmail(String authorEmail) { this.authorEmail = authorEmail; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public LocalDateTime getCommitDate() { return commitDate; }
    public void setCommitDate(LocalDateTime commitDate) { this.commitDate = commitDate; }

    public Integer getLinesAdded() { return linesAdded; }
    public void setLinesAdded(Integer linesAdded) { this.linesAdded = linesAdded; }

    public Integer getLinesDeleted() { return linesDeleted; }
    public void setLinesDeleted(Integer linesDeleted) { this.linesDeleted = linesDeleted; }

    public Repository getRepository() { return repository; }
    public void setRepository(Repository repository) { this.repository = repository; }

    public List<FileChange> getFileChanges() { return fileChanges; }
    public void setFileChanges(List<FileChange> fileChanges) { this.fileChanges = fileChanges; }
}