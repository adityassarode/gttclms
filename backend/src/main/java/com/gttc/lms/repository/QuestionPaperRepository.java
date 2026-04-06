package com.gttc.lms.repository;

import com.gttc.lms.model.QuestionPaper;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuestionPaperRepository extends JpaRepository<QuestionPaper, UUID> {
    @Query("""
            select q
            from QuestionPaper q
            where (:subjectName = '' or lower(q.subjectName) like concat('%', :subjectName, '%'))
                and (:department = '' or lower(q.department) = :department)
                and (:semester = '' or lower(q.semester) = :semester)
                and (:academicYear = '' or lower(q.academicYear) = :academicYear)
                and (:questionPaperYear = '' or lower(q.questionPaperYear) = :questionPaperYear)
            order by q.createdAt desc
            """)
    List<QuestionPaper> search(
            @Param("subjectName") String subjectName,
            @Param("department") String department,
            @Param("semester") String semester,
            @Param("academicYear") String academicYear,
            @Param("questionPaperYear") String questionPaperYear
    );
}
