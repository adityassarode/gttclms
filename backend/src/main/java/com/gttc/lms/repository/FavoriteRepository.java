package com.gttc.lms.repository;

import com.gttc.lms.model.Favorite;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FavoriteRepository extends JpaRepository<Favorite, UUID> {
    List<Favorite> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByBook_Id(UUID bookId);

    Optional<Favorite> findByUserIdAndBookId(UUID userId, UUID bookId);
}
