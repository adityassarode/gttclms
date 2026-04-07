ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS face_verified BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE app_users
    ADD COLUMN IF NOT EXISTS face_verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS topic_videos (
    id UUID PRIMARY KEY,
    title TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    department TEXT NOT NULL,
    semester TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    video_url TEXT NOT NULL,
    uploaded_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topic_video_comments (
    id UUID PRIMARY KEY,
    video_id UUID NOT NULL,
    user_id UUID NOT NULL,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_topic_video_comments_video
        FOREIGN KEY (video_id) REFERENCES topic_videos (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_face_verifications (
    id UUID PRIMARY KEY,
    app_user_id BIGINT NOT NULL UNIQUE,
    image_data BYTEA NOT NULL,
    image_mime_type TEXT NOT NULL,
    image_size_bytes INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user_face_verifications_user
        FOREIGN KEY (app_user_id) REFERENCES app_users (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS face_verification_sessions (
    id UUID PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    app_user_id BIGINT NOT NULL,
    redirect_path TEXT NOT NULL,
    status TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_face_verification_sessions_user
        FOREIGN KEY (app_user_id) REFERENCES app_users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_topic_videos_created_at
    ON topic_videos (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_topic_videos_subject_department
    ON topic_videos (subject_name, department, semester, academic_year);

CREATE INDEX IF NOT EXISTS idx_topic_video_comments_video_created_at
    ON topic_video_comments (video_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_user_face_verifications_app_user
    ON user_face_verifications (app_user_id);

CREATE INDEX IF NOT EXISTS idx_face_verification_sessions_user_status
    ON face_verification_sessions (app_user_id, status);

CREATE INDEX IF NOT EXISTS idx_face_verification_sessions_expires_at
    ON face_verification_sessions (expires_at);
