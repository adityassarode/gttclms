package com.gttc.lms.service;

import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.AuthProvider;
import com.gttc.lms.model.enums.Role;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.UserRepository;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupabaseUserService {
    private static final Logger logger = LoggerFactory.getLogger(SupabaseUserService.class);

    private final UserRepository userRepository;
    private final EmailService emailService;
    private final String bootstrapAdminEmail;

    public SupabaseUserService(
            UserRepository userRepository,
            EmailService emailService,
            @Value("${app.admin.bootstrapEmail:}") String bootstrapAdminEmail
    ) {
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.bootstrapAdminEmail = bootstrapAdminEmail == null
                ? ""
                : bootstrapAdminEmail.trim().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public User resolveOrCreateFromJwt(Jwt jwt) {
        String subject = safeTrim(jwt.getSubject());
        if (subject == null) {
            throw new IllegalArgumentException("Token subject is missing");
        }

        String email = normalizeEmail(jwt.getClaimAsString("email"));
        if (email == null) {
            email = subject + "@supabase.local";
        }
        final String resolvedEmail = email;

        String displayName = resolveDisplayName(jwt, resolvedEmail);
        String phone = resolvePhone(jwt);

        Optional<User> byProviderId = userRepository.findByProviderAndProviderId(AuthProvider.SUPABASE, subject);
        Optional<User> byEmail = userRepository.findByEmail(resolvedEmail);

        User user = byProviderId.or(() -> byEmail).orElseGet(User::new);
        boolean isNew = user.getId() == null;
        boolean bootstrapAdmin = !bootstrapAdminEmail.isBlank()
            && bootstrapAdminEmail.equalsIgnoreCase(resolvedEmail);

        user.setProvider(AuthProvider.SUPABASE);
        user.setProviderId(subject);
        if (isNew || isBlank(user.getEmail())) {
            user.setEmail(resolvedEmail);
        }

        if (isBlank(user.getName())) {
            user.setName(displayName);
        }

        if (isBlank(user.getPhone()) && !isBlank(phone)) {
            user.setPhone(phone);
        }

        if (bootstrapAdmin && user.getRole() != Role.ADMIN) {
            user.setRole(Role.ADMIN);
        } else if (user.getRole() == null) {
            user.setRole(Role.USER);
        }

        if (user.getStatus() == null) {
            user.setStatus(UserStatus.ACTIVE);
        }

        if (isNew) {
            user.setVerified(false);
        }

        try {
            User saved = userRepository.saveAndFlush(user);

            if (isNew) {
                sendWelcomeEmail(saved);
            }

            return saved;
        } catch (DataIntegrityViolationException ex) {
            // Concurrent requests can attempt first-time profile creation in parallel.
            // If one transaction wins, resolve the existing record and continue.
            return userRepository.findByProviderAndProviderId(AuthProvider.SUPABASE, subject)
                    .or(() -> userRepository.findByEmail(resolvedEmail))
                    .orElseThrow(() -> ex);
        }
    }

    private void sendWelcomeEmail(User user) {
        try {
            emailService.sendHtml(
                    user.getEmail(),
                    "Welcome to GTTC Library",
                    "<h2>Welcome to GTTC Library</h2>"
                            + "<p>Your account is now connected using Supabase authentication.</p>"
                            + "<p>You can complete student verification to unlock borrowing and reservations.</p>"
            );
        } catch (Exception ex) {
            logger.warn("Welcome email failed for {}", user.getEmail(), ex);
        }
    }

    private String resolveDisplayName(Jwt jwt, String fallbackEmail) {
        String fullName = safeTrim(readUserMetadata(jwt, "full_name"));
        if (fullName != null) {
            return fullName;
        }
        String name = safeTrim(readUserMetadata(jwt, "name"));
        if (name != null) {
            return name;
        }
        if (fallbackEmail != null && fallbackEmail.contains("@")) {
            return fallbackEmail.substring(0, fallbackEmail.indexOf('@'));
        }
        return "Library User";
    }

    private String resolvePhone(Jwt jwt) {
        String directPhone = safeTrim(jwt.getClaimAsString("phone"));
        if (directPhone != null) {
            return directPhone;
        }
        return safeTrim(readUserMetadata(jwt, "phone"));
    }

    @SuppressWarnings("unchecked")
    private String readUserMetadata(Jwt jwt, String key) {
        Object metadata = jwt.getClaims().get("user_metadata");
        if (!(metadata instanceof Map<?, ?> map)) {
            return null;
        }
        Object value = map.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private String normalizeEmail(String email) {
        String value = safeTrim(email);
        if (value == null) {
            return null;
        }
        return value.toLowerCase(Locale.ROOT);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String safeTrim(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
