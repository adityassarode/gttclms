package com.gttc.lms.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gttc.lms.dto.AdminLoginRequest;
import com.gttc.lms.dto.AuthResponse;
import com.gttc.lms.dto.GoogleLoginRequest;
import com.gttc.lms.dto.RegisterRequest;
import com.gttc.lms.dto.LoginRequest;
import com.gttc.lms.dto.UserResponse;
import com.gttc.lms.dto.VerifyStudentRequest;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.Student;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.AuthProvider;
import com.gttc.lms.model.enums.Role;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.UserRepository;
import java.util.Locale;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final StudentService studentService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final RestTemplate restTemplate = new RestTemplate();

    private final String adminUsername;
    private final String adminPassword;
    private final String googleClientId;
    private final boolean allowTestToken;

    public AuthService(UserRepository userRepository,
                       StudentService studentService,
                       JwtService jwtService,
                       PasswordEncoder passwordEncoder,
                       EmailService emailService,
                       @Value("${app.admin.username}") String adminUsername,
                       @Value("${app.admin.password}") String adminPassword,
                       @Value("${app.google.clientId}") String googleClientId,
                       @Value("${app.google.allowTestToken}") boolean allowTestToken) {
        this.userRepository = userRepository;
        this.studentService = studentService;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.adminUsername = adminUsername;
        this.adminPassword = adminPassword;
        this.googleClientId = googleClientId;
        this.allowTestToken = allowTestToken;
    }

    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmail(email).isPresent()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email already registered");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setName(request.getName());
        user.setPhone(request.getPhone());
        user.setRole(Role.USER);
        user.setStatus(UserStatus.ACTIVE);
        user.setProvider(AuthProvider.LOCAL);
        user.setVerified(false);
        userRepository.save(user);
        return new AuthResponse(jwtService.createToken(user), DtoMapper.toUser(user));
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        return new AuthResponse(jwtService.createToken(user), DtoMapper.toUser(user));
    }

    public AuthResponse adminLogin(AdminLoginRequest request) {
        if (!adminUsername.equals(request.getUsername()) || !adminPassword.equals(request.getPassword())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid admin credentials");
        }
        User admin = userRepository.findByEmail("admin@gttc.local")
                .orElseGet(() -> {
                    User user = new User();
                    user.setEmail("admin@gttc.local");
                    user.setName(adminUsername);
                    user.setRole(Role.ADMIN);
                    user.setStatus(UserStatus.ACTIVE);
                    user.setProvider(AuthProvider.LOCAL);
                    user.setVerified(true);
                    return userRepository.save(user);
                });
        return new AuthResponse(jwtService.createToken(admin), DtoMapper.toUser(admin));
    }

    public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
        GoogleTokenInfo info = verifyGoogleToken(request.getIdToken());
        String email = info.email == null ? null : info.email.trim().toLowerCase(Locale.ROOT);
        Optional<User> existing = userRepository.findByProviderAndProviderId(AuthProvider.GOOGLE, info.sub);
        User user = existing.orElseGet(() -> {
            Optional<User> byEmail = email == null ? Optional.empty() : userRepository.findByEmail(email);
            if (byEmail.isPresent()) {
                User linked = byEmail.get();
                linked.setProvider(AuthProvider.GOOGLE);
                linked.setProviderId(info.sub);
                return userRepository.save(linked);
            }
            User created = new User();
            created.setEmail(email);
            created.setName(info.name == null ? "Google User" : info.name);
            created.setProvider(AuthProvider.GOOGLE);
            created.setProviderId(info.sub);
            created.setRole(Role.USER);
            created.setStatus(UserStatus.ACTIVE);
            created.setVerified(false);
            return userRepository.save(created);
        });
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
        return new AuthResponse(jwtService.createToken(user), DtoMapper.toUser(user));
    }

    public UserResponse verifyStudent(User user, VerifyStudentRequest request) {
        String registerNumber = request.getRegisterNumber().trim();
        Student student = studentService.findByRegisterNumber(registerNumber);
        user.setRegisterNumber(student.getRegisterNumber());
        user.setName(request.getName() != null && !request.getName().isBlank() ? request.getName() : student.getName());
        user.setDepartment(request.getDepartment() != null && !request.getDepartment().isBlank()
            ? request.getDepartment() : student.getDepartment());
        user.setSemester(request.getSemester() != null && !request.getSemester().isBlank()
            ? request.getSemester() : student.getSemester());
        user.setYear(request.getYear() != null && !request.getYear().isBlank() ? request.getYear() : student.getYear());
        user.setVerified(true);
        userRepository.save(user);
        emailService.send(user.getEmail(), "Welcome to GTTC Library",
                "Welcome to GTTC Library. Your account is now verified.");
        return DtoMapper.toUser(user);
    }

    private GoogleTokenInfo verifyGoogleToken(String idToken) {
        if (allowTestToken && idToken != null && idToken.startsWith("test:")) {
            String email = idToken.substring("test:".length());
            GoogleTokenInfo info = new GoogleTokenInfo();
            info.email = email.isBlank() ? "demo@gttc.local" : email;
            info.name = "Demo Google User";
            info.sub = "test-sub-" + info.email;
            info.aud = googleClientId;
            return info;
        }
        try {
            GoogleTokenInfo info = restTemplate.getForObject(
                    "https://oauth2.googleapis.com/tokeninfo?id_token={token}",
                    GoogleTokenInfo.class,
                    idToken
            );
            if (info == null || info.email == null || info.sub == null) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
            }
            if (googleClientId != null && !googleClientId.isBlank() && !googleClientId.equals(info.aud)) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Google token not issued for this app");
            }
            return info;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid Google token");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class GoogleTokenInfo {
        public String email;
        public String name;
        public String sub;
        public String aud;
    }
}
