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

    private final DonationRepository donationRepository;
    private final EmailService emailService;
    private final Path uploadDir;

    public DonationService(DonationRepository donationRepository,
                           EmailService emailService,
                           @Value("${app.storage.uploadDir}") String uploadDir) {
        this.donationRepository = donationRepository;
        this.emailService = emailService;
        this.uploadDir = Paths.get(uploadDir);
    }

    public DonationResponse donate(User user,
                                   String title,
                                   String author,
                                   String description,
                                   int copies,
                                   MultipartFile image1,
                                   MultipartFile image2) {
        validateUser(user);
        if (image1 != null && image1.getSize() > MAX_IMAGE_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image 1 exceeds 2MB");
        }
        if (image2 != null && image2.getSize() > MAX_IMAGE_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Image 2 exceeds 2MB");
        }
        Donation donation = new Donation();
        donation.setUser(user);
        donation.setTitle(title);
        donation.setAuthor(author);
        donation.setDescription(description);
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
        return donationRepository.findAll().stream()
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
            String original = file.getOriginalFilename();
            if (original == null || original.isBlank()) {
                original = "image";
            }
            String filename = Instant.now().toEpochMilli() + "-" + UUID.randomUUID() + "-" + original;
            Path destination = uploadDir.resolve(filename);
            Files.copy(file.getInputStream(), destination, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/" + filename;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store image");
        }
    }

    private void validateUser(User user) {
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
    }
}
