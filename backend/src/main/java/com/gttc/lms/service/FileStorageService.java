package com.gttc.lms.service;

import com.gttc.lms.exception.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {
    private final Path uploadDir;

    public FileStorageService(@Value("${app.storage.uploadDir}") String uploadDir) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public String store(String subdirectory, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File is required");
        }

        try {
            Path resourceDir = uploadDir.resolve(subdirectory).normalize();
            Files.createDirectories(resourceDir);

            String original = sanitizeFilename(file.getOriginalFilename());
            String filename = Instant.now().toEpochMilli() + "-" + UUID.randomUUID() + "-" + original;
            Path destination = resourceDir.resolve(filename).normalize();

            if (!destination.startsWith(resourceDir)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid file name");
            }

            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/" + subdirectory + "/" + filename;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file");
        }
    }

    private String sanitizeFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "resource";
        }

        String cleaned = Paths.get(originalFilename).getFileName().toString().trim();
        cleaned = cleaned.replaceAll("\\\\", "_");
        cleaned = cleaned.replaceAll("/", "_");
        cleaned = cleaned.replaceAll("\\s+", "_");
        cleaned = cleaned.replaceAll("[^a-zA-Z0-9._-]", "");

        if (cleaned.isBlank()) {
            return "resource";
        }

        return cleaned;
    }
}
