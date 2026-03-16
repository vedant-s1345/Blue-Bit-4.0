package com.gitlens.backend.repository;

import com.gitlens.backend.model.FileChange;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface FileChangeRepo extends JpaRepository<FileChange, Long> {
    List<FileChange> findByCommitId(Long commitId);
    List<FileChange> findByGitFileId(Long gitFileId);

    @Query("SELECT COUNT(DISTINCT c.authorEmail) FROM FileChange fc " +
           "JOIN fc.commit c WHERE fc.gitFile.id = :fileId")
    long countDistinctContributorsByGitFileId(@Param("fileId") Long fileId);
}
