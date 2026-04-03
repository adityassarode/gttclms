package com.gttc.lms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;

import com.gttc.lms.exception.ApiException;
import com.gttc.lms.repository.BorrowRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class BorrowServiceValidationTest {
    @Mock
    private BorrowRepository borrowRepository;

    @Mock
    private BookService bookService;

    @Mock
    private EmailService emailService;

    private BorrowService borrowService;

    @BeforeEach
    void setUp() {
        borrowService = new BorrowService(borrowRepository, bookService, emailService);
    }

    @Test
    void borrowBookWhenUserIsNullThrowsUnauthorized() {
        ApiException exception = assertThrows(ApiException.class, () -> borrowService.borrowBook(null, 1L));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        assertEquals("Authentication required", exception.getMessage());
        verifyNoInteractions(borrowRepository, bookService, emailService);
    }

    @Test
    void listBorrowsWhenUserIsNullThrowsUnauthorized() {
        ApiException exception = assertThrows(ApiException.class, () -> borrowService.listBorrows(null));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        assertEquals("Authentication required", exception.getMessage());
        verifyNoInteractions(borrowRepository, bookService, emailService);
    }
}
