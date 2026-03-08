package com.gitlens.backend.repository;

import com.gitlens.backend.model.GitFile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface GitFileRepo extends JpaRepository<GitFile, Long> {
    Optional<GitFile> findByFilePathAndRepositoryId(String filePath, Long repositoryId);
    List<GitFile> findByRepositoryIdOrderByChurnScoreDesc(Long repositoryId);
    List<GitFile> findByRepositoryIdOrderByHotspotScoreDesc(Long repositoryId);
}