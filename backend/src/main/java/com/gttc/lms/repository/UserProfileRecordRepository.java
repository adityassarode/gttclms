package com.gttc.lms.repository;

import com.gttc.lms.model.UserProfileRecord;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserProfileRecordRepository extends JpaRepository<UserProfileRecord, UUID> {
    Optional<UserProfileRecord> findByRegisterNumber(String registerNumber);

    Optional<UserProfileRecord> findFirstByRegisterNumberIgnoreCase(String registerNumber);

    @Query(value = """
            select *
            from users u
            where upper(replace(replace(trim(u.register_number), ' ', ''), '-', '')) = :normalizedRegisterNumber
            limit 1
            """, nativeQuery = true)
    Optional<UserProfileRecord> findByRegisterNumberNormalized(
            @Param("normalizedRegisterNumber") String normalizedRegisterNumber
    );
}
