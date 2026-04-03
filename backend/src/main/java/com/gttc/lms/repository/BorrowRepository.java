package com.gttc.lms.repository;

import com.gttc.lms.model.Borrow;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.BorrowStatus;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BorrowRepository extends JpaRepository<Borrow, UUID> {
    long countByUserAndStatus(User user, BorrowStatus status);

    List<Borrow> findByUserOrderByBorrowedAtDesc(User user);
}
