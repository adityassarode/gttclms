package com.gttc.lms.controller;

import com.gttc.lms.dto.BookResponse;
import com.gttc.lms.model.User;
import com.gttc.lms.service.CurrentUserResolver;
import com.gttc.lms.service.FavoriteService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {
    private final FavoriteService favoriteService;
    private final CurrentUserResolver currentUserResolver;

    public FavoriteController(FavoriteService favoriteService, CurrentUserResolver currentUserResolver) {
        this.favoriteService = favoriteService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping("/me")
    public List<BookResponse> mine(@AuthenticationPrincipal Object principal, Authentication authentication) {
        User user = currentUserResolver.resolve(principal, authentication);
        return favoriteService.listFavorites(user);
    }

    @PostMapping("/{bookId}")
    public void add(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable UUID bookId
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        favoriteService.addFavorite(user, bookId);
    }

    @DeleteMapping("/{bookId}")
    public void remove(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable UUID bookId
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        favoriteService.removeFavorite(user, bookId);
    }
}
