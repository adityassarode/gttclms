package com.gttc.lms.controller;

import com.gttc.lms.dto.ReservationResponse;
import com.gttc.lms.dto.ReserveRequest;
import com.gttc.lms.model.User;
import com.gttc.lms.service.ReservationService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reservations")
public class ReservationController {
    private final ReservationService reservationService;

    public ReservationController(ReservationService reservationService) {
        this.reservationService = reservationService;
    }

    @PostMapping
    public ReservationResponse reserve(@AuthenticationPrincipal User user, @Valid @RequestBody ReserveRequest request) {
        return reservationService.reserveBook(user, request.getBookId());
    }

    @PostMapping("/{id}/cancel")
    public ReservationResponse cancel(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return reservationService.cancelReservation(user, id);
    }

    @GetMapping("/me")
    public List<ReservationResponse> mine(@AuthenticationPrincipal User user) {
        return reservationService.listReservations(user);
    }
}
