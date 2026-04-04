package com.gttc.lms.service;

import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserResolver {
    private static final Logger logger = LoggerFactory.getLogger(CurrentUserResolver.class);

    private final SupabaseUserService supabaseUserService;

    public CurrentUserResolver(SupabaseUserService supabaseUserService) {
        this.supabaseUserService = supabaseUserService;
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

        throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required");
    }

    private void ensureActive(User user) {
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
    }
}