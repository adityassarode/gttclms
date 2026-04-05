package com.gttc.lms.repository;

import com.gttc.lms.model.Reservation;
import com.gttc.lms.model.enums.ReservationStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<Reservation, UUID> {
    long countByUserIdAndStatus(UUID userId, ReservationStatus status);

    long countByBook_Id(UUID bookId);

    long countByBook_IdAndStatus(UUID bookId, ReservationStatus status);

    List<Reservation> findByUserIdOrderByReservedAtDesc(UUID userId);

    List<Reservation> findByStatusAndExpiresAtBefore(ReservationStatus status, Instant time);
}
