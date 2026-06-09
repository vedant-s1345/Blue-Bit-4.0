package com.gitlens.backend.dto;

import java.util.List;

public class StoreRepoRequest {
    private String repoUrl;
    private String repoName;
    private int totalCommits;
    private List<CommitData> commits;
    private List<ContributorData> contributors;
    private List<FileData> files;

    public static class CommitData {
        private String sha;
        private String author;
        private String authorEmail;
        private String message;
        private String date;
        private int additions;
        private int deletions;

        public String getSha() { return sha; }
        public String getAuthor() { return author; }
        public String getAuthorEmail() { return authorEmail; }
        public String getMessage() { return message; }
        public String getDate() { return date; }
        public int getAdditions() { return additions; }
        public int getDeletions() { return deletions; }
    }

    public static class ContributorData {
        private String name;
        private int totalCommits;
        private int linesAdded;
        private int linesDeleted;

        public String getName() { return name; }
        public int getTotalCommits() { return totalCommits; }
        public int getLinesAdded() { return linesAdded; }
        public int getLinesDeleted() { return linesDeleted; }
    }

    public static class FileData {
        private String filePath;
        private int churnScore;
        private int commitCount;
        private String risk;

        public String getFilePath() { return filePath; }
        public int getChurnScore() { return churnScore; }
        public int getCommitCount() { return commitCount; }
        public String getRisk() { return risk; }
    }

    public String getRepoUrl() { return repoUrl; }
    public String getRepoName() { return repoName; }
    public int getTotalCommits() { return totalCommits; }
    public List<CommitData> getCommits() { return commits; }
    public List<ContributorData> getContributors() { return contributors; }
    public List<FileData> getFiles() { return files; }
}