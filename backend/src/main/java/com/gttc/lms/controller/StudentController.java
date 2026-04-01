package com.gttc.lms.controller;

import com.gttc.lms.dto.StudentResponse;
import com.gttc.lms.model.Student;
import com.gttc.lms.service.StudentService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.gttc.lms.model.User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/students")
public class StudentController {
    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping("/{registerNumber}")
    public StudentResponse lookup(@AuthenticationPrincipal User user, @PathVariable String registerNumber) {
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
