package com.gttc.lms.controller;

import com.gttc.lms.dto.ReservationResponse;
import com.gttc.lms.dto.ReserveRequest;
import com.gttc.lms.model.User;
import com.gttc.lms.service.CurrentUserResolver;
import com.gttc.lms.service.ReservationService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.Authentication;
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
    private final CurrentUserResolver currentUserResolver;

    public ReservationController(
            ReservationService reservationService,
            CurrentUserResolver currentUserResolver
    ) {
        this.reservationService = reservationService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping
    public ReservationResponse reserve(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @Valid @RequestBody ReserveRequest request
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return reservationService.reserveBook(user, request.getBookId());
    }

    @PostMapping("/{id}/cancel")
    public ReservationResponse cancel(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable UUID id
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return reservationService.cancelReservation(user, id);
    }

    @GetMapping("/me")
    public List<ReservationResponse> mine(@AuthenticationPrincipal Object principal, Authentication authentication) {
        User user = currentUserResolver.resolve(principal, authentication);
        return reservationService.listReservations(user);
    }
}
