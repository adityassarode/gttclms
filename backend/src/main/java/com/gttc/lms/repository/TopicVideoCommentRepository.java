package com.gttc.lms.repository;

import com.gttc.lms.model.TopicVideoComment;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TopicVideoCommentRepository extends JpaRepository<TopicVideoComment, UUID> {
    List<TopicVideoComment> findByVideoIdOrderByCreatedAtAsc(UUID videoId);

    void deleteByVideoId(UUID videoId);
}
