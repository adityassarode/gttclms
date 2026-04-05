package com.gttc.lms.repository;

import com.gttc.lms.model.User;
import com.gttc.lms.model.enums.AuthProvider;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByRegisterNumber(String registerNumber);

    Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId);

        @Query(value = """
                        SELECT COALESCE(
                            au.avatar_url,
                            u.raw_user_meta_data ->> 'avatar_url',
                            u.raw_user_meta_data ->> 'picture'
                        )
                        FROM app_users au
                        LEFT JOIN auth.users u
                            ON au.provider_id = u.id::text
                        WHERE au.id = :userId
                        """, nativeQuery = true)
        Optional<String> findResolvedAvatarUrlByUserId(@Param("userId") Long userId);

        @Query(value = """
                        SELECT
                            au.id AS userId,
                            COALESCE(
                                au.avatar_url,
                                u.raw_user_meta_data ->> 'avatar_url',
                                u.raw_user_meta_data ->> 'picture'
                            ) AS avatarUrl
                        FROM app_users au
                        LEFT JOIN auth.users u
                            ON au.provider_id = u.id::text
                        WHERE au.id IN (:userIds)
                        """, nativeQuery = true)
        List<ResolvedAvatarRow> findResolvedAvatarUrlsByUserIds(@Param("userIds") List<Long> userIds);

        interface ResolvedAvatarRow {
                Long getUserId();

                String getAvatarUrl();
        }
}
