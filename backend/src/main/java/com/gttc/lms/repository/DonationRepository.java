package com.gttc.lms.repository;

import com.gttc.lms.model.Donation;
import com.gttc.lms.model.User;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DonationRepository extends JpaRepository<Donation, Long> {
    List<Donation> findAllByOrderByCreatedAtDesc();

    List<Donation> findByUserOrderByCreatedAtDesc(User user);
}
