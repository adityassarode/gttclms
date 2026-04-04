package com.gttc.lms.service;

import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.AuthProvider;
import com.gttc.lms.model.enums.Role;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserResolver {
    private static final String GUEST_EMAIL = "guest@gttc.local";
    private static final String GUEST_NAME = "Guest User";

    private final SupabaseUserService supabaseUserService;
    private final UserRepository userRepository;

    public CurrentUserResolver(SupabaseUserService supabaseUserService, UserRepository userRepository) {
        this.supabaseUserService = supabaseUserService;
        this.userRepository = userRepository;
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

        User guest = resolveGuestUser();
        ensureActive(guest);
        return guest;
    }

    private void ensureActive(User user) {
        if (user.getStatus() == UserStatus.BANNED) {
            user.setStatus(UserStatus.ACTIVE);
            userRepository.save(user);
        }
    }

    private User resolveGuestUser() {
        User guest = userRepository.findByEmail(GUEST_EMAIL).orElseGet(this::createGuestUser);
        boolean changed = false;

        if (!GUEST_NAME.equals(guest.getName())) {
            guest.setName(GUEST_NAME);
            changed = true;
        }

        if (guest.getRole() != Role.USER) {
            guest.setRole(Role.USER);
            changed = true;
        }

        if (guest.getStatus() != UserStatus.ACTIVE) {
            guest.setStatus(UserStatus.ACTIVE);
            changed = true;
        }

        if (guest.getProvider() != AuthProvider.LOCAL) {
            guest.setProvider(AuthProvider.LOCAL);
            changed = true;
        }

        if (!guest.isVerified()) {
            guest.setVerified(true);
            changed = true;
        }

        return changed ? userRepository.save(guest) : guest;
    }

    private User createGuestUser() {
        User guest = new User();
        guest.setEmail(GUEST_EMAIL);
        guest.setName(GUEST_NAME);
        guest.setRole(Role.USER);
        guest.setStatus(UserStatus.ACTIVE);
        guest.setProvider(AuthProvider.LOCAL);
        guest.setVerified(true);
        return userRepository.save(guest);
    }
}