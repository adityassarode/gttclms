package com.gttc.lms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.Book;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.BookRepository;
import java.nio.file.Path;
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
class DigitalBookServiceValidationTest {
    @Mock
    private BookRepository bookRepository;

    @Mock
    private UserIdentityBridgeService userIdentityBridgeService;

    @TempDir
    private Path uploadDir;

    private DigitalBookService digitalBookService;

    @BeforeEach
    void setUp() {
        digitalBookService = new DigitalBookService(
                bookRepository,
                userIdentityBridgeService,
                uploadDir.toString()
        );
    }

    @Test
    void addDigitalBookRejectsThirdUploadForSameUser() {
        User user = activeUser();
        UUID operationalUserId = UUID.randomUUID();

        when(userIdentityBridgeService.resolveOperationalUserId(user)).thenReturn(operationalUserId);
        when(bookRepository.countByDigitalTrueAndUploadedByUserId(operationalUserId)).thenReturn(2L);

        ApiException exception = assertThrows(ApiException.class, () -> digitalBookService.addDigitalBook(
                user,
                "Third Book",
                "Author",
                "Description",
                "https://example.com/third-book.pdf",
                null
        ));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals("You can upload up to 2 digital books only", exception.getMessage());
        verify(bookRepository, never()).save(any(Book.class));
    }

    @Test
    void addDigitalBookRejectsPdfLargerThanTwoMb() {
        User user = activeUser();
        UUID operationalUserId = UUID.randomUUID();
        byte[] oversizedPdf = new byte[(2 * 1024 * 1024) + 1];
        MockMultipartFile pdfFile = new MockMultipartFile(
                "pdfFile",
                "large.pdf",
                "application/pdf",
                oversizedPdf
        );

        when(userIdentityBridgeService.resolveOperationalUserId(user)).thenReturn(operationalUserId);
        when(bookRepository.countByDigitalTrueAndUploadedByUserId(operationalUserId)).thenReturn(0L);

        ApiException exception = assertThrows(ApiException.class, () -> digitalBookService.addDigitalBook(
                user,
                "Large PDF Book",
                "Author",
                "Description",
                null,
                pdfFile
        ));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatus());
        assertEquals("PDF size must be 2MB or less", exception.getMessage());
        verify(bookRepository, never()).save(any(Book.class));
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