package com.gttc.lms.service;

import com.gttc.lms.dto.BookResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.Book;
import com.gttc.lms.model.Favorite;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.FavoriteRepository;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FavoriteService {
    private final FavoriteRepository favoriteRepository;
    private final BookService bookService;
    private final UserIdentityBridgeService userIdentityBridgeService;

    public FavoriteService(
            FavoriteRepository favoriteRepository,
            BookService bookService,
            UserIdentityBridgeService userIdentityBridgeService
    ) {
        this.favoriteRepository = favoriteRepository;
        this.bookService = bookService;
        this.userIdentityBridgeService = userIdentityBridgeService;
    }

    @Transactional(readOnly = true)
    public List<BookResponse> listFavorites(User user) {
        validateUser(user);
        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        return favoriteRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(Favorite::getBook)
                .map(DtoMapper::toBook)
                .collect(Collectors.toList());
    }

    public void addFavorite(User user, UUID bookId) {
        validateUser(user);
        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        Book book = bookService.findBook(bookId);
        favoriteRepository.findByUserIdAndBookId(userId, bookId)
                .orElseGet(() -> favoriteRepository.save(createFavorite(userId, book)));
    }

    public void removeFavorite(User user, UUID bookId) {
        validateUser(user);
        UUID userId = userIdentityBridgeService.resolveOperationalUserId(user);
        favoriteRepository.findByUserIdAndBookId(userId, bookId)
                .ifPresent(favoriteRepository::delete);
    }

    private Favorite createFavorite(UUID userId, Book book) {
        Favorite favorite = new Favorite();
        favorite.setUserId(userId);
        favorite.setBook(book);
        return favorite;
    }

    private void validateUser(User user) {
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
    }
}
