package com.gttc.lms.service;

import com.gttc.lms.dto.StudyNoteResponse;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.StudyNote;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.Role;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.StudyNoteRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StudyNoteService {
    private final StudyNoteRepository studyNoteRepository;
    private final PdfUploadService pdfUploadService;
    private final UserIdentityBridgeService userIdentityBridgeService;

    public StudyNoteService(
            StudyNoteRepository studyNoteRepository,
            PdfUploadService pdfUploadService,
            UserIdentityBridgeService userIdentityBridgeService
    ) {
        this.studyNoteRepository = studyNoteRepository;
        this.pdfUploadService = pdfUploadService;
        this.userIdentityBridgeService = userIdentityBridgeService;
    }

    @Transactional
    public StudyNoteResponse create(
            User user,
            String subjectName,
            String department,
            String semester,
            String academicYear,
            String unitNumbers,
            String pdfUrl,
            MultipartFile pdfFile
    ) {
        validateUser(user);
        validateAdmin(user);

        String normalizedSubjectName = requireValue(subjectName, "Subject name is required");
        String normalizedDepartment = requireValue(department, "Department is required");
        String normalizedSemester = requireValue(semester, "Semester is required");
        String normalizedAcademicYear = requireValue(academicYear, "Academic year is required");
        String normalizedUnitNumbers = normalizeUnitNumbers(unitNumbers);

        String resolvedPdfUrl = pdfUploadService.resolvePdfUrl(
                pdfUrl,
                pdfFile,
                "notes",
                "Upload a PDF file or provide a PDF link"
        );

        StudyNote note = new StudyNote();
        note.setSubjectName(normalizedSubjectName);
        note.setDepartment(normalizedDepartment);
        note.setSemester(normalizedSemester);
        note.setAcademicYear(normalizedAcademicYear);
        note.setUnitNumbers(normalizedUnitNumbers);
        note.setPdfUrl(resolvedPdfUrl);
        note.setUploadedByUserId(userIdentityBridgeService.resolveOperationalUserId(user));

        studyNoteRepository.save(note);
        return toResponse(note);
    }

    @Transactional
    public StudyNoteResponse update(
            User user,
            UUID id,
            String subjectName,
            String department,
            String semester,
            String academicYear,
            String unitNumbers,
            String pdfUrl,
            MultipartFile pdfFile
    ) {
        validateUser(user);
        validateAdmin(user);

        StudyNote note = studyNoteRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Note not found"));

        String normalizedSubjectName = requireValue(subjectName, "Subject name is required");
        String normalizedDepartment = requireValue(department, "Department is required");
        String normalizedSemester = requireValue(semester, "Semester is required");
        String normalizedAcademicYear = requireValue(academicYear, "Academic year is required");
        String normalizedUnitNumbers = normalizeUnitNumbers(unitNumbers);

        String resolvedPdfUrl = pdfUploadService.resolvePdfUrlForUpdate(
                note.getPdfUrl(),
                pdfUrl,
                pdfFile,
                "notes"
        );

        if (trimToNull(resolvedPdfUrl) == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Upload a PDF file or provide a PDF link");
        }

        note.setSubjectName(normalizedSubjectName);
        note.setDepartment(normalizedDepartment);
        note.setSemester(normalizedSemester);
        note.setAcademicYear(normalizedAcademicYear);
        note.setUnitNumbers(normalizedUnitNumbers);
        note.setPdfUrl(resolvedPdfUrl);

        studyNoteRepository.save(note);
        return toResponse(note);
    }

    @Transactional
    public void delete(User user, UUID id) {
        validateUser(user);
        validateAdmin(user);

        StudyNote note = studyNoteRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Note not found"));

        pdfUploadService.deleteStoredPdfIfManaged(note.getPdfUrl(), "notes");
        studyNoteRepository.delete(note);
    }

    @Transactional(readOnly = true)
    public List<StudyNoteResponse> list(
            String subjectName,
            String department,
            String semester,
            String academicYear,
            String unitNumber
    ) {
        String normalizedUnitFilter = normalizeUnitFilter(unitNumber);

        return studyNoteRepository
                .search(
                        normalizeContains(subjectName),
                        normalizeExact(department),
                        normalizeExact(semester),
                        normalizeExact(academicYear)
                )
                .stream()
                .filter(note -> normalizedUnitFilter == null || containsUnit(note.getUnitNumbers(), normalizedUnitFilter))
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private StudyNoteResponse toResponse(StudyNote note) {
        StudyNoteResponse response = new StudyNoteResponse();
        response.setId(note.getId());
        response.setSubjectName(note.getSubjectName());
        response.setDepartment(note.getDepartment());
        response.setSemester(note.getSemester());
        response.setAcademicYear(note.getAcademicYear());
        response.setUnitNumbers(note.getUnitNumbers());
        response.setPdfUrl(note.getPdfUrl());
        response.setCreatedAt(note.getCreatedAt());
        return response;
    }

    private String normalizeUnitNumbers(String unitNumbers) {
        String value = requireValue(unitNumbers, "Unit numbers are required");
        String[] parts = value.split(",");
        Set<String> normalized = new LinkedHashSet<>();

        for (String part : parts) {
            String token = trimToNull(part);
            if (token == null) {
                continue;
            }
            if (!token.matches("\\d+")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Unit numbers must be comma-separated numeric values");
            }
            normalized.add(token);
        }

        if (normalized.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unit numbers are required");
        }

        return String.join(",", normalized);
    }

    private String normalizeUnitFilter(String unitNumber) {
        String token = trimToNull(unitNumber);
        if (token == null) {
            return null;
        }
        if (!token.matches("\\d+")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Unit filter must be numeric");
        }
        return token;
    }

    private boolean containsUnit(String unitNumbers, String unitFilter) {
        if (unitFilter == null) {
            return true;
        }
        String[] tokens = (unitNumbers == null ? "" : unitNumbers).split(",");
        for (String token : tokens) {
            if (unitFilter.equals(trimToNull(token))) {
                return true;
            }
        }
        return false;
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
