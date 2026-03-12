-- Smart Shiksha Database Schema
-- PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    student_class VARCHAR(5),
    board VARCHAR(20),
    language VARCHAR(20) DEFAULT 'English',
    role VARCHAR(20) DEFAULT 'student',
    onboarding_complete BOOLEAN DEFAULT false,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    classes JSONB NOT NULL,
    board VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chapters
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    student_class VARCHAR(5) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Topics
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    explanation TEXT,
    examples TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Questions
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL,
    difficulty VARCHAR(10) DEFAULT 'Medium',
    options JSONB,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    marks INTEGER DEFAULT 1,
    student_class VARCHAR(5),
    subject_name VARCHAR(255),
    chapter_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mock Tests
CREATE TABLE mock_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    test_type VARCHAR(20) DEFAULT 'Mock Test',
    student_class VARCHAR(5) NOT NULL,
    subject_name VARCHAR(255),
    chapter_id UUID REFERENCES chapters(id),
    duration_minutes INTEGER DEFAULT 60,
    total_marks INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test Questions (M2M)
CREATE TABLE test_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES mock_tests(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    order_index INTEGER DEFAULT 0
);

-- Student Attempts
CREATE TABLE student_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    test_id UUID REFERENCES mock_tests(id),
    score FLOAT,
    total_marks INTEGER,
    percentage FLOAT,
    time_taken_seconds INTEGER,
    proctoring_warnings INTEGER DEFAULT 0,
    auto_submitted BOOLEAN DEFAULT false,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Student Answers
CREATE TABLE student_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID REFERENCES student_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id),
    student_answer TEXT,
    is_correct BOOLEAN,
    marks_obtained FLOAT DEFAULT 0
);

-- Progress
CREATE TABLE progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    topic_id UUID REFERENCES topics(id),
    completed BOOLEAN DEFAULT false,
    score FLOAT,
    time_spent_seconds INTEGER DEFAULT 0,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Sessions
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    topic_id UUID REFERENCES topics(id),
    language VARCHAR(20) DEFAULT 'English',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Textbooks
CREATE TABLE textbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subject_id UUID REFERENCES subjects(id),
    student_class VARCHAR(5) NOT NULL,
    board VARCHAR(20),
    file_url TEXT NOT NULL,
    file_size_mb FLOAT,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exam Papers
CREATE TABLE exam_papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    student_class VARCHAR(5) NOT NULL,
    subject_name VARCHAR(255),
    chapter_name VARCHAR(255),
    difficulty VARCHAR(10),
    question_types JSONB,
    num_questions INTEGER DEFAULT 20,
    pdf_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_class ON users(student_class);
CREATE INDEX idx_chapters_subject ON chapters(subject_id);
CREATE INDEX idx_topics_chapter ON topics(chapter_id);
CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_progress_user ON progress(user_id);
CREATE INDEX idx_attempts_user ON student_attempts(user_id);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
