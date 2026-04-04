package com.gttc.lms.config;

import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.UserRepository;
import com.gttc.lms.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final String localIssuerMarker;
    private static final String LOCAL_USER_ROLE_MARKER = "\"role\":\"USER\"";
    private static final String LOCAL_ADMIN_ROLE_MARKER = "\"role\":\"ADMIN\"";

    public JwtAuthFilter(
            JwtService jwtService,
            UserRepository userRepository,
            @Value("${app.jwt.issuer}") String localIssuer
    ) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
        this.localIssuerMarker = "\"iss\":\"" + localIssuer + "\"";
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            boolean shouldHandleLocally = isLocalAppToken(token)
                    && SecurityContextHolder.getContext().getAuthentication() == null;

            if (shouldHandleLocally) {
                try {
                    Long userId = jwtService.parseUserId(token);
                    userRepository.findById(userId).ifPresent(user -> {
                        if (user.getStatus() == UserStatus.BANNED) {
                            return;
                        }
                        List<SimpleGrantedAuthority> authorities =
                                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(user, null, authorities);
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    });
                } catch (Exception ex) {
                    SecurityContextHolder.clearContext();
                }
            }
        }
        filterChain.doFilter(request, response);
    }

    private boolean isLocalAppToken(String token) {
        String[] parts = token.split("\\.");
        if (parts.length < 2) {
            return false;
        }

        try {
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
            return payload.contains(localIssuerMarker)
                    && (payload.contains(LOCAL_USER_ROLE_MARKER) || payload.contains(LOCAL_ADMIN_ROLE_MARKER));
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }
}
