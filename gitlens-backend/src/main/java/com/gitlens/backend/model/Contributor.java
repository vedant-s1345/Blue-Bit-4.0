package com.gitlens.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "contributors")
public class Contributor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    @Column(name = "total_commits")
    private Integer totalCommits;

    @Column(name = "lines_added")
    private Integer linesAdded;

    @Column(name = "lines_deleted")
    private Integer linesDeleted;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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

    public Repository getRepository() { return repository; }
    public void setRepository(Repository repository) { this.repository = repository; }
}