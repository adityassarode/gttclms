package com.gttc.lms.controller;

import com.gttc.lms.dto.DonationResponse;
import com.gttc.lms.model.User;
import com.gttc.lms.service.CurrentUserResolver;
import com.gttc.lms.service.DonationService;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/donations")
public class DonationController {
    private final DonationService donationService;
    private final CurrentUserResolver currentUserResolver;

    public DonationController(DonationService donationService, CurrentUserResolver currentUserResolver) {
        this.donationService = donationService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping
    public DonationResponse donate(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @RequestParam String title,
            @RequestParam String author,
            @RequestParam(required = false) String description,
            @RequestParam int copies,
            @RequestParam(required = false) MultipartFile image1,
            @RequestParam(required = false) MultipartFile image2
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return donationService.donate(user, title, author, description, copies, image1, image2);
    }

    @GetMapping("/me")
    public List<DonationResponse> mine(@AuthenticationPrincipal Object principal, Authentication authentication) {
        User user = currentUserResolver.resolve(principal, authentication);
        return donationService.listMine(user);
    }

    @GetMapping
    public List<DonationResponse> all() {
        return donationService.listAll();
    }
}
