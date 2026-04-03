package com.gttc.lms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;

import com.gttc.lms.exception.ApiException;
import com.gttc.lms.repository.ReservationRepository;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class ReservationServiceValidationTest {
    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private BookService bookService;

    @Mock
    private EmailService emailService;

    private ReservationService reservationService;

    @BeforeEach
    void setUp() {
        reservationService = new ReservationService(reservationRepository, bookService, emailService);
    }

    @Test
    void reserveBookWhenUserIsNullThrowsUnauthorized() {
        UUID id = UUID.randomUUID();
        ApiException exception = assertThrows(ApiException.class, () -> reservationService.reserveBook(null, id));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        assertEquals("Authentication required", exception.getMessage());
        verifyNoInteractions(reservationRepository, bookService, emailService);
    }

    @Test
    void listReservationsWhenUserIsNullThrowsUnauthorized() {
        ApiException exception = assertThrows(ApiException.class, () -> reservationService.listReservations(null));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        assertEquals("Authentication required", exception.getMessage());
        verifyNoInteractions(reservationRepository, bookService, emailService);
    }
}
