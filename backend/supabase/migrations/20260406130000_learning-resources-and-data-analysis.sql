CREATE TABLE IF NOT EXISTS question_papers (
    id UUID PRIMARY KEY,
    subject_name TEXT NOT NULL,
    department TEXT NOT NULL,
    semester TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    question_paper_year TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    uploaded_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_notes (
    id UUID PRIMARY KEY,
    subject_name TEXT NOT NULL,
    department TEXT NOT NULL,
    semester TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    unit_numbers TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    uploaded_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_analysis_files (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    original_file_name TEXT NOT NULL,
    cleaned_file_name TEXT NOT NULL,
    stored_file_path TEXT NOT NULL,
    file_format TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_question_papers_created_at
    ON question_papers (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_notes_created_at
    ON study_notes (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_analysis_files_user_id_expires_at
    ON data_analysis_files (user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_analysis_files_expires_at
    ON data_analysis_files (expires_at);
