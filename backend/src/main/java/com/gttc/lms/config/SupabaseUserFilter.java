package com.gttc.lms.config;

import com.gttc.lms.model.User;
import com.gttc.lms.service.SupabaseUserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SupabaseUserFilter extends OncePerRequestFilter {
    private final SupabaseUserService supabaseUserService;

    public SupabaseUserFilter(SupabaseUserService supabaseUserService) {
        this.supabaseUserService = supabaseUserService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        var currentAuth = SecurityContextHolder.getContext().getAuthentication();

        if (currentAuth instanceof JwtAuthenticationToken jwtAuth && currentAuth.isAuthenticated()) {
            try {
                Jwt jwt = jwtAuth.getToken();
                User user = supabaseUserService.resolveOrCreateFromJwt(jwt);

                var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
                var appAuth = new UsernamePasswordAuthenticationToken(user, jwt.getTokenValue(), authorities);
                appAuth.setDetails(jwtAuth.getDetails());

                SecurityContextHolder.getContext().setAuthentication(appAuth);
            } catch (Exception ex) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
