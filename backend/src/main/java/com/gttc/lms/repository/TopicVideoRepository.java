package com.gttc.lms.repository;

import com.gttc.lms.model.TopicVideo;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TopicVideoRepository extends JpaRepository<TopicVideo, UUID> {
    @Query("""
            select v
            from TopicVideo v
            where (:subjectName = '' or lower(v.subjectName) like concat('%', :subjectName, '%'))
                and (:department = '' or lower(v.department) = :department)
                and (:semester = '' or lower(v.semester) = :semester)
                and (:academicYear = '' or lower(v.academicYear) = :academicYear)
            order by v.createdAt desc
            """)
    List<TopicVideo> search(
            @Param("subjectName") String subjectName,
            @Param("department") String department,
            @Param("semester") String semester,
            @Param("academicYear") String academicYear
    );
}
