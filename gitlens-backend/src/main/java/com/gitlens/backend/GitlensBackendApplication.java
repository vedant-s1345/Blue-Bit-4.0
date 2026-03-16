package com.gitlens.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@SpringBootApplication
@EnableAsync
public class GitlensBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(GitlensBackendApplication.class, args);
    }

    @Bean(name = "gitParserExecutor")
    public Executor gitParserExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // Max 3 repos parsed at the same time
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(3);

        // Queue up to 10 repos waiting if all threads are busy
        executor.setQueueCapacity(10);

        // Name threads so they're identifiable in logs
        executor.setThreadNamePrefix("git-parser-");

        // On shutdown, wait for active parses to finish
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);

        executor.initialize();
        return executor;
    }
}
