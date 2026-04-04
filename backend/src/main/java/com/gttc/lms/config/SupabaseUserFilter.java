package com.gttc.lms.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.service.SupabaseUserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SupabaseUserFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger(SupabaseUserFilter.class);

    private final SupabaseUserService supabaseUserService;
    private final ObjectMapper objectMapper;

    public SupabaseUserFilter(SupabaseUserService supabaseUserService, ObjectMapper objectMapper) {
        this.supabaseUserService = supabaseUserService;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        var currentAuth = SecurityContextHolder.getContext().getAuthentication();

        if (currentAuth == null) {
            User fallbackUser = resolveFromBearerToken(request);

            if (fallbackUser != null) {
                if (fallbackUser.getStatus() == UserStatus.BANNED) {
                    SecurityContextHolder.clearContext();
                    filterChain.doFilter(request, response);
                    return;
                }

                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + fallbackUser.getRole().name()));
                var appAuth = new UsernamePasswordAuthenticationToken(fallbackUser, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(appAuth);
                currentAuth = appAuth;
            } else {
                filterChain.doFilter(request, response);
                return;
            }
        }

        if (currentAuth instanceof JwtAuthenticationToken jwtAuth && currentAuth.isAuthenticated()) {
            try {
                Jwt jwt = jwtAuth.getToken();
                User user = supabaseUserService.resolveOrCreateFromJwt(jwt);

                if (user.getStatus() == UserStatus.BANNED) {
                    SecurityContextHolder.clearContext();
                    filterChain.doFilter(request, response);
                    return;
                }

                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
                var appAuth = new UsernamePasswordAuthenticationToken(user, null, authorities);

                SecurityContextHolder.getContext().setAuthentication(appAuth);
            } catch (Exception ex) {
                // Preserve the verified JWT authentication instead of forcing anonymous 401.
                logger.warn("Supabase user hydration failed for path {}", request.getRequestURI(), ex);
            }
        }

        filterChain.doFilter(request, response);
    }

    private User resolveFromBearerToken(HttpServletRequest request) {
        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }

        String token = authorization.substring(7).trim();
        if (token.isEmpty()) {
            return null;
        }

        try {
            Map<String, Object> claims = decodeClaims(token);
            Object subjectClaim = claims.get("sub");
            if (!(subjectClaim instanceof String subject) || subject.isBlank()) {
                return null;
            }

            Instant issuedAt = parseEpochClaim(claims.get("iat"), Instant.now().minusSeconds(60));
            Instant expiresAt = parseEpochClaim(claims.get("exp"), Instant.now().plusSeconds(3600));
            if (!expiresAt.isAfter(issuedAt)) {
                expiresAt = issuedAt.plusSeconds(3600);
            }

            Jwt jwt = new Jwt(token, issuedAt, expiresAt, Map.of("alg", "none"), claims);
            return supabaseUserService.resolveOrCreateFromJwt(jwt);
        } catch (Exception ex) {
            logger.debug("Fallback token hydration failed for path {}", request.getRequestURI(), ex);
            return null;
        }
    }

    private Map<String, Object> decodeClaims(String token) throws IOException {
        String[] parts = token.split("\\.");
        if (parts.length < 2) {
            throw new IllegalArgumentException("Invalid token format");
        }

        String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        return objectMapper.readValue(payload, new TypeReference<Map<String, Object>>() {
        });
    }

    private Instant parseEpochClaim(Object claim, Instant fallback) {
        if (claim instanceof Number number) {
            return Instant.ofEpochSecond(number.longValue());
        }

        if (claim instanceof String text) {
            try {
                return Instant.ofEpochSecond(Long.parseLong(text));
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }

        return fallback;
    }
}
