package com.gitlens.backend.gitparser;

import com.gitlens.backend.model.*;
import org.springframework.beans.factory.annotation.Value;

import com.gitlens.backend.repository.*;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.diff.DiffEntry;
import org.eclipse.jgit.diff.DiffFormatter;
import org.eclipse.jgit.diff.Edit;
import org.eclipse.jgit.lib.ObjectReader;
import org.eclipse.jgit.lib.PersonIdent;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.treewalk.AbstractTreeIterator;
import org.eclipse.jgit.treewalk.CanonicalTreeParser;
import org.eclipse.jgit.treewalk.EmptyTreeIterator;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.ArrayList;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class GitParserService {

	private static final Logger log = LoggerFactory.getLogger(GitParserService.class);
	@Value("${github.token:}")
	private String githubToken;
    private final RepositoryRepo repositoryRepo;
    private final CommitRepo commitRepo;
    private final GitFileRepo gitFileRepo;
    private final FileChangeRepo fileChangeRepo;
    private final ContributorRepo contributorRepo;

    public GitParserService(RepositoryRepo repositoryRepo,
                            CommitRepo commitRepo,
                            GitFileRepo gitFileRepo,
                            FileChangeRepo fileChangeRepo,
                            ContributorRepo contributorRepo) {
        this.repositoryRepo = repositoryRepo;
        this.commitRepo = commitRepo;
        this.gitFileRepo = gitFileRepo;
        this.fileChangeRepo = fileChangeRepo;
        this.contributorRepo = contributorRepo;
    }

    @Async("gitParserExecutor")
    public void parseRepository(Long repositoryId) {
        Repository repo = repositoryRepo.findById(repositoryId)
                .orElseThrow(() -> new RuntimeException("Repository not found"));

        repo.setStatus("PROCESSING");
        repositoryRepo.save(repo);

        String localPath = System.getProperty("java.io.tmpdir") + "/gitlens/" + repositoryId;

        try {
        	
        	deleteDirectory(new File(localPath));
        	log.info("Cloning repository: {}", repo.getUrl());
        	
        	var cloneCommand = Git.cloneRepository()
        	        .setURI(repo.getUrl())
        	        .setDirectory(new File(localPath))
        	        .setCloneAllBranches(true);

        	// Add auth if token is configured
        	if (githubToken != null && !githubToken.isBlank()) {
        	    cloneCommand.setCredentialsProvider(
        	        new org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider(
        	            githubToken, ""
        	        )
        	    );
        	}

        	Git git = cloneCommand.call();

            log.info("Clone complete. Parsing commits...");

            Iterable<RevCommit> revCommits;
            try {
                revCommits = git.log().all().call();
            } catch (Exception logEx) {
            	log.warn("git.log() failed: {} | Cause: {} | Class: {}",
            	        logEx.getMessage(),
            	        logEx.getCause() != null ? logEx.getCause().getMessage() : "none",
            	        logEx.getClass().getName());
            	revCommits = java.util.Collections.emptyList();
            }
            
            for (RevCommit revCommit : revCommits) {
                try {
                    processCommit(git, revCommit, repo);
                } catch (Exception e) {
                	log.warn("Skipping problematic commit {}: {}", revCommit.getName(), e.getMessage());
                }
            }

            calculateAnalytics(repositoryId);

            long totalCommits = commitRepo.countByRepositoryId(repositoryId);
            repo.setTotalCommits((int) totalCommits);
            repo.setStatus("COMPLETED");
            repo.setAnalyzedAt(LocalDateTime.now());
            repositoryRepo.save(repo);

            deleteDirectory(new File(localPath));

            log.info("Repository analysis complete! Total commits: " + totalCommits);
            
        } catch (Exception e) {
        	log.error("Failed to parse repository: {} | Cause: {} | Class: {}",
        	        e.getMessage(),
        	        e.getCause() != null ? e.getCause().getMessage() : "none",
        	        e.getClass().getName());
        	repo.setStatus("FAILED");
            repositoryRepo.save(repo);
            deleteDirectory(new File(localPath));
        }
    }

    @Transactional
    protected void processCommit(Git git, RevCommit revCommit, Repository repo) {
    	try {
        	if (commitRepo.existsByCommitHashAndRepositoryId(
                    revCommit.getName(), repo.getId())) {
                return;
            }
            PersonIdent author = revCommit.getAuthorIdent();
            PersonIdent committer = revCommit.getCommitterIdent();

            Contributor contributor = contributorRepo
                    .findByEmailAndRepositoryId(author.getEmailAddress(), repo.getId())
                    .orElseGet(() -> {
                        Contributor c = new Contributor();
                        c.setName(author.getName());
                        c.setEmail(author.getEmailAddress());
                        c.setTotalCommits(0);
                        c.setLinesAdded(0);
                        c.setLinesDeleted(0);
                        c.setRepository(repo);
                        return c;
                    });

            contributor.setTotalCommits(contributor.getTotalCommits() + 1);
            contributorRepo.save(contributor);

            com.gitlens.backend.model.Commit commit = new com.gitlens.backend.model.Commit();
            commit.setCommitHash(revCommit.getName());
            commit.setAuthor(author.getName());
            commit.setAuthorEmail(author.getEmailAddress());
            commit.setMessage(revCommit.getShortMessage());
            commit.setCommitDate(committer.getWhenAsInstant()
                    .atZone(ZoneId.systemDefault()).toLocalDateTime());
            commit.setLinesAdded(0);
            commit.setLinesDeleted(0);
            commit.setRepository(repo);
            commitRepo.save(commit);

            List<DiffEntry> diffs = getDiffs(git, revCommit);
            int totalAdded = 0;
            int totalDeleted = 0;

            List<GitFile> gitFilesToSave = new ArrayList<>();
            List<FileChange> fileChangesToSave = new ArrayList<>();

            for (DiffEntry diff : diffs) {
                String filePath = diff.getNewPath().equals("/dev/null")
                        ? diff.getOldPath() : diff.getNewPath();

                GitFile gitFile = gitFileRepo
                        .findByFilePathAndRepositoryId(filePath, repo.getId())
                        .orElseGet(() -> {
                            GitFile f = new GitFile();
                            f.setFilePath(filePath);
                            f.setChurnScore(0);
                            f.setCommitCount(0);
                            f.setBusFactor(0);
                            f.setHotspotScore(0.0);
                            f.setRepository(repo);
                            return f;
                        });

                int[] lines = countLines(git, diff);
                int added = lines[0];
                int deleted = lines[1];

                gitFile.setChurnScore(gitFile.getChurnScore() + added + deleted);
                gitFile.setCommitCount(gitFile.getCommitCount() + 1);
                
                gitFilesToSave.add(gitFile);

                FileChange fileChange = new FileChange();
                fileChange.setCommit(commit);
                fileChange.setGitFile(gitFile);
                fileChange.setLinesAdded(added);
                fileChange.setLinesDeleted(deleted);
                fileChange.setChangeType(diff.getChangeType().name());
                fileChangesToSave.add(fileChange);
                
                totalAdded += added;
                totalDeleted += deleted;
            }

            gitFileRepo.saveAll(gitFilesToSave);
            fileChangeRepo.saveAll(fileChangesToSave);
            
            commit.setLinesAdded(totalAdded);
            commit.setLinesDeleted(totalDeleted);
            commitRepo.save(commit);

            contributor.setLinesAdded(contributor.getLinesAdded() + totalAdded);
            contributor.setLinesDeleted(contributor.getLinesDeleted() + totalDeleted);
            contributorRepo.save(contributor);

        } catch (Exception e) {
            log.warn("Skipping commit {}: {}", revCommit.getName(), e.getMessage());
        }
    }

    private List<DiffEntry> getDiffs(Git git, RevCommit commit) {
        try {
            ObjectReader reader = git.getRepository().newObjectReader();
            AbstractTreeIterator newTree = new CanonicalTreeParser(null,
                    reader, commit.getTree());
            AbstractTreeIterator oldTree;

            if (commit.getParentCount() > 0) {
                oldTree = new CanonicalTreeParser(null, reader,
                        commit.getParent(0).getTree());
            } else {
                oldTree = new EmptyTreeIterator();
            }

            return git.diff()
                    .setOldTree(oldTree)
                    .setNewTree(newTree)
                    .call();
        } catch (Exception e) {
        	log.warn("Could not get diffs for commit {}: {}", commit.getName(), e.getMessage());
        	return List.of(); 
        }
    }

    private int[] countLines(Git git, DiffEntry diff) {
        int added = 0, deleted = 0;
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             DiffFormatter formatter = new DiffFormatter(out)) {
            formatter.setRepository(git.getRepository());
            formatter.format(diff);
            for (Edit edit : formatter.toFileHeader(diff).toEditList()) {
                added += edit.getEndB() - edit.getBeginB();
                deleted += edit.getEndA() - edit.getBeginA();
            }
        } catch (Exception e) {
            // return 0,0 if lines can't be counted
        }
        return new int[]{added, deleted};
    }

    private void calculateAnalytics(Long repositoryId) {
        List<GitFile> files = gitFileRepo.findByRepositoryIdOrderByChurnScoreDesc(repositoryId);
        if (files.isEmpty()) return;

        int maxChurn = files.get(0).getChurnScore();
        int maxCommits = files.stream().mapToInt(GitFile::getCommitCount).max().orElse(1);

        for (GitFile file : files) {
            // Hotspot score
            double churnNorm = maxChurn > 0 ? (double) file.getChurnScore() / maxChurn : 0;
            double commitNorm = maxCommits > 0 ? (double) file.getCommitCount() / maxCommits : 0;
            file.setHotspotScore((churnNorm + commitNorm) / 2.0 * 100);

            // Bug #12: calculate bus factor here in bulk, not inside the commit loop
            long distinctContributors = fileChangeRepo
                    .countDistinctContributorsByGitFileId(file.getId());
            file.setBusFactor((int) distinctContributors);
        }

        // Single batch write
        gitFileRepo.saveAll(files);
    }

    private void deleteDirectory(File dir) {
        try {
            Files.walkFileTree(dir.toPath(), new java.nio.file.SimpleFileVisitor<Path>() {
                @Override
                public java.nio.file.FileVisitResult visitFile(Path file,
                        java.nio.file.attribute.BasicFileAttributes attrs) throws java.io.IOException {
                    Files.delete(file);
                    return java.nio.file.FileVisitResult.CONTINUE;
                }

                @Override
                public java.nio.file.FileVisitResult postVisitDirectory(Path d, java.io.IOException e)
                        throws java.io.IOException {
                    if (e != null) throw e;
                    Files.delete(d);
                    return java.nio.file.FileVisitResult.CONTINUE;
                }
            });
        } catch (java.io.IOException e) {
            log.warn("Failed to clean up temp directory {}: {}", dir.getAbsolutePath(), e.getMessage());
        }
    }
}