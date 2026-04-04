package com.gttc.lms.service;

import com.gttc.lms.repository.StudentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class BackendWarmupService {
    private static final Logger logger = LoggerFactory.getLogger(BackendWarmupService.class);

    private final BookService bookService;
    private final StudentRepository studentRepository;
    private final boolean enabled;

    public BackendWarmupService(
            BookService bookService,
            StudentRepository studentRepository,
            @Value("${app.warmup.enabled:true}") boolean enabled
    ) {
        this.bookService = bookService;
        this.studentRepository = studentRepository;
        this.enabled = enabled;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        warm("startup");
    }

    @Scheduled(
            fixedDelayString = "${app.warmup.fixedDelayMs:300000}",
            initialDelayString = "${app.warmup.initialDelayMs:120000}"
    )
    public void scheduledWarmup() {
        warm("scheduled");
    }

    private void warm(String source) {
        if (!enabled) {
            return;
        }

        long startedAt = System.currentTimeMillis();
        try {
            bookService.search(null, null, null);
            studentRepository.count();
            long elapsed = System.currentTimeMillis() - startedAt;
            logger.info("Warmup [{}] completed in {} ms", source, elapsed);
        } catch (Exception ex) {
            logger.debug("Warmup [{}] skipped due to error: {}", source, ex.getMessage());
        }
    }
}
