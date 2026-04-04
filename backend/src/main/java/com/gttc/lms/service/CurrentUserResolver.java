package com.gttc.lms.service;

import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.AuthProvider;
import com.gttc.lms.model.enums.Role;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.exception.ApiException;
import com.gttc.lms.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserResolver {
    private static final Logger logger = LoggerFactory.getLogger(CurrentUserResolver.class);

    private final SupabaseUserService supabaseUserService;
    private final UserRepository userRepository;
    private final boolean demoOpenAccess;
    private final String demoUserEmail;

    public CurrentUserResolver(
            SupabaseUserService supabaseUserService,
            UserRepository userRepository,
            @Value("${app.demo.openAccess:true}") boolean demoOpenAccess,
            @Value("${app.demo.userEmail:demo@gttc.local}") String demoUserEmail
    ) {
        this.supabaseUserService = supabaseUserService;
        this.userRepository = userRepository;
        this.demoOpenAccess = demoOpenAccess;
        this.demoUserEmail = demoUserEmail;
    }

    public User resolve(Object principal, Authentication authentication) {
        if (principal instanceof User user) {
            ensureActive(user);
            return user;
        }

        if (authentication instanceof JwtAuthenticationToken jwtAuthenticationToken) {
            try {
                User user = supabaseUserService.resolveOrCreateFromJwt(jwtAuthenticationToken.getToken());
                ensureActive(user);
                return user;
            } catch (ApiException ex) {
                throw ex;
            } catch (Exception ex) {
                logger.warn("Failed to resolve current user from JWT", ex);
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
            }
        }

        if (demoOpenAccess) {
            return resolveDemoUser();
        }

        throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }

    private void ensureActive(User user) {
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
    }

    private User resolveDemoUser() {
        return userRepository.findByEmail(demoUserEmail)
                .map(this::ensureDemoPrivileges)
                .orElseGet(() -> {
                    User demo = new User();
                    demo.setEmail(demoUserEmail);
                    demo.setName("Demo User");
                    demo.setProvider(AuthProvider.LOCAL);
                    demo.setRole(Role.ADMIN);
                    demo.setStatus(UserStatus.ACTIVE);
                    demo.setVerified(true);
                    return userRepository.save(demo);
                });
    }

    private User ensureDemoPrivileges(User user) {
        if (user.getStatus() != UserStatus.ACTIVE) {
            user.setStatus(UserStatus.ACTIVE);
        }
        if (user.getRole() != Role.ADMIN) {
            user.setRole(Role.ADMIN);
        }
        if (!user.isVerified()) {
            user.setVerified(true);
        }
        if (user.getProvider() == null) {
            user.setProvider(AuthProvider.LOCAL);
        }
        if (user.getName() == null || user.getName().isBlank()) {
            user.setName("Demo User");
        }
        return userRepository.save(user);
    }
}