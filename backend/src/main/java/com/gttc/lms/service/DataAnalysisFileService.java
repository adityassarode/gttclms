package com.gttc.lms.service;

import com.gttc.lms.dto.DataAnalysisFileResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.DataAnalysisFile;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.DataAnalysisFileRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DataAnalysisFileService {
    private static final Duration RETENTION_WINDOW = Duration.ofMinutes(30);
    private static final long MAX_CLEANED_FILE_BYTES = 50L * 1024L * 1024L;
    private static final DateTimeFormatter EXPIRES_AT_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss 'UTC'").withZone(ZoneOffset.UTC);

    private final DataAnalysisFileRepository dataAnalysisFileRepository;
    private final UserIdentityBridgeService userIdentityBridgeService;
    private final EmailService emailService;
    private final Path uploadDir;

    public DataAnalysisFileService(
            DataAnalysisFileRepository dataAnalysisFileRepository,
            UserIdentityBridgeService userIdentityBridgeService,
            EmailService emailService,
            @Value("${app.storage.uploadDir}") String uploadDir
    ) {
        this.dataAnalysisFileRepository = dataAnalysisFileRepository;
        this.userIdentityBridgeService = userIdentityBridgeService;
        this.emailService = emailService;
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public record DownloadPayload(Resource resource, String fileName, String fileFormat) {
    }

    @Transactional
    public DataAnalysisFileResponse storeCleanedFile(
            User user,
            MultipartFile file,
            String originalFileName,
            String requestedFormat,
            String requestBaseUrl
    ) {
        validateUser(user);
        cleanupExpiredFilesInternal();

        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cleaned file is required");
        }

        if (file.getSize() > MAX_CLEANED_FILE_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File size must be 50MB or less");
        }

        String fileFormat = resolveFileFormat(requestedFormat, file.getOriginalFilename());
        String normalizedOriginalName = resolveOriginalName(originalFileName, file.getOriginalFilename(), fileFormat);
        String cleanedFileName = sanitizeDisplayBaseName(stripExtension(normalizedOriginalName)) +
                " - Aditya Sarode." + fileFormat;

        Path dataDir = uploadDir.resolve("data-analysis").normalize();
        try {
            Files.createDirectories(dataDir);

            String storedName = Instant.now().toEpochMilli() + "-" + UUID.randomUUID() + "-" +
                    sanitizeStorageFilename(cleanedFileName);
            Path destination = dataDir.resolve(storedName).normalize();
            if (!destination.startsWith(dataDir)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid cleaned file name");
            }

            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);

            DataAnalysisFile row = new DataAnalysisFile();
            row.setUserId(userIdentityBridgeService.resolveOperationalUserId(user));
            row.setOriginalFileName(normalizedOriginalName);
            row.setCleanedFileName(cleanedFileName);
            row.setStoredFilePath(destination.toString());
            row.setFileFormat(fileFormat);
            row.setExpiresAt(Instant.now().plus(RETENTION_WINDOW));

            dataAnalysisFileRepository.save(row);

            String downloadUrl = buildDownloadUrl(requestBaseUrl, row.getId());
            sendCleanedFileEmail(user, row, downloadUrl);

            return toResponse(row, downloadUrl);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store cleaned file");
        }
    }

    @Transactional
    public List<DataAnalysisFileResponse> listMine(User user, String requestBaseUrl) {
        validateUser(user);
        cleanupExpiredFilesInternal();

        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        return dataAnalysisFileRepository.findByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(userId, Instant.now())
                .stream()
                .map(row -> toResponse(row, buildDownloadUrl(requestBaseUrl, row.getId())))
                .collect(Collectors.toList());
    }

    @Transactional
    public DownloadPayload loadForDownload(User user, UUID id) {
        validateUser(user);
        cleanupExpiredFilesInternal();

        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);

        DataAnalysisFile row = dataAnalysisFileRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cleaned file not found or expired"));

        if (row.getExpiresAt() != null && row.getExpiresAt().isBefore(Instant.now())) {
            deleteStoredFile(row.getStoredFilePath());
            dataAnalysisFileRepository.delete(row);
            throw new ApiException(HttpStatus.NOT_FOUND, "Cleaned file not found or expired");
        }

        try {
            Path path = Paths.get(row.getStoredFilePath()).toAbsolutePath().normalize();
            if (!path.startsWith(uploadDir) || !Files.exists(path)) {
                dataAnalysisFileRepository.delete(row);
                throw new ApiException(HttpStatus.NOT_FOUND, "Cleaned file not found or expired");
            }

            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists()) {
                dataAnalysisFileRepository.delete(row);
                throw new ApiException(HttpStatus.NOT_FOUND, "Cleaned file not found or expired");
            }

            return new DownloadPayload(resource, row.getCleanedFileName(), row.getFileFormat());
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to read cleaned file");
        }
    }

    @Transactional
    public void deleteMine(User user, UUID id) {
        validateUser(user);

        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        DataAnalysisFile row = dataAnalysisFileRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cleaned file not found"));

        deleteStoredFile(row.getStoredFilePath());
        dataAnalysisFileRepository.delete(row);
    }

    @Scheduled(fixedDelayString = "${app.dataAnalysis.cleanupDelayMs:60000}")
    @Transactional
    public void cleanupExpiredFiles() {
        cleanupExpiredFilesInternal();
    }

    private void cleanupExpiredFilesInternal() {
        List<DataAnalysisFile> expired = dataAnalysisFileRepository.findByExpiresAtBefore(Instant.now());
        if (expired.isEmpty()) {
            return;
        }

        expired.forEach(row -> deleteStoredFile(row.getStoredFilePath()));
        dataAnalysisFileRepository.deleteAll(expired);
    }

    private DataAnalysisFileResponse toResponse(DataAnalysisFile row, String downloadUrl) {
        DataAnalysisFileResponse response = new DataAnalysisFileResponse();
        response.setId(row.getId());
        response.setOriginalFileName(row.getOriginalFileName());
        response.setCleanedFileName(row.getCleanedFileName());
        response.setFileFormat(row.getFileFormat());
        response.setDownloadUrl(downloadUrl);
        response.setCreatedAt(row.getCreatedAt());
        response.setExpiresAt(row.getExpiresAt());
        return response;
    }

    private String buildDownloadUrl(String requestBaseUrl, UUID fileId) {
        String base = trimToNull(requestBaseUrl);
        if (base == null) {
            return "/api/data-analysis/cleaned-files/" + fileId + "/download";
        }
        return base.replaceAll("/+$", "") + "/api/data-analysis/cleaned-files/" + fileId + "/download";
    }

    private void sendCleanedFileEmail(User user, DataAnalysisFile row, String downloadUrl) {
        String email = trimToNull(user.getEmail());
        if (email == null) {
            return;
        }

        String expiresAt = row.getExpiresAt() == null
                ? "in 30 minutes"
                : EXPIRES_AT_FORMATTER.format(row.getExpiresAt());

        String subject = "Your cleaned data file is ready";
        String html = """
                <p>Hello %s,</p>
                <p>Your cleaned file <strong>%s</strong> is ready.</p>
                <p>You can download it from <a href=\"%s\">this link</a>.</p>
                <p>This file will be removed automatically at %s.</p>
                <p>Thank you,<br/>GTTC LMS</p>
                """.formatted(
                escapeHtml(trimToNull(user.getName()) == null ? "User" : user.getName()),
                escapeHtml(row.getCleanedFileName()),
                escapeHtml(downloadUrl),
                escapeHtml(expiresAt)
        );

        emailService.sendHtml(email, subject, html);
    }

    private void deleteStoredFile(String storedFilePath) {
        String value = trimToNull(storedFilePath);
        if (value == null) {
            return;
        }

        try {
            Path path = Paths.get(value).toAbsolutePath().normalize();
            if (!path.startsWith(uploadDir)) {
                return;
            }
            Files.deleteIfExists(path);
        } catch (IOException ex) {
            // best-effort cleanup
        }
    }

    private String resolveFileFormat(String requestedFormat, String fileName) {
        String fromRequest = trimToNull(requestedFormat);
        if (fromRequest != null) {
            String normalized = fromRequest.toLowerCase(Locale.ROOT);
            if ("csv".equals(normalized) || "xlsx".equals(normalized)) {
                return normalized;
            }
        }

        String ext = extensionOf(fileName);
        if ("xlsx".equals(ext) || "xls".equals(ext)) {
            return "xlsx";
        }

        return "csv";
    }

    private String resolveOriginalName(String originalFileName, String uploadedFileName, String fileFormat) {
        String name = trimToNull(originalFileName);
        if (name == null) {
            name = trimToNull(uploadedFileName);
        }
        if (name == null) {
            name = "dataset." + fileFormat;
        }

        String fileNameOnly = Paths.get(name).getFileName().toString();
        String withExtension = stripExtension(fileNameOnly) + "." + fileFormat;
        String normalized = withExtension.replaceAll("[\\r\\n]", " ").trim();
        return normalized.isEmpty() ? "dataset." + fileFormat : normalized;
    }

    private String sanitizeDisplayBaseName(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return "dataset";
        }

        String cleaned = normalized
                .replaceAll("\\\\", " ")
                .replaceAll("/", " ")
                .replaceAll("\\s+", " ")
                .trim();

        return cleaned.isEmpty() ? "dataset" : cleaned;
    }

    private String sanitizeStorageFilename(String value) {
        String cleaned = value
                .replaceAll("\\s+", "_")
                .replaceAll("[^a-zA-Z0-9._-]", "");

        if (cleaned.isEmpty()) {
            return "cleaned.csv";
        }

        return cleaned;
    }

    private String extensionOf(String fileName) {
        String value = trimToNull(fileName);
        if (value == null) {
            return "";
        }

        int dotIndex = value.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == value.length() - 1) {
            return "";
        }

        return value.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }

    private String stripExtension(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            return "dataset";
        }

        int dotIndex = normalized.lastIndexOf('.');
        if (dotIndex > 0) {
            return normalized.substring(0, dotIndex);
        }

        return normalized;
    }

    private void validateUser(User user) {
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
    }

    private String escapeHtml(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
