package com.gttc.lms.controller;

import com.gttc.lms.dto.BookResponse;
import com.gttc.lms.model.User;
import com.gttc.lms.service.CurrentUserResolver;
import com.gttc.lms.service.DigitalBookService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/books/digital")
public class DigitalBookController {
    private final DigitalBookService digitalBookService;
    private final CurrentUserResolver currentUserResolver;

    public DigitalBookController(
            DigitalBookService digitalBookService,
            CurrentUserResolver currentUserResolver
    ) {
        this.digitalBookService = digitalBookService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping
    public List<BookResponse> all() {
        return digitalBookService.listAllDigitalBooks();
    }

    @GetMapping("/me")
    public List<BookResponse> mine(
            @AuthenticationPrincipal Object principal,
            Authentication authentication
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return digitalBookService.listMyDigitalBooks(user);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public BookResponse add(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @RequestParam String title,
            @RequestParam String author,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String pdfUrl,
            @RequestParam(name = "pdfFile", required = false) MultipartFile pdfFile,
            @RequestParam(name = "coverImage", required = false) MultipartFile coverImage
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return digitalBookService.addDigitalBook(user, title, author, description, pdfUrl, pdfFile, coverImage);
    }

    @DeleteMapping("/{id}")
    public void delete(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable UUID id
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        digitalBookService.deleteMyDigitalBook(user, id);
    }
}
