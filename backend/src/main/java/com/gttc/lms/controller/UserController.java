package com.gttc.lms.controller;

import com.gttc.lms.dto.BanUserRequest;
import com.gttc.lms.dto.UserResponse;
import com.gttc.lms.dto.VerifyStudentRequest;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.UserRepository;
import com.gttc.lms.service.AuthService;
import com.gttc.lms.service.DtoMapper;
import jakarta.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final AuthService authService;
    private final UserRepository userRepository;

    public UserController(AuthService authService, UserRepository userRepository) {
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal User user) {
        return DtoMapper.toUser(user);
    }

    @PostMapping("/verify")
    public UserResponse verify(@AuthenticationPrincipal User user, @Valid @RequestBody VerifyStudentRequest request) {
        return authService.verifyStudent(user, request);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> all() {
        return userRepository.findAll().stream().map(DtoMapper::toUser).collect(Collectors.toList());
    }

    @PostMapping("/ban")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse ban(@Valid @RequestBody BanUserRequest request) {
        User user = null;
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            user = userRepository.findByEmail(request.getEmail()).orElse(null);
        }
        if (user == null && request.getRegisterNumber() != null && !request.getRegisterNumber().isBlank()) {
            user = userRepository.findByRegisterNumber(request.getRegisterNumber()).orElse(null);
        }
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "User not found");
        }
        user.setStatus(UserStatus.BANNED);
        userRepository.save(user);
        return DtoMapper.toUser(user);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public void remove(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User not found"));
        userRepository.delete(user);
    }
}
