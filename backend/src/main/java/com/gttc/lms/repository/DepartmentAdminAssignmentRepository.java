package com.gttc.lms.repository;

import com.gttc.lms.model.DepartmentAdminAssignment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DepartmentAdminAssignmentRepository extends JpaRepository<DepartmentAdminAssignment, Long> {
    List<DepartmentAdminAssignment> findByAppUserId(Long appUserId);
    Optional<DepartmentAdminAssignment> findByAppUserIdAndDepartmentId(Long appUserId, Long departmentId);
}
