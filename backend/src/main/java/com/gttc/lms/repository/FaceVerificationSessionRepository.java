package com.gttc.lms.repository;

import com.gttc.lms.model.FaceVerificationSession;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FaceVerificationSessionRepository extends JpaRepository<FaceVerificationSession, UUID> {
    Optional<FaceVerificationSession> findByToken(String token);

    Optional<FaceVerificationSession> findByTokenAndAppUserId(String token, Long appUserId);
}
