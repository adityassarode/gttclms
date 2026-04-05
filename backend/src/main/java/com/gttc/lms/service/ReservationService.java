package com.gttc.lms.service;

import com.gttc.lms.dto.ReservationResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.Book;
import com.gttc.lms.model.Reservation;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.ReservationStatus;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.ReservationRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReservationService {
    private static final int MAX_RESERVES = 1;

    private final ReservationRepository reservationRepository;
    private final BookService bookService;
    private final EmailService emailService;
    private final UserIdentityBridgeService userIdentityBridgeService;

    public ReservationService(ReservationRepository reservationRepository,
                              BookService bookService,
                              EmailService emailService,
                              UserIdentityBridgeService userIdentityBridgeService) {
        this.reservationRepository = reservationRepository;
        this.bookService = bookService;
        this.emailService = emailService;
        this.userIdentityBridgeService = userIdentityBridgeService;
    }

    @Transactional
    public ReservationResponse reserveBook(User user, UUID bookId) {
        validateUser(user);
        if (!user.isVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Verify your register number before reserving");
        }
        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        long activeCount = reservationRepository.countByUserIdAndStatus(userId, ReservationStatus.ACTIVE);
        if (activeCount >= MAX_RESERVES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Reserve limit reached (max 1 book)");
        }
        Book book = bookService.findBook(bookId);
        if (book.isDigital()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Digital books are available online and cannot be reserved");
        }
        if (book.getCopiesAvailable() < 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Book not available for reservation");
        }
        book.setCopiesAvailable(book.getCopiesAvailable() - 1);
        Reservation reservation = new Reservation();
        reservation.setUserId(userId);
        reservation.setBook(book);
        reservation.setReservedAt(Instant.now());
        reservation.setExpiresAt(Instant.now().plus(2, ChronoUnit.HOURS));
        reservation.setStatus(ReservationStatus.ACTIVE);
        reservationRepository.save(reservation);
        emailService.send(user.getEmail(), "GTTC Library Reservation",
                "Collect within 2 hours or the reservation will be cancelled.");
        return DtoMapper.toReservation(reservation);
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> listReservations(User user) {
        validateUser(user);
        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        return reservationRepository.findByUserIdOrderByReservedAtDesc(userId)
                .stream()
                .map(DtoMapper::toReservation)
                .collect(Collectors.toList());
    }

    @Transactional
    public ReservationResponse cancelReservation(User user, UUID reservationId) {
        validateUser(user);
        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        Reservation reservation = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Reservation not found"));
        if (!reservation.getUserId().equals(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Not allowed to cancel this reservation");
        }
        if (reservation.getStatus() != ReservationStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Reservation already closed");
        }
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.getBook().setCopiesAvailable(reservation.getBook().getCopiesAvailable() + 1);
        reservationRepository.save(reservation);
        return DtoMapper.toReservation(reservation);
    }

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void expireReservations() {
        List<Reservation> expired = reservationRepository
                .findByStatusAndExpiresAtBefore(ReservationStatus.ACTIVE, Instant.now());
        for (Reservation reservation : expired) {
            reservation.setStatus(ReservationStatus.EXPIRED);
            reservation.getBook().setCopiesAvailable(reservation.getBook().getCopiesAvailable() + 1);
            reservationRepository.save(reservation);
            sendReservationExpiredEmail(reservation.getUserId());
        }
    }

    private void sendReservationExpiredEmail(UUID userId) {
        String email = userIdentityBridgeService.resolveEmail(userId);
        if (email != null) {
            emailService.send(
                email,
                "Reservation Expired",
                "Your reservation expired. Please reserve again if needed."
            );
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
