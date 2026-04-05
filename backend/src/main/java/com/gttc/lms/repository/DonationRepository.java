package com.gttc.lms.repository;

import com.gttc.lms.model.Donation;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DonationRepository extends JpaRepository<Donation, UUID> {
    List<Donation> findAllByOrderByCreatedAtDesc();

    List<Donation> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Donation> findByIdAndUserId(UUID id, UUID userId);
}
