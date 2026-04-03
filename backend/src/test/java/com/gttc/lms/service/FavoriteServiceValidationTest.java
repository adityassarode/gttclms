package com.gttc.lms.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;

import com.gttc.lms.exception.ApiException;
import com.gttc.lms.repository.FavoriteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class FavoriteServiceValidationTest {
    @Mock
    private FavoriteRepository favoriteRepository;

    @Mock
    private BookService bookService;

    private FavoriteService favoriteService;

    @BeforeEach
    void setUp() {
        favoriteService = new FavoriteService(favoriteRepository, bookService);
    }

    @Test
    void addFavoriteWhenUserIsNullThrowsUnauthorized() {
        ApiException exception = assertThrows(ApiException.class, () -> favoriteService.addFavorite(null, 1L));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        assertEquals("Authentication required", exception.getMessage());
        verifyNoInteractions(favoriteRepository, bookService);
    }

    @Test
    void listFavoritesWhenUserIsNullThrowsUnauthorized() {
        ApiException exception = assertThrows(ApiException.class, () -> favoriteService.listFavorites(null));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatus());
        assertEquals("Authentication required", exception.getMessage());
        verifyNoInteractions(favoriteRepository, bookService);
    }
}
