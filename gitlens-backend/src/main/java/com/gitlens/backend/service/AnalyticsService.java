package com.gitlens.backend.service;

import com.gitlens.backend.dto.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import java.util.stream.Collectors;
import com.gitlens.backend.model.*;
import com.gitlens.backend.repository.*;

import jakarta.transaction.Transactional;
import java.util.Optional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class AnalyticsService {

    private final RepositoryRepo repositoryRepo;
    private final CommitRepo commitRepo;
    private final GitFileRepo gitFileRepo;
    private final ContributorRepo contributorRepo;

    public AnalyticsService(RepositoryRepo repositoryRepo,
                            CommitRepo commitRepo,
                            GitFileRepo gitFileRepo,
                            ContributorRepo contributorRepo) {
        this.repositoryRepo = repositoryRepo;
        this.commitRepo = commitRepo;
        this.gitFileRepo = gitFileRepo;
        this.contributorRepo = contributorRepo;
    }

    public RepoStatusResponse getRepoStatus(Long repoId) {
        Repository repo = repositoryRepo.findById(repoId)
                .orElseThrow(() -> new RuntimeException("Repository not found"));

        RepoStatusResponse response = new RepoStatusResponse();
        response.setId(repo.getId());
        response.setName(repo.getName());
        response.setUrl(repo.getUrl());
        response.setStatus(repo.getStatus());
        response.setTotalCommits(repo.getTotalCommits());
        response.setCreatedAt(repo.getCreatedAt() != null ? repo.getCreatedAt().toString() : null);
        response.setAnalyzedAt(repo.getAnalyzedAt() != null ? repo.getAnalyzedAt().toString() : null);
        return response;
    }

    public List<CommitDTO> getTimeline(Long repoId) {
        return commitRepo.findByRepositoryIdOrderByCommitDateAsc(repoId)
                .stream()
                .map(this::toCommitDTO)
                .collect(Collectors.toList());
    }

    public Page<CommitDTO> getTimelinePaged(Long repoId, Pageable pageable) {
        return commitRepo.findByRepositoryIdOrderByCommitDateAsc(repoId, pageable)
                .map(this::toCommitDTO);
    }

    private CommitDTO toCommitDTO(com.gitlens.backend.model.Commit commit) {
        CommitDTO dto = new CommitDTO();
        dto.setCommitHash(commit.getCommitHash());
        dto.setAuthor(commit.getAuthor());
        dto.setAuthorEmail(commit.getAuthorEmail());
        dto.setMessage(commit.getMessage());
        dto.setCommitDate(commit.getCommitDate() != null ? commit.getCommitDate().toString() : null);
        dto.setLinesAdded(commit.getLinesAdded());
        dto.setLinesDeleted(commit.getLinesDeleted());
        return dto;
    }

    public List<HeatmapDTO> getHeatmap(Long repoId) {
        return gitFileRepo.findByRepositoryIdOrderByHotspotScoreDesc(repoId)
                .stream()
                .map(file -> {
                    HeatmapDTO dto = new HeatmapDTO();
                    dto.setFilePath(file.getFilePath());
                    dto.setChurnScore(file.getChurnScore());
                    dto.setCommitCount(file.getCommitCount());
                    dto.setHotspotScore(file.getHotspotScore());

                    // Risk classification
                    if (file.getHotspotScore() >= 66) {
                        dto.setRisk("HIGH");
                    } else if (file.getHotspotScore() >= 33) {
                        dto.setRisk("MEDIUM");
                    } else {
                        dto.setRisk("LOW");
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    public List<ContributorDTO> getContributors(Long repoId) {
        return contributorRepo.findByRepositoryIdOrderByTotalCommitsDesc(repoId)
                .stream()
                .map(contributor -> {
                    ContributorDTO dto = new ContributorDTO();
                    dto.setName(contributor.getName());
                    dto.setEmail(contributor.getEmail());
                    dto.setTotalCommits(contributor.getTotalCommits());
                    dto.setLinesAdded(contributor.getLinesAdded());
                    dto.setLinesDeleted(contributor.getLinesDeleted());
                    return dto;
                })
                .collect(Collectors.toList());
    }
    
    @Transactional
    public void storeFromFrontend(StoreRepoRequest req) {
        Optional<Repository> existingOpt = repositoryRepo.findByUrl(req.getRepoUrl());
        if (existingOpt.isPresent() && "COMPLETED".equals(existingOpt.get().getStatus())) return;

        Repository repo = existingOpt.orElse(new Repository());
        repo.setUrl(req.getRepoUrl());
        repo.setName(req.getRepoName());
        repo.setTotalCommits(req.getTotalCommits());
        repo.setStatus("COMPLETED");
        repo.setCreatedAt(LocalDateTime.now());
        repo.setAnalyzedAt(LocalDateTime.now());
        repositoryRepo.save(repo);

        final Repository savedRepo = repo;

        if (req.getCommits() != null) {
            req.getCommits().forEach(c -> {
                if (commitRepo.existsByCommitHashAndRepositoryId(c.getSha(), savedRepo.getId())) return;
                Commit commit = new Commit();
                commit.setCommitHash(c.getSha());
                commit.setAuthor(c.getAuthor());
                commit.setAuthorEmail(c.getAuthorEmail() != null ? c.getAuthorEmail() : "");
                commit.setMessage(c.getMessage());
                commit.setLinesAdded(c.getAdditions());
                commit.setLinesDeleted(c.getDeletions());
                try {
                    commit.setCommitDate(LocalDateTime.parse(
                        c.getDate(), DateTimeFormatter.ISO_DATE_TIME));
                } catch (Exception e) {
                    commit.setCommitDate(LocalDateTime.now());
                }
                commit.setRepository(savedRepo);
                commitRepo.save(commit);
            });
        }

        if (req.getContributors() != null) {
            req.getContributors().forEach(c -> {
                Contributor contributor = new Contributor();
                contributor.setName(c.getName());
                contributor.setEmail(c.getName() + "@github");
                contributor.setTotalCommits(c.getTotalCommits());
                contributor.setLinesAdded(c.getLinesAdded());
                contributor.setLinesDeleted(c.getLinesDeleted());
                contributor.setRepository(savedRepo);
                contributorRepo.save(contributor);
            });
        }

        if (req.getFiles() != null) {
            req.getFiles().forEach(f -> {
                GitFile gitFile = new GitFile();
                gitFile.setFilePath(f.getFilePath());
                gitFile.setChurnScore(f.getChurnScore());
                gitFile.setCommitCount(f.getCommitCount());
                gitFile.setHotspotScore((double) f.getChurnScore());
                gitFile.setBusFactor(1);
                gitFile.setRepository(savedRepo);
                gitFileRepo.save(gitFile);
            });
        }
    }
}