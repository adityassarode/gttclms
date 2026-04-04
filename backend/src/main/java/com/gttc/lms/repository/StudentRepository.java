package com.gttc.lms.repository;

import com.gttc.lms.model.Student;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudentRepository extends JpaRepository<Student, UUID> {
    Optional<Student> findByRegisterNumber(String registerNumber);

    Optional<Student> findFirstByRegisterNumberIgnoreCase(String registerNumber);

    @Query("""
            select s
            from Student s
            where upper(replace(replace(trim(s.registerNumber), ' ', ''), '-', '')) = :normalizedRegisterNumber
            """)
    Optional<Student> findByRegisterNumberNormalized(
            @Param("normalizedRegisterNumber") String normalizedRegisterNumber
    );
}
