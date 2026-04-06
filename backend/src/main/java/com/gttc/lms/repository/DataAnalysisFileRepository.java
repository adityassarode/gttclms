package com.gttc.lms.repository;

import com.gttc.lms.model.DataAnalysisFile;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DataAnalysisFileRepository extends JpaRepository<DataAnalysisFile, UUID> {
    List<DataAnalysisFile> findByUserIdAndExpiresAtAfterOrderByCreatedAtDesc(UUID userId, Instant now);

    List<DataAnalysisFile> findByUserIdInAndExpiresAtAfterOrderByCreatedAtDesc(List<UUID> userIds, Instant now);

    Optional<DataAnalysisFile> findByIdAndUserId(UUID id, UUID userId);

    Optional<DataAnalysisFile> findByIdAndUserIdIn(UUID id, List<UUID> userIds);

    List<DataAnalysisFile> findByExpiresAtBefore(Instant now);
}
