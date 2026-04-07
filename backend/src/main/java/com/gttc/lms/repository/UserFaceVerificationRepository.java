package com.gttc.lms.repository;

import com.gttc.lms.model.UserFaceVerification;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserFaceVerificationRepository extends JpaRepository<UserFaceVerification, UUID> {
    Optional<UserFaceVerification> findByAppUserId(Long appUserId);

    boolean existsByAppUserId(Long appUserId);
}
