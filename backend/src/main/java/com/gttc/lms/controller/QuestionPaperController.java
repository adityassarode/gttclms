package com.gttc.lms.controller;

import com.gttc.lms.dto.QuestionPaperResponse;
import com.gttc.lms.model.User;
import com.gttc.lms.service.CurrentUserResolver;
import com.gttc.lms.service.QuestionPaperService;
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
@RequestMapping("/api/question-papers")
public class QuestionPaperController {
    private final QuestionPaperService questionPaperService;
    private final CurrentUserResolver currentUserResolver;

    public QuestionPaperController(QuestionPaperService questionPaperService, CurrentUserResolver currentUserResolver) {
        this.questionPaperService = questionPaperService;
        this.currentUserResolver = currentUserResolver;
    }

    @PostMapping
    public QuestionPaperResponse create(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @RequestParam String subjectName,
            @RequestParam String department,
            @RequestParam String semester,
            @RequestParam String academicYear,
            @RequestParam String questionPaperYear,
            @RequestParam(required = false) String pdfUrl,
            @RequestParam(required = false) MultipartFile pdfFile
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return questionPaperService.create(
                user,
                subjectName,
                department,
                semester,
                academicYear,
                questionPaperYear,
                pdfUrl,
                pdfFile
        );
    }

    @GetMapping
    public List<QuestionPaperResponse> list(
            @RequestParam(required = false) String subjectName,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String semester,
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) String questionPaperYear
    ) {
        return questionPaperService.list(subjectName, department, semester, academicYear, questionPaperYear);
    }

    @PutMapping("/{id}")
    public QuestionPaperResponse update(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable UUID id,
            @RequestParam String subjectName,
            @RequestParam String department,
            @RequestParam String semester,
            @RequestParam String academicYear,
            @RequestParam String questionPaperYear,
            @RequestParam(required = false) String pdfUrl,
            @RequestParam(required = false) MultipartFile pdfFile
    ) {
        User user = currentUserResolver.resolve(principal, authentication);
        return questionPaperService.update(
                user,
                id,
                subjectName,
                department,
                semester,
                academicYear,
                questionPaperYear,
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
        questionPaperService.delete(user, id);
    }
}
