package com.gttc.lms.service;

import com.gttc.lms.exception.ApiException;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.UserStatus;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserResolver {
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
            User user = supabaseUserService.resolveOrCreateFromJwt(jwtAuthenticationToken.getToken());
            ensureActive(user);
            return user;
        }

        throw new ApiException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    private void ensureActive(User user) {
        if (user.getStatus() == UserStatus.BANNED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "User is banned");
        }
    }
}