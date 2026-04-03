package com.gttc.lms.controller;

import com.gttc.lms.dto.BorrowRequest;
import com.gttc.lms.dto.BorrowResponse;
import com.gttc.lms.model.User;
import com.gttc.lms.service.CurrentUserResolver;
import com.gttc.lms.service.BorrowService;
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
@RequestMapping("/api/borrows")
public class BorrowController {
    private final BorrowService borrowService;
    private final CurrentUserResolver currentUserResolver;

    public BorrowController(BorrowService borrowService, CurrentUserResolver currentUserResolver) {
        this.borrowService = borrowService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping
    public BorrowResponse borrow(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @Valid @RequestBody BorrowRequest request
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return borrowService.borrowBook(user, request.getBookId());
    }

    @PostMapping("/{id}/return")
    public BorrowResponse returnBook(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable UUID id
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return borrowService.returnBook(user, id);
    }

    @GetMapping("/me")
    public List<BorrowResponse> mine(@AuthenticationPrincipal Object principal, Authentication authentication) {
        User user = currentUserResolver.resolve(principal, authentication);
        return borrowService.listBorrows(user);
    }
}
