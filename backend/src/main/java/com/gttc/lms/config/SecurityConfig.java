package com.gttc.lms.config;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private final String frontendUrl;
    private final String frontendUrls;
    private final AppBearerTokenResolver appBearerTokenResolver;
    private final JwtAuthFilter jwtAuthFilter;
    private final SupabaseUserFilter supabaseUserFilter;
    private final SupabaseIssuerAuthenticationManagerResolver supabaseIssuerAuthenticationManagerResolver;
    private final AuthenticationEntryPoint authenticationEntryPoint;
    private final AccessDeniedHandler accessDeniedHandler;

    public SecurityConfig(
            @Value("${app.frontendUrl:}") String frontendUrl,
            @Value("${app.frontendUrls:}") String frontendUrls,
            AppBearerTokenResolver appBearerTokenResolver,
            JwtAuthFilter jwtAuthFilter,
            SupabaseUserFilter supabaseUserFilter,
                SupabaseIssuerAuthenticationManagerResolver supabaseIssuerAuthenticationManagerResolver,
            AuthenticationEntryPoint authenticationEntryPoint,
            AccessDeniedHandler accessDeniedHandler
    ) {
        this.frontendUrl = frontendUrl;
        this.frontendUrls = frontendUrls;
        this.appBearerTokenResolver = appBearerTokenResolver;
        this.jwtAuthFilter = jwtAuthFilter;
        this.supabaseUserFilter = supabaseUserFilter;
        this.supabaseIssuerAuthenticationManagerResolver = supabaseIssuerAuthenticationManagerResolver;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers(
                        "/",
                        "/health",
                        "/actuator/health",
                        "/api/auth/**",
                        "/api/admin/login",
                        "/api/student",
                        "/api/student/**",
                        "/api/students/**"
                    ).permitAll()
                    .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/books/**").permitAll()
                    .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/donations/**").permitAll()
                    .anyRequest().authenticated()
                )
                .oauth2ResourceServer(oauth2 -> oauth2
                    .bearerTokenResolver(appBearerTokenResolver)
                    .authenticationManagerResolver(supabaseIssuerAuthenticationManagerResolver)
                    .authenticationEntryPoint(authenticationEntryPoint)
                )
                .exceptionHandling(ex -> ex
                    .authenticationEntryPoint(authenticationEntryPoint)
                    .accessDeniedHandler(accessDeniedHandler)
                )
                .addFilterBefore(jwtAuthFilter, BearerTokenAuthenticationFilter.class)
                .addFilterAfter(supabaseUserFilter, BearerTokenAuthenticationFilter.class)
                .headers(headers -> headers.frameOptions(frame -> frame.disable()));
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(resolveAllowedOrigins());
        config.setAllowedMethods(List.of("*"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private List<String> resolveAllowedOrigins() {
        Set<String> origins = new LinkedHashSet<>();
        addOrigin(origins, frontendUrl);

        for (String origin : frontendUrls.split(",")) {
            addOrigin(origins, origin);
        }

        addOrigin(origins, "http://localhost:3000");
        addOrigin(origins, "https://gttclms.vercel.app");

        return new ArrayList<>(origins);
    }

    private void addOrigin(Set<String> origins, String origin) {
        if (origin == null) {
            return;
        }
        String trimmed = origin.trim();
        if (!trimmed.isEmpty()) {
            origins.add(trimmed);
        }
    }
}
