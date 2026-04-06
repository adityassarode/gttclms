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
import java.util.Objects;
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
    private static final long MAX_EMAIL_ATTACHMENT_BYTES = 8L * 1024L * 1024L;
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

    private static final class GeneratedMultipartFile implements MultipartFile {
        private final String originalFilename;
        private final byte[] bytes;
        private final String contentType;

        private GeneratedMultipartFile(String originalFilename, byte[] bytes, String contentType) {
            this.originalFilename = originalFilename;
            this.bytes = bytes;
            this.contentType = contentType;
        }

        @Override
        public String getName() {
            return "file";
        }

        @Override
        public String getOriginalFilename() {
            return originalFilename;
        }

        @Override
        public String getContentType() {
            return contentType;
        }

        @Override
        public boolean isEmpty() {
            return bytes.length == 0;
        }

        @Override
        public long getSize() {
            return bytes.length;
        }

        @Override
        public byte[] getBytes() {
            return bytes;
        }

        @Override
        public java.io.InputStream getInputStream() {
            return new java.io.ByteArrayInputStream(bytes);
        }

        @Override
        public void transferTo(java.io.File dest) throws IOException {
            Files.write(dest.toPath(), bytes);
        }
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
            boolean emailSent = sendCleanedFileEmail(user, row, downloadUrl);

            return toResponse(row, downloadUrl, emailSent);
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store cleaned file");
        }
    }

    @Transactional
    public DataAnalysisFileResponse storeGeneratedFile(
            User user,
            byte[] fileBytes,
            String originalFileName,
            String requestedFormat,
            String requestBaseUrl
    ) {
        byte[] safeBytes = Objects.requireNonNullElse(fileBytes, new byte[0]);
        MultipartFile multipartFile = new GeneratedMultipartFile(
                originalFileName,
                safeBytes,
                contentTypeForFormat(requestedFormat)
        );

        return storeCleanedFile(user, multipartFile, originalFileName, requestedFormat, requestBaseUrl);
    }

    @Transactional
    public List<DataAnalysisFileResponse> listMine(User user, String requestBaseUrl) {
        validateUser(user);
        cleanupExpiredFilesInternal();

        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        return dataAnalysisFileRepository.findByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(userId, Instant.now())
                .stream()
                .map(row -> toResponse(row, buildDownloadUrl(requestBaseUrl, row.getId()), false))
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

    private DataAnalysisFileResponse toResponse(DataAnalysisFile row, String downloadUrl, boolean emailSent) {
        DataAnalysisFileResponse response = new DataAnalysisFileResponse();
        response.setId(row.getId());
        response.setOriginalFileName(row.getOriginalFileName());
        response.setCleanedFileName(row.getCleanedFileName());
        response.setFileFormat(row.getFileFormat());
        response.setDownloadUrl(downloadUrl);
        response.setEmailSent(emailSent);
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

    private boolean sendCleanedFileEmail(User user, DataAnalysisFile row, String downloadUrl) {
        String email = trimToNull(user.getEmail());
        if (email == null) {
            return false;
        }

        String expiresAt = row.getExpiresAt() == null
                ? "in 30 minutes"
                : EXPIRES_AT_FORMATTER.format(row.getExpiresAt());

        String subject = "Your file is ready";
        String html = """
                <p>Hello %s,</p>
                <p>Your file <strong>%s</strong> is ready.</p>
                <p>You can download it from <a href=\"%s\">this link</a>.</p>
                <p>This file will be removed automatically at %s.</p>
                <p>Thank you,<br/>GTTC LMS</p>
                """.formatted(
                escapeHtml(trimToNull(user.getName()) == null ? "User" : user.getName()),
                escapeHtml(row.getCleanedFileName()),
                escapeHtml(downloadUrl),
                escapeHtml(expiresAt)
        );

        byte[] attachmentBytes = loadEmailAttachmentBytes(row);
        if (attachmentBytes != null && attachmentBytes.length > 0) {
            return emailService.sendHtmlAndWait(
                    email,
                    subject,
                    html,
                    row.getCleanedFileName(),
                    attachmentBytes
            );
        }

        return emailService.sendHtmlAndWait(email, subject, html);
    }

    private byte[] loadEmailAttachmentBytes(DataAnalysisFile row) {
        String storedPath = trimToNull(row.getStoredFilePath());
        if (storedPath == null) {
            return null;
        }

        try {
            Path path = Paths.get(storedPath).toAbsolutePath().normalize();
            if (!path.startsWith(uploadDir) || !Files.exists(path)) {
                return null;
            }

            long size = Files.size(path);
            if (size <= 0 || size > MAX_EMAIL_ATTACHMENT_BYTES) {
                return null;
            }

            return Files.readAllBytes(path);
        } catch (IOException ex) {
            return null;
        }
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
            if ("csv".equals(normalized)
                    || "xlsx".equals(normalized)
                    || "pdf".equals(normalized)
                    || "docx".equals(normalized)) {
                return normalized;
            }
        }

        String ext = extensionOf(fileName);
        if ("pdf".equals(ext) || "docx".equals(ext)) {
            return ext;
        }

        if ("xlsx".equals(ext) || "xls".equals(ext)) {
            return "xlsx";
        }

        return "csv";
    }

    private String contentTypeForFormat(String requestedFormat) {
        String format = trimToNull(requestedFormat);
        if (format == null) {
            return "application/octet-stream";
        }

        return switch (format.toLowerCase(Locale.ROOT)) {
            case "pdf" -> "application/pdf";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "csv" -> "text/csv";
            default -> "application/octet-stream";
        };
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
