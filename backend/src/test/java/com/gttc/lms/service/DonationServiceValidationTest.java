package com.gttc.lms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.gttc.lms.dto.DonationResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.Donation;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.DonationRepository;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class DonationServiceValidationTest {
    @Mock
    private DonationRepository donationRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private UserIdentityBridgeService userIdentityBridgeService;

    @TempDir
    private Path uploadDir;

    private DonationService donationService;

    @BeforeEach
    void setUp() {
        donationService = new DonationService(
                donationRepository,
                emailService,
                userIdentityBridgeService,
                uploadDir.toString()
        );
    }

    @Test
    void donateWhenUserIsNullThrowsUnauthorized() {
        ApiException exception = assertThrows(ApiException.class,
                () -> donationService.donate(null, "Book", "Author", "Desc", 1, null, null));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        assertEquals("Authentication required", exception.getMessage());
        verifyNoInteractions(donationRepository, emailService);
    }

    @Test
    void donateWhenTitleIsBlankThrowsBadRequest() {
        ApiException exception = assertThrows(ApiException.class,
                () -> donationService.donate(activeUser(), "  ", "Author", "Desc", 1, null, null));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals("Title is required", exception.getMessage());
        verifyNoInteractions(donationRepository, emailService);
    }

    @Test
    void donateWhenAuthorIsBlankThrowsBadRequest() {
        ApiException exception = assertThrows(ApiException.class,
                () -> donationService.donate(activeUser(), "Book", "  ", "Desc", 1, null, null));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals("Author is required", exception.getMessage());
        verifyNoInteractions(donationRepository, emailService);
    }

    @Test
    void donateWhenCopiesBelowRangeThrowsBadRequest() {
        ApiException exception = assertThrows(ApiException.class,
                () -> donationService.donate(activeUser(), "Book", "Author", "Desc", 0, null, null));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals("Copies must be between 1 and 20", exception.getMessage());
        verifyNoInteractions(donationRepository, emailService);
    }

    @Test
    void donateWhenCopiesAboveRangeThrowsBadRequest() {
        ApiException exception = assertThrows(ApiException.class,
                () -> donationService.donate(activeUser(), "Book", "Author", "Desc", 21, null, null));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals("Copies must be between 1 and 20", exception.getMessage());
        verifyNoInteractions(donationRepository, emailService);
    }

    @Test
    void donateWhenImageExceedsLimitThrowsBadRequest() {
        byte[] oversized = new byte[(2 * 1024 * 1024) + 1];
        MockMultipartFile image1 = new MockMultipartFile("image1", "cover.jpg", "image/jpeg", oversized);

        ApiException exception = assertThrows(ApiException.class,
                () -> donationService.donate(activeUser(), "Book", "Author", "Desc", 1, image1, null));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals("Image 1 exceeds 2MB", exception.getMessage());
        verifyNoInteractions(donationRepository, emailService);
    }

    @Test
    void donateSanitizesFilenameAndStoresInsideUploadDirectory() {
        when(donationRepository.save(any(Donation.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userIdentityBridgeService.resolveOperationalUserId(any(User.class))).thenReturn(UUID.randomUUID());
        MockMultipartFile image1 = new MockMultipartFile(
                "image1",
                "../unsafe name?.png",
                "image/png",
                "test-image".getBytes(StandardCharsets.UTF_8)
        );

        DonationResponse response = donationService.donate(activeUser(), "Book", "Author", "Desc", 1, image1, null);

        assertNotNull(response.getImage1());
        assertTrue(response.getImage1().startsWith("/uploads/"));
        assertFalse(response.getImage1().contains(".."));

        String storedFilename = response.getImage1().replace("/uploads/", "");
        assertTrue(Files.exists(uploadDir.resolve(storedFilename)));

        verify(donationRepository).save(any(Donation.class));
        verify(emailService).send(eq("user@example.com"), anyString(), anyString());
    }

    @Test
    void listAllReturnsDonationsFromSortedRepositoryMethod() {
        when(donationRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of());

        List<DonationResponse> response = donationService.listAll();

        assertTrue(response.isEmpty());
        verify(donationRepository).findAllByOrderByCreatedAtDesc();
    }

    private User activeUser() {
        User user = new User();
        user.setStatus(UserStatus.ACTIVE);
        user.setEmail("user@example.com");
        user.setName("User");
        user.setProviderId(UUID.randomUUID().toString());
        return user;
    }
}
