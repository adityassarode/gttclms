package com.gttc.lms.controller;

import com.gttc.lms.dto.BorrowRequest;
import com.gttc.lms.dto.BorrowResponse;
import com.gttc.lms.model.User;
import com.gttc.lms.service.BorrowService;
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
@RequestMapping("/api/borrows")
public class BorrowController {
    private final BorrowService borrowService;

    public BorrowController(BorrowService borrowService) {
        this.borrowService = borrowService;
    }

    @PostMapping
    public BorrowResponse borrow(@AuthenticationPrincipal User user, @Valid @RequestBody BorrowRequest request) {
        return borrowService.borrowBook(user, request.getBookId());
    }

    @PostMapping("/{id}/return")
    public BorrowResponse returnBook(@AuthenticationPrincipal User user, @PathVariable UUID id) {
        return borrowService.returnBook(user, id);
    }

    @GetMapping("/me")
    public List<BorrowResponse> mine(@AuthenticationPrincipal User user) {
        return borrowService.listBorrows(user);
    }
}
