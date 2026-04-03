package com.gttc.lms.controller;

import com.gttc.lms.dto.BookResponse;
import com.gttc.lms.model.User;
import com.gttc.lms.service.FavoriteService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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

    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    @GetMapping("/me")
    public List<BookResponse> mine(@AuthenticationPrincipal User user) {
        return favoriteService.listFavorites(user);
    }

    @PostMapping("/{bookId}")
    public void add(@AuthenticationPrincipal User user, @PathVariable UUID bookId) {
        favoriteService.addFavorite(user, bookId);
    }

    @DeleteMapping("/{bookId}")
    public void remove(@AuthenticationPrincipal User user, @PathVariable UUID bookId) {
        favoriteService.removeFavorite(user, bookId);
    }
}
