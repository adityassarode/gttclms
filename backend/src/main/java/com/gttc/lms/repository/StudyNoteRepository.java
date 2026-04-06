package com.gttc.lms.repository;

import com.gttc.lms.model.StudyNote;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudyNoteRepository extends JpaRepository<StudyNote, UUID> {
    @Query("""
            select n
            from StudyNote n
            where (:subjectName = '' or lower(n.subjectName) like concat('%', :subjectName, '%'))
                and (:department = '' or lower(n.department) = :department)
                and (:semester = '' or lower(n.semester) = :semester)
                and (:academicYear = '' or lower(n.academicYear) = :academicYear)
            order by n.createdAt desc
            """)
    List<StudyNote> search(
            @Param("subjectName") String subjectName,
            @Param("department") String department,
            @Param("semester") String semester,
            @Param("academicYear") String academicYear
    );
}
