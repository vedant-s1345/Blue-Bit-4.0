package com.gitlens.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "file_changes")
public class FileChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lines_added")
    private Integer linesAdded;

    @Column(name = "lines_deleted")
    private Integer linesDeleted;

    @Column(name = "change_type", length = 20)
    private String changeType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commit_id", nullable = false)
    private Commit commit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id", nullable = false)
    private GitFile gitFile;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getLinesAdded() { return linesAdded; }
    public void setLinesAdded(Integer linesAdded) { this.linesAdded = linesAdded; }

    public Integer getLinesDeleted() { return linesDeleted; }
    public void setLinesDeleted(Integer linesDeleted) { this.linesDeleted = linesDeleted; }

    public String getChangeType() { return changeType; }
    public void setChangeType(String changeType) { this.changeType = changeType; }

    public Commit getCommit() { return commit; }
    public void setCommit(Commit commit) { this.commit = commit; }

    public GitFile getGitFile() { return gitFile; }
    public void setGitFile(GitFile gitFile) { this.gitFile = gitFile; }
}