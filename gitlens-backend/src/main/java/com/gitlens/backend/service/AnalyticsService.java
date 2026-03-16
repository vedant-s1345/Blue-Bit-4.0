package com.gitlens.backend.service;

import com.gitlens.backend.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import java.util.stream.Collectors;
import com.gitlens.backend.model.*;
import com.gitlens.backend.repository.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

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
}