package com.gttc.lms.repository;

import com.gttc.lms.model.Borrow;
import com.gttc.lms.model.enums.BorrowStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BorrowRepository extends JpaRepository<Borrow, UUID> {
    long countByUserIdAndStatus(UUID userId, BorrowStatus status);

    long countByBook_Id(UUID bookId);

    long countByBook_IdAndStatus(UUID bookId, BorrowStatus status);

    List<Borrow> findByUserIdOrderByBorrowedAtDesc(UUID userId);
}
