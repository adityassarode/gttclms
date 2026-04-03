package com.gttc.lms.service;

import com.gttc.lms.dto.DonationResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.Donation;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.DonationRepository;
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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DonationService {
    private static final long MAX_IMAGE_BYTES = 2 * 1024 * 1024;
    private static final int MAX_COPIES = 20;

    private final DonationRepository donationRepository;
    private final EmailService emailService;
    private final Path uploadDir;

    public DonationService(DonationRepository donationRepository,
                           EmailService emailService,
                           @Value("${app.storage.uploadDir}") String uploadDir) {
        this.donationRepository = donationRepository;
        this.emailService = emailService;
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
        Donation donation = new Donation();
        donation.setUser(user);
        donation.setTitle(sanitizedTitle);
        donation.setAuthor(sanitizedAuthor);
        donation.setDescription(sanitizedDescription);
        donation.setCopies(copies);
        donation.setImage1(storeImage(image1));
        donation.setImage2(storeImage(image2));
        donationRepository.save(donation);
        emailService.send(user.getEmail(), "Thank You for Your Donation",
                "Thank you for donating books to GTTC Library.");
        return DtoMapper.toDonation(donation);
    }

    @Transactional(readOnly = true)
    public List<DonationResponse> listAll() {
        return donationRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(DtoMapper::toDonation)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DonationResponse> listMine(User user) {
        validateUser(user);
        return donationRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(DtoMapper::toDonation)
                .collect(Collectors.toList());
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
}
