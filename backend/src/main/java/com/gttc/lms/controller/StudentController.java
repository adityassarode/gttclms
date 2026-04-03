package com.gttc.lms.controller;

import com.gttc.lms.dto.StudentResponse;
import com.gttc.lms.model.Student;
import com.gttc.lms.service.CurrentUserResolver;
import com.gttc.lms.service.StudentService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/students")
public class StudentController {
    private final StudentService studentService;
    private final CurrentUserResolver currentUserResolver;

    public StudentController(StudentService studentService, CurrentUserResolver currentUserResolver) {
        this.studentService = studentService;
        this.currentUserResolver = currentUserResolver;
    }

    @GetMapping("/{registerNumber}")
    public StudentResponse lookup(
            @AuthenticationPrincipal Object principal,
            Authentication authentication,
            @PathVariable String registerNumber
    ) {
        currentUserResolver.resolve(principal, authentication);
        Student student = studentService.findByRegisterNumber(registerNumber);
        StudentResponse response = new StudentResponse();
        response.setRegisterNumber(student.getRegisterNumber());
        response.setName(student.getName());
        response.setDepartment(student.getDepartment());
        response.setSemester(student.getSemester());
        response.setYear(student.getYear());
        return response;
    }
}
