package com.gttc.lms.repository;

import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.AuthProvider;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByRegisterNumber(String registerNumber);

    Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId);
}
