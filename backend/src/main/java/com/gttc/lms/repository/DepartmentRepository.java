package com.gttc.lms.repository;

import com.gttc.lms.model.Department;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, Long> {
    Optional<Department> findBySlug(String slug);

    @Query("select d from Department d where d.published = true and (lower(d.name) like lower(concat('%', :q, '%')) or lower(coalesce(d.description,'')) like lower(concat('%', :q, '%'))) order by d.createdAt desc")
    List<Department> searchPublished(@Param("q") String q);
}
