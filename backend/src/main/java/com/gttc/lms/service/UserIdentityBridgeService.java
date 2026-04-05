package com.gttc.lms.service;

import com.gttc.lms.model.User;
import com.gttc.lms.model.UserProfileRecord;
import com.gttc.lms.model.enums.AuthProvider;
import com.gttc.lms.model.enums.Role;
import com.gttc.lms.model.enums.UserStatus;
import com.gttc.lms.repository.UserProfileRecordRepository;
import com.gttc.lms.repository.UserRepository;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserIdentityBridgeService {
    private final UserProfileRecordRepository userProfileRecordRepository;
    private final UserRepository userRepository;

    public UserIdentityBridgeService(
            UserProfileRecordRepository userProfileRecordRepository,
            UserRepository userRepository
    ) {
        this.userProfileRecordRepository = userProfileRecordRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public UUID resolveOperationalUserId(User appUser) {
        String registerNumber = trimToNull(appUser.getRegisterNumber());

        // Verified users should reuse the student-linked UUID already present in users.
        if (registerNumber != null) {
            Optional<UserProfileRecord> existingByRegister = findByRegisterNumber(registerNumber);
            if (existingByRegister.isPresent()) {
                UserProfileRecord profile = existingByRegister.get();
                syncFromAppUser(profile, appUser);
                userProfileRecordRepository.save(profile);
                return profile.getId();
            }
        }

        // Fallback to the auth UUID path and ensure that row exists for FK constraints.
        UUID operationalId = UserUuidResolver.resolve(appUser);
        UserProfileRecord profile = userProfileRecordRepository.findById(operationalId)
                .orElseGet(() -> {
                    UserProfileRecord created = new UserProfileRecord();
                    created.setId(operationalId);
                    return created;
                });

        syncFromAppUser(profile, appUser);

        if (trimToNull(profile.getRegisterNumber()) == null) {
            profile.setRegisterNumber(operationalId.toString());
        }

        try {
            return userProfileRecordRepository.save(profile).getId();
        } catch (DataIntegrityViolationException ex) {
            if (registerNumber != null) {
                return findByRegisterNumber(registerNumber)
                        .map(UserProfileRecord::getId)
                        .orElseThrow(() -> ex);
            }
            throw ex;
        }
    }

    @Transactional(readOnly = true)
    public String resolveDisplayName(UUID operationalUserId) {
        if (operationalUserId == null) {
            return null;
        }

        Optional<String> appUserName = userRepository
                .findByProviderAndProviderId(AuthProvider.SUPABASE, operationalUserId.toString())
                .map(User::getName)
                .map(this::trimToNull);
        if (appUserName.isPresent()) {
            return appUserName.get();
        }

        return userProfileRecordRepository.findById(operationalUserId)
                .map(UserProfileRecord::getName)
                .map(this::trimToNull)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public String resolveEmail(UUID operationalUserId) {
        if (operationalUserId == null) {
            return null;
        }

        Optional<String> appEmail = userRepository
                .findByProviderAndProviderId(AuthProvider.SUPABASE, operationalUserId.toString())
                .map(User::getEmail)
                .map(this::trimToNull);
        if (appEmail.isPresent()) {
            return appEmail.get();
        }

        Optional<UserProfileRecord> profileOpt = userProfileRecordRepository.findById(operationalUserId);
        if (profileOpt.isEmpty()) {
            return null;
        }

        UserProfileRecord profile = profileOpt.get();
        String profileEmail = trimToNull(profile.getEmail());
        if (profileEmail != null) {
            return profileEmail;
        }

        String registerNumber = trimToNull(profile.getRegisterNumber());
        if (registerNumber == null) {
            return null;
        }

        return userRepository.findByRegisterNumber(registerNumber)
                .map(User::getEmail)
                .map(this::trimToNull)
                .orElse(null);
    }

    private Optional<UserProfileRecord> findByRegisterNumber(String registerNumber) {
        String normalized = normalizeRegisterNumber(registerNumber);
        if (normalized == null) {
            return Optional.empty();
        }

        return userProfileRecordRepository.findByRegisterNumberNormalized(normalized)
                .or(() -> userProfileRecordRepository.findFirstByRegisterNumberIgnoreCase(registerNumber.trim()));
    }

    private void syncFromAppUser(UserProfileRecord profile, User appUser) {
        String name = trimToNull(appUser.getName());
        if (name != null) {
            profile.setName(name);
        } else if (trimToNull(profile.getName()) == null) {
            profile.setName("Library User");
        }

        String registerNumber = trimToNull(appUser.getRegisterNumber());
        if (registerNumber != null) {
            profile.setRegisterNumber(registerNumber);
        }

        String department = trimToNull(appUser.getDepartment());
        if (department != null) {
            profile.setDepartment(department);
        }

        String semester = trimToNull(appUser.getSemester());
        if (semester != null) {
            profile.setSemester(semester);
        }

        String academicYear = trimToNull(appUser.getYear());
        if (academicYear != null) {
            profile.setAcademicYear(academicYear);
            if (trimToNull(profile.getYear()) == null) {
                profile.setYear(academicYear);
            }
        }

        if (appUser.getRole() != null) {
            profile.setRole(appUser.getRole().name());
        } else if (trimToNull(profile.getRole()) == null) {
            profile.setRole(Role.USER.name());
        }

        profile.setBanned(appUser.getStatus() == UserStatus.BANNED);

        if (profile.getCreatedAt() == null) {
            profile.setCreatedAt(Instant.now());
        }
    }

    private String normalizeRegisterNumber(String registerNumber) {
        String value = trimToNull(registerNumber);
        if (value == null) {
            return null;
        }
        return value.replace(" ", "").replace("-", "").toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
