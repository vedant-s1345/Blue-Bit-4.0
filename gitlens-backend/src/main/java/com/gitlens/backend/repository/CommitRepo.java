package com.gitlens.backend.repository;

import com.gitlens.backend.model.Commit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommitRepo extends JpaRepository<Commit, Long> {
    List<Commit> findByRepositoryIdOrderByCommitDateAsc(Long repositoryId);
    long countByRepositoryId(Long repositoryId);
    boolean existsByCommitHashAndRepositoryId(String commitHash, Long repositoryId);
}
