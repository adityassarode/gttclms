package com.gttc.lms.controller;

import com.gttc.lms.dto.StudyNoteResponse;
import com.gttc.lms.model.User;
import com.gttc.lms.service.CurrentUserResolver;
import com.gttc.lms.service.StudyNoteService;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/notes")
public class StudyNoteController {
    private final StudyNoteService studyNoteService;
    private final CurrentUserResolver currentUserResolver;

    public StudyNoteController(StudyNoteService studyNoteService, CurrentUserResolver currentUserResolver) {
        this.studyNoteService = studyNoteService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping
    public StudyNoteResponse create(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @RequestParam String subjectName,
            @RequestParam String department,
            @RequestParam String semester,
            @RequestParam String academicYear,
            @RequestParam String unitNumbers,
            @RequestParam(required = false) String pdfUrl,
            @RequestParam(required = false) MultipartFile pdfFile
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return studyNoteService.create(
                user,
                subjectName,
                department,
                semester,
                academicYear,
                unitNumbers,
                pdfUrl,
                pdfFile
        );
    }

    @GetMapping
    public List<StudyNoteResponse> list(
            @RequestParam(required = false) String subjectName,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) String unitNumber
    ) {
        return studyNoteService.list(subjectName, department, semester, academicYear, unitNumber);
    }

    @PutMapping("/{id}")
    public StudyNoteResponse update(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable UUID id,
            @RequestParam String subjectName,
            @RequestParam String department,
            @RequestParam String semester,
            @RequestParam String academicYear,
            @RequestParam String unitNumbers,
            @RequestParam(required = false) String pdfUrl,
            @RequestParam(required = false) MultipartFile pdfFile
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return studyNoteService.update(
                user,
                id,
                subjectName,
                department,
                semester,
                academicYear,
                unitNumbers,
                pdfUrl,
                pdfFile
        );
    }

    @DeleteMapping("/{id}")
    public void delete(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable UUID id
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        studyNoteService.delete(user, id);
    }
}
