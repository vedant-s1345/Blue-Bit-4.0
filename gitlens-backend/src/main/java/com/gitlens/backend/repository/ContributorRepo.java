package com.gitlens.backend.repository;

import com.gitlens.backend.model.Contributor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ContributorRepo extends JpaRepository<Contributor, Long> {
    Optional<Contributor> findByEmailAndRepositoryId(String email, Long repositoryId);
    List<Contributor> findByRepositoryIdOrderByTotalCommitsDesc(Long repositoryId);
}