package com.gttc.lms.service;

import com.gttc.lms.dto.BookResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.Book;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.BookRepository;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DigitalBookService {
    private static final Logger logger = LoggerFactory.getLogger(DigitalBookService.class);
    private static final String DIGITAL_BOOKS_CATEGORY = "Digital Books";
    private static final long MAX_PDF_BYTES = 2L * 1024L * 1024L;
    private static final long MAX_DIGITAL_BOOKS_PER_USER = 2L;

    private final BookRepository bookRepository;
    private final UserIdentityBridgeService userIdentityBridgeService;
    private final Path uploadDir;

    public DigitalBookService(
            BookRepository bookRepository,
            UserIdentityBridgeService userIdentityBridgeService,
            @Value("${app.storage.uploadDir}") String uploadDir
    ) {
        this.bookRepository = bookRepository;
        this.userIdentityBridgeService = userIdentityBridgeService;
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public List<BookResponse> listAllDigitalBooks() {
        return bookRepository.findByDigitalTrueOrderByCreatedAtDesc()
                .stream()
                .map(DtoMapper::toBook)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<BookResponse> listMyDigitalBooks(User user) {
        validateUser(user);
        UUID uploaderId = userIdentityBridgeService.resolveOperationalUserId(user);
        return bookRepository.findByDigitalTrueAndUploadedByUserIdOrderByCreatedAtDesc(uploaderId)
                .stream()
                .map(DtoMapper::toBook)
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(cacheNames = {"booksSearch", "bookById"}, allEntries = true)
    public BookResponse addDigitalBook(
            User user,
            String title,
            String author,
            String description,
            String pdfUrl,
            MultipartFile pdfFile
    ) {
        validateUser(user);

        String normalizedTitle = trimToNull(title);
        String normalizedAuthor = trimToNull(author);
        String normalizedDescription = trimToNull(description);
        String normalizedPdfUrl = trimToNull(pdfUrl);

        if (normalizedTitle == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Title is required");
        }
        if (normalizedAuthor == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Author is required");
        }

        boolean hasPdfFile = pdfFile != null && !pdfFile.isEmpty();
        boolean hasPdfLink = normalizedPdfUrl != null;

        if (!hasPdfFile && !hasPdfLink) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Upload a PDF file or provide a PDF link");
        }

        UUID uploaderId = userIdentityBridgeService.resolveOperationalUserId(user);
        long uploadedCount = bookRepository.countByDigitalTrueAndUploadedByUserId(uploaderId);
        if (uploadedCount >= MAX_DIGITAL_BOOKS_PER_USER) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "You can upload up to 2 digital books only");
        }

        String resolvedPdfUrl = hasPdfFile
                ? storePdf(pdfFile)
                : validateAndNormalizePdfLink(normalizedPdfUrl);

        Book book = new Book();
        book.setTitle(normalizedTitle);
        book.setAuthor(normalizedAuthor);
        book.setDescription(normalizedDescription);
        book.setCategory(DIGITAL_BOOKS_CATEGORY);
        book.setKeywords("digital,pdf");
        book.setCoverUrl(null);
        book.setCopiesTotal(1);
        book.setCopiesAvailable(1);
        book.setFeatured(false);
        book.setDigital(true);
        book.setPdfUrl(resolvedPdfUrl);
        book.setUploadedByUserId(uploaderId);
        bookRepository.save(book);

        return DtoMapper.toBook(book);
    }

    @Transactional
    @CacheEvict(cacheNames = {"booksSearch", "bookById"}, allEntries = true)
    public void deleteMyDigitalBook(User user, UUID bookId) {
        validateUser(user);

        UUID uploaderId = userIdentityBridgeService.resolveOperationalUserId(user);

        Book book = bookRepository.findById(bookId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Book not found"));

        if (!book.isDigital()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Only digital books can be deleted here");
        }

        if (book.getUploadedByUserId() == null || !book.getUploadedByUserId().equals(uploaderId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can delete only your uploaded digital books");
        }

        deleteStoredPdfIfLocal(book.getPdfUrl());
        bookRepository.delete(book);
    }

    private String storePdf(MultipartFile file) {
        validatePdfFile(file);

        try {
            Path digitalDir = uploadDir.resolve("digital-books").normalize();
            Files.createDirectories(digitalDir);

            String original = sanitizeFilename(file.getOriginalFilename());
            if (!original.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
                original = original + ".pdf";
            }

            String filename = Instant.now().toEpochMilli() + "-" + UUID.randomUUID() + "-" + original;
            Path destination = digitalDir.resolve(filename).normalize();

            if (!destination.startsWith(digitalDir)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid PDF file name");
            }

            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/digital-books/" + filename;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store PDF");
        }
    }

    private void deleteStoredPdfIfLocal(String pdfUrl) {
        String value = trimToNull(pdfUrl);
        if (value == null || !value.startsWith("/uploads/digital-books/")) {
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
            logger.warn("Unable to delete stored PDF {}", candidate, ex);
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

    private String sanitizeFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "book";
        }

        String cleaned = Paths.get(originalFilename).getFileName().toString().trim();
        cleaned = cleaned.replaceAll("\\\\", "_");
        cleaned = cleaned.replaceAll("/", "_");
        cleaned = cleaned.replaceAll("\\s+", "_");
        cleaned = cleaned.replaceAll("[^a-zA-Z0-9._-]", "");

        if (cleaned.isBlank()) {
            return "book";
        }

        return cleaned;
    }

    private void validateUser(User user) {
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
