package com.gttc.lms.repository;

import com.gttc.lms.model.Book;
import com.gttc.lms.model.Favorite;
import com.gttc.lms.model.User;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteRepository extends JpaRepository<Favorite, UUID> {
    List<Favorite> findByUserOrderByCreatedAtDesc(User user);

    Optional<Favorite> findByUserAndBook(User user, Book book);
}
