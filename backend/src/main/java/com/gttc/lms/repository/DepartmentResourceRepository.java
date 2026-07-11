package com.gttc.lms.repository;

import com.gttc.lms.model.DepartmentResource;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DepartmentResourceRepository extends JpaRepository<DepartmentResource, Long> {
    List<DepartmentResource> findByDepartmentIdOrderByCreatedAtDesc(Long departmentId);

    @Query("select r from DepartmentResource r where r.departmentId = :departmentId and (lower(r.title) like lower(concat('%', :q, '%')) or lower(coalesce(r.description,'')) like lower(concat('%', :q, '%')) or lower(coalesce(r.folder,'')) like lower(concat('%', :q, '%'))) order by r.createdAt desc")
    List<DepartmentResource> searchInDepartment(@Param("departmentId") Long departmentId, @Param("q") String q);

    @Query("select r from DepartmentResource r join Department d on r.departmentId = d.id where (lower(r.title) like lower(concat('%', :q, '%')) or lower(coalesce(r.description,'')) like lower(concat('%', :q, '%')) or lower(coalesce(r.folder,'')) like lower(concat('%', :q, '%'))) and d.published = true order by d.name, r.createdAt desc")
    List<DepartmentResource> searchAcrossDepartments(@Param("q") String q);
}
