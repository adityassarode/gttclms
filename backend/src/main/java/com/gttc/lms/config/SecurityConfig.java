package com.gttc.lms.config;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
    private final SupabaseUserFilter supabaseUserFilter;
    private final AppBearerTokenResolver appBearerTokenResolver;
    private final String frontendUrl;
    private final String frontendUrls;

    public SecurityConfig(
            SupabaseUserFilter supabaseUserFilter,
            AppBearerTokenResolver appBearerTokenResolver,
            @Value("${app.frontendUrl:}") String frontendUrl,
            @Value("${app.frontendUrls:}") String frontendUrls
    ) {
        this.supabaseUserFilter = supabaseUserFilter;
        this.appBearerTokenResolver = appBearerTokenResolver;
        this.frontendUrl = frontendUrl;
        this.frontendUrls = frontendUrls;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .oauth2ResourceServer(oauth2 -> oauth2
                    .bearerTokenResolver(appBearerTokenResolver)
                    .jwt(Customizer.withDefaults())
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/auth/**", "/api/admin/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/books/**").permitAll()
                    .requestMatchers("/api/students/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers("/h2-console/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .headers(headers -> headers.frameOptions(frame -> frame.disable()))
                .addFilterAfter(supabaseUserFilter, BearerTokenAuthenticationFilter.class);
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
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
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

        addOrigin(origins, "https://gttclms.netlify.app");

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
