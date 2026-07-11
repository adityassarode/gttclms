-- Create departments and related tables
CREATE TABLE IF NOT EXISTS departments (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS department_resources (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    department_id BIGINT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT,
    file_type TEXT,
    folder TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_department_resources_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS department_admin_assignments (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    app_user_id BIGINT NOT NULL,
    department_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_dept_admins_user FOREIGN KEY (app_user_id) REFERENCES app_users (id) ON DELETE CASCADE,
    CONSTRAINT fk_dept_admins_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE,
    UNIQUE (app_user_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_departments_slug ON departments (slug);
CREATE INDEX IF NOT EXISTS idx_department_resources_department_created_at ON department_resources (department_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_department_resources_fulltext ON department_resources USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));
