package com.gitlens.backend.repository;

import com.gitlens.backend.model.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RepositoryRepo extends JpaRepository<Repository, Long> {
    Optional<Repository> findByUrl(String url);
    Optional<Repository> findByUrlAndUserId(String url, Long userId);
    List<Repository> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Repository> findByUrlAndUserIdIsNull(String url);
    List<Repository> findByUrlAndUserIdIsNotNull(String url); 
}