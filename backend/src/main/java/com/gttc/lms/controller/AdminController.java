package com.gttc.lms.controller;

import com.gttc.lms.dto.AdminLoginRequest;
import com.gttc.lms.dto.AnalyticsResponse;
import com.gttc.lms.dto.AuthResponse;
import com.gttc.lms.dto.StudentRequest;
import com.gttc.lms.model.Student;
import com.gttc.lms.service.AdminService;
import com.gttc.lms.service.AuthService;
import com.gttc.lms.service.StudentService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AuthService authService;
    private final StudentService studentService;
    private final AdminService adminService;

    public AdminController(AuthService authService, StudentService studentService, AdminService adminService) {
        this.authService = authService;
        this.studentService = studentService;
        this.adminService = adminService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AdminLoginRequest request) {
        return authService.adminLogin(request);
    }

    @PostMapping("/students")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public Student addStudent(@Valid @RequestBody StudentRequest request) {
        return studentService.addStudent(request);
    }

    @PostMapping("/students/upload")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public List<Student> upload(@RequestParam MultipartFile file) {
        return studentService.uploadStudents(file);
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public AnalyticsResponse analytics() {
        return adminService.getAnalytics();
    }
}
