package com.gttc.lms.service;

import com.gttc.lms.dto.QuestionPaperResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.QuestionPaper;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.Role;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.QuestionPaperRepository;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class QuestionPaperService {
    private final QuestionPaperRepository questionPaperRepository;
    private final PdfUploadService pdfUploadService;
    private final UserIdentityBridgeService userIdentityBridgeService;

    public QuestionPaperService(
            QuestionPaperRepository questionPaperRepository,
            PdfUploadService pdfUploadService,
            UserIdentityBridgeService userIdentityBridgeService
    ) {
        this.questionPaperRepository = questionPaperRepository;
        this.pdfUploadService = pdfUploadService;
        this.userIdentityBridgeService = userIdentityBridgeService;
    }

    @Transactional
    public QuestionPaperResponse create(
            User user,
            String subjectName,
            String department,
            String semester,
            String academicYear,
            String questionPaperYear,
            String pdfUrl,
            MultipartFile pdfFile
    ) {
        validateUser(user);
        validateAdmin(user);

        String normalizedSubjectName = requireValue(subjectName, "Subject name is required");
        String normalizedDepartment = requireValue(department, "Department is required");
        String normalizedSemester = requireValue(semester, "Semester is required");
        String normalizedAcademicYear = requireValue(academicYear, "Academic year is required");
        String normalizedQuestionPaperYear = requireValue(questionPaperYear, "Question paper year is required");

        String resolvedPdfUrl = pdfUploadService.resolvePdfUrl(
                pdfUrl,
                pdfFile,
                "question-papers",
                "Upload a PDF file or provide a PDF link"
        );

        QuestionPaper questionPaper = new QuestionPaper();
        questionPaper.setSubjectName(normalizedSubjectName);
        questionPaper.setDepartment(normalizedDepartment);
        questionPaper.setSemester(normalizedSemester);
        questionPaper.setAcademicYear(normalizedAcademicYear);
        questionPaper.setQuestionPaperYear(normalizedQuestionPaperYear);
        questionPaper.setPdfUrl(resolvedPdfUrl);
        questionPaper.setUploadedByUserId(userIdentityBridgeService.resolveOperationalUserId(user));

        questionPaperRepository.save(questionPaper);
        return toResponse(questionPaper);
    }

    @Transactional
    public QuestionPaperResponse update(
            User user,
            UUID id,
            String subjectName,
            String department,
            String semester,
            String academicYear,
            String questionPaperYear,
            String pdfUrl,
            MultipartFile pdfFile
    ) {
        validateUser(user);
        validateAdmin(user);

        QuestionPaper questionPaper = questionPaperRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Question paper not found"));

        String normalizedSubjectName = requireValue(subjectName, "Subject name is required");
        String normalizedDepartment = requireValue(department, "Department is required");
        String normalizedSemester = requireValue(semester, "Semester is required");
        String normalizedAcademicYear = requireValue(academicYear, "Academic year is required");
        String normalizedQuestionPaperYear = requireValue(questionPaperYear, "Question paper year is required");

        String resolvedPdfUrl = pdfUploadService.resolvePdfUrlForUpdate(
                questionPaper.getPdfUrl(),
                pdfUrl,
                pdfFile,
                "question-papers"
        );

        if (trimToNull(resolvedPdfUrl) == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Upload a PDF file or provide a PDF link");
        }

        questionPaper.setSubjectName(normalizedSubjectName);
        questionPaper.setDepartment(normalizedDepartment);
        questionPaper.setSemester(normalizedSemester);
        questionPaper.setAcademicYear(normalizedAcademicYear);
        questionPaper.setQuestionPaperYear(normalizedQuestionPaperYear);
        questionPaper.setPdfUrl(resolvedPdfUrl);

        questionPaperRepository.save(questionPaper);
        return toResponse(questionPaper);
    }

    @Transactional
    public void delete(User user, UUID id) {
        validateUser(user);
        validateAdmin(user);

        QuestionPaper questionPaper = questionPaperRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Question paper not found"));

        pdfUploadService.deleteStoredPdfIfManaged(questionPaper.getPdfUrl(), "question-papers");
        questionPaperRepository.delete(questionPaper);
    }

    @Transactional(readOnly = true)
    public List<QuestionPaperResponse> list(
            String subjectName,
            String department,
            String semester,
            String academicYear,
            String questionPaperYear
    ) {
        return questionPaperRepository
                .search(
                        normalizeContains(subjectName),
                        normalizeExact(department),
                        normalizeExact(semester),
                        normalizeExact(academicYear),
                        normalizeExact(questionPaperYear)
                )
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private QuestionPaperResponse toResponse(QuestionPaper questionPaper) {
        QuestionPaperResponse response = new QuestionPaperResponse();
        response.setId(questionPaper.getId());
        response.setSubjectName(questionPaper.getSubjectName());
        response.setDepartment(questionPaper.getDepartment());
        response.setSemester(questionPaper.getSemester());
        response.setAcademicYear(questionPaper.getAcademicYear());
        response.setQuestionPaperYear(questionPaper.getQuestionPaperYear());
        response.setPdfUrl(questionPaper.getPdfUrl());
        response.setCreatedAt(questionPaper.getCreatedAt());
        return response;
    }

    private void validateUser(User user) {
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
    }

    private void validateAdmin(User user) {
        if (user.getRole() != Role.ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }

    private String requireValue(String value, String errorMessage) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, errorMessage);
        }
        return normalized;
    }

    private String normalizeContains(String value) {
        String normalized = trimToNull(value);
        return normalized == null ? "" : normalized.toLowerCase(Locale.ROOT);
    }

    private String normalizeExact(String value) {
        String normalized = trimToNull(value);
        return normalized == null ? "" : normalized.toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
