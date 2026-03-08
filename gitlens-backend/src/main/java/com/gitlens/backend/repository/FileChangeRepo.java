package com.gitlens.backend.repository;

import com.gitlens.backend.model.FileChange;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FileChangeRepo extends JpaRepository<FileChange, Long> {
    List<FileChange> findByCommitId(Long commitId);
    List<FileChange> findByGitFileId(Long gitFileId);
}