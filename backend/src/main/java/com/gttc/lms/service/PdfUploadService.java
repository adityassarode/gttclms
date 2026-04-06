package com.gttc.lms.service;

import com.gttc.lms.exception.ApiException;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
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
public class PdfUploadService {
    private static final long MAX_PDF_BYTES = 2L * 1024L * 1024L;

    private final Path uploadDir;

    public PdfUploadService(@Value("${app.storage.uploadDir}") String uploadDir) {
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public String resolvePdfUrl(String pdfUrl, MultipartFile pdfFile, String subdirectory, String missingMessage) {
        String normalizedPdfUrl = trimToNull(pdfUrl);
        boolean hasPdfFile = pdfFile != null && !pdfFile.isEmpty();

        if (!hasPdfFile && normalizedPdfUrl == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, missingMessage);
        }

        if (hasPdfFile) {
            return storePdf(pdfFile, subdirectory);
        }

        return validateAndNormalizePdfLink(normalizedPdfUrl);
    }

    public String resolvePdfUrlForUpdate(
            String currentPdfUrl,
            String pdfUrl,
            MultipartFile pdfFile,
            String subdirectory
    ) {
        String normalizedPdfUrl = trimToNull(pdfUrl);
        boolean hasPdfFile = pdfFile != null && !pdfFile.isEmpty();

        if (!hasPdfFile && normalizedPdfUrl == null) {
            return trimToNull(currentPdfUrl);
        }

        String resolvedPdfUrl = hasPdfFile
                ? storePdf(pdfFile, subdirectory)
                : validateAndNormalizePdfLink(normalizedPdfUrl);

        deleteStoredPdfIfManaged(currentPdfUrl, subdirectory);
        return resolvedPdfUrl;
    }

    public void deleteStoredPdfIfManaged(String pdfUrl, String subdirectory) {
        String value = trimToNull(pdfUrl);
        String normalizedSubdirectory = trimToNull(subdirectory);
        if (value == null || normalizedSubdirectory == null) {
            return;
        }

        String expectedPrefix = "/uploads/" + normalizedSubdirectory + "/";
        if (!value.startsWith(expectedPrefix)) {
            return;
        }

        String relative = value.substring("/uploads/".length());
        Path candidate = uploadDir.resolve(relative).normalize();

        if (!candidate.startsWith(uploadDir)) {
            return;
        }

        try {
            Files.deleteIfExists(candidate);
        } catch (IOException ex) {
            // best-effort cleanup
        }
    }

    private String storePdf(MultipartFile file, String subdirectory) {
        validatePdfFile(file);

        try {
            Path resourceDir = uploadDir.resolve(subdirectory).normalize();
            Files.createDirectories(resourceDir);

            String original = sanitizeFilename(file.getOriginalFilename());
            if (!original.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
                original = original + ".pdf";
            }

            String filename = Instant.now().toEpochMilli() + "-" + UUID.randomUUID() + "-" + original;
            Path destination = resourceDir.resolve(filename).normalize();

            if (!destination.startsWith(resourceDir)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid PDF file name");
            }

            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/" + subdirectory + "/" + filename;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store PDF");
        }
    }

    private void validatePdfFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PDF file is required");
        }

        if (file.getSize() > MAX_PDF_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PDF size must be 2MB or less");
        }

        String filename = trimToNull(file.getOriginalFilename());
        String contentType = trimToNull(file.getContentType());

        boolean extensionIsPdf = filename != null && filename.toLowerCase(Locale.ROOT).endsWith(".pdf");
        boolean contentTypeIsPdf = contentType != null && contentType.toLowerCase(Locale.ROOT).contains("pdf");

        if (!extensionIsPdf && !contentTypeIsPdf) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only PDF files are allowed");
        }
    }

    private String validateAndNormalizePdfLink(String pdfUrl) {
        try {
            URI uri = new URI(pdfUrl.trim());
            String scheme = uri.getScheme();
            if (scheme == null ||
                    (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "PDF link must start with http:// or https://");
            }
            if (uri.getHost() == null || uri.getHost().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid PDF link");
            }
            return uri.toString();
        } catch (URISyntaxException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid PDF link");
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
