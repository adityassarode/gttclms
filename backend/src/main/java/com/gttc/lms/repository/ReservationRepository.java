package com.gttc.lms.repository;

import com.gttc.lms.model.Reservation;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.ReservationStatus;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    long countByUserAndStatus(User user, ReservationStatus status);

    List<Reservation> findByUserOrderByReservedAtDesc(User user);

    List<Reservation> findByStatusAndExpiresAtBefore(ReservationStatus status, Instant time);
}
