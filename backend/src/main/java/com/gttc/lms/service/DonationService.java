package com.gttc.lms.service;

import com.gttc.lms.dto.DonationResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.Book;
import com.gttc.lms.model.Donation;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.BorrowStatus;
import com.gttc.lms.model.enums.ReservationStatus;
import com.gttc.lms.model.enums.Role;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.BookRepository;
import com.gttc.lms.repository.BorrowRepository;
import com.gttc.lms.repository.DonationRepository;
import com.gttc.lms.repository.FavoriteRepository;
import com.gttc.lms.repository.ReservationRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DonationService {
    private static final long MAX_IMAGE_BYTES = 2 * 1024 * 1024;
    private static final int MAX_COPIES = 20;
    private static final String DONATED_BOOKS_CATEGORY = "Donated Books";
    private static final String DONATED_BOOKS_KEYWORDS = "donated,community";

    private final DonationRepository donationRepository;
    private final BookRepository bookRepository;
    private final BorrowRepository borrowRepository;
    private final ReservationRepository reservationRepository;
    private final FavoriteRepository favoriteRepository;
    private final EmailService emailService;
    private final UserIdentityBridgeService userIdentityBridgeService;
    private final Path uploadDir;

    public DonationService(DonationRepository donationRepository,
                           BookRepository bookRepository,
                           BorrowRepository borrowRepository,
                           ReservationRepository reservationRepository,
                           FavoriteRepository favoriteRepository,
                           EmailService emailService,
                           UserIdentityBridgeService userIdentityBridgeService,
                           @Value("${app.storage.uploadDir}") String uploadDir) {
        this.donationRepository = donationRepository;
        this.bookRepository = bookRepository;
        this.borrowRepository = borrowRepository;
        this.reservationRepository = reservationRepository;
        this.favoriteRepository = favoriteRepository;
        this.emailService = emailService;
        this.userIdentityBridgeService = userIdentityBridgeService;
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Transactional
    public DonationResponse donate(User user,
                                   String title,
                                   String author,
                                   String description,
                                   int copies,
                                   MultipartFile image1,
                                   MultipartFile image2) {
        validateUser(user);
        validateDonationRequest(title, author, copies);

        String sanitizedTitle = title.trim();
        String sanitizedAuthor = author.trim();
        String sanitizedDescription = description == null ? null : description.trim();

        if (image1 != null && image1.getSize() > MAX_IMAGE_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image 1 exceeds 2MB");
        }
        if (image2 != null && image2.getSize() > MAX_IMAGE_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image 2 exceeds 2MB");
        }
        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        Donation donation = new Donation();
        donation.setUserId(userId);
        donation.setTitle(sanitizedTitle);
        donation.setAuthor(sanitizedAuthor);
        donation.setDescription(sanitizedDescription);
        donation.setCopies(copies);
        donation.setImage1(storeImage(image1));
        donation.setImage2(storeImage(image2));
        donation.setApproved(false);
        donation.setApprovedAt(null);
        donation.setApprovedByUserId(null);
        donation.setApprovedBookId(null);
        donationRepository.save(donation);
        emailService.send(user.getEmail(), "Thank You for Your Donation",
                "Thank you for donating books to GTTC Library.");
        DonationResponse response = DtoMapper.toDonation(donation);
        response.setDonorName(user.getName());
        return response;
    }

    @Transactional(readOnly = true)
    public List<DonationResponse> listAll() {
        return donationRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toDonationWithDonorName)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DonationResponse> listMine(User user) {
        validateUser(user);
        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        return donationRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(donation -> {
                    DonationResponse response = DtoMapper.toDonation(donation);
                    response.setDonorName(user.getName());
                    return response;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(cacheNames = {"booksSearch", "bookById"}, allEntries = true)
    public DonationResponse approveDonation(User admin, UUID donationId) {
        validateUser(admin);
        validateAdmin(admin);

        Donation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Donation not found"));

        if (!donation.isApproved()) {
            Book book = createBookFromDonation(donation);
            bookRepository.save(book);

            donation.setApproved(true);
            donation.setApprovedAt(Instant.now());
            donation.setApprovedByUserId(userIdentityBridgeService.resolveOperationalUserId(admin));
            donation.setApprovedBookId(book.getId());
            donationRepository.save(donation);

            String donorEmail = userIdentityBridgeService.resolveEmail(donation.getUserId());
            if (donorEmail != null && !donorEmail.isBlank()) {
                emailService.send(
                        donorEmail,
                        "Donation Approved",
                        "Your donated book \"" + donation.getTitle() + "\" has been approved and added to the library catalog."
                );
            }
        }

        return toDonationWithDonorName(donation);
    }

    @Transactional
    @CacheEvict(cacheNames = {"booksSearch", "bookById"}, allEntries = true)
    public void deleteMine(User user, UUID donationId) {
        validateUser(user);

        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        Donation donation = donationRepository.findByIdAndUserId(donationId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Donation not found"));

        if (donation.getApprovedBookId() != null) {
            ensureNoActiveCirculation(donation.getApprovedBookId());
            bookRepository.findById(donation.getApprovedBookId()).ifPresent(bookRepository::delete);
        }

        deleteStoredImageIfLocal(donation.getImage1());
        deleteStoredImageIfLocal(donation.getImage2());
        donationRepository.delete(donation);
    }

    private DonationResponse toDonationWithDonorName(Donation donation) {
        DonationResponse response = DtoMapper.toDonation(donation);
        response.setDonorName(resolveDonorName(donation.getUserId()));
        return response;
    }

    private String resolveDonorName(UUID userId) {
        return userIdentityBridgeService.resolveDisplayName(userId);
    }

    private Book createBookFromDonation(Donation donation) {
        Book book = new Book();
        book.setTitle(donation.getTitle());
        book.setAuthor(donation.getAuthor());
        book.setDescription(donation.getDescription());
        book.setCategory(DONATED_BOOKS_CATEGORY);
        book.setKeywords(DONATED_BOOKS_KEYWORDS);
        book.setCoverUrl(donation.getImage1() != null ? donation.getImage1() : donation.getImage2());
        book.setCopiesTotal(donation.getCopies());
        book.setCopiesAvailable(donation.getCopies());
        book.setFeatured(false);
        book.setDigital(false);
        book.setPdfUrl(null);
        book.setUploadedByUserId(donation.getUserId());
        return book;
    }

    private void ensureNoActiveCirculation(UUID bookId) {
        long borrowHistory = borrowRepository.countByBook_Id(bookId);
        long reservationHistory = reservationRepository.countByBook_Id(bookId);
        long favoriteCount = favoriteRepository.countByBook_Id(bookId);
        long activeBorrows = borrowRepository.countByBook_IdAndStatus(bookId, BorrowStatus.BORROWED);
        long activeReservations = reservationRepository.countByBook_IdAndStatus(bookId, ReservationStatus.ACTIVE);

        if (activeBorrows > 0 || activeReservations > 0) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot remove this donated book while it is borrowed or reserved"
            );
        }

        if (borrowHistory > 0 || reservationHistory > 0 || favoriteCount > 0) {
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot remove this donated book because circulation history already exists"
            );
        }
    }

    private String storeImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        try {
            Files.createDirectories(uploadDir);
            String original = sanitizeFilename(file.getOriginalFilename());
            String filename = Instant.now().toEpochMilli() + "-" + UUID.randomUUID() + "-" + original;
            Path destination = uploadDir.resolve(filename).normalize();
            if (!destination.startsWith(uploadDir)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid image file name");
            }
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/" + filename;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store image");
        }
    }

    private void deleteStoredImageIfLocal(String imageUrl) {
        if (imageUrl == null || !imageUrl.startsWith("/uploads/")) {
            return;
        }

        String relative = imageUrl.substring("/uploads/".length());
        Path candidate = uploadDir.resolve(relative).normalize();
        if (!candidate.startsWith(uploadDir)) {
            return;
        }

        try {
            Files.deleteIfExists(candidate);
        } catch (IOException ex) {
            // Best effort cleanup only.
        }
    }

    private String sanitizeFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "image";
        }

        String cleaned = Paths.get(originalFilename).getFileName().toString().trim();
        cleaned = cleaned.replaceAll("\\\\", "_");
        cleaned = cleaned.replaceAll("/", "_");
        cleaned = cleaned.replaceAll("\\s+", "_");
        cleaned = cleaned.replaceAll("[^a-zA-Z0-9._-]", "");

        if (cleaned.isBlank()) {
            return "image";
        }

        return cleaned;
    }

    private void validateDonationRequest(String title, String author, int copies) {
        if (title == null || title.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Title is required");
        }
        if (author == null || author.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Author is required");
        }
        if (copies < 1 || copies > MAX_COPIES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Copies must be between 1 and 20");
        }
    }

    private void validateUser(User user) {
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
    }

    private void validateAdmin(User user) {
        if ((user.getRole() == null || !user.getRole().hasAdminPrivileges())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }
}
