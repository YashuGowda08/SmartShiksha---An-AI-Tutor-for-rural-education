"""
Models module — MongoDB version.
With MongoDB, we don't use SQLAlchemy ORM models.
Documents are stored directly as dictionaries.
This file documents the expected document schemas for reference.

Collections and their document schemas:

users:
    clerk_id: str (unique)
    name: str
    email: str (unique)
    student_class: str | None (8-12)
    board: str | None (CBSE / State Board)
    language: str (English, Hindi, Kannada, Telugu, Tamil)
    role: str (student / admin)
    onboarding_complete: bool
    avatar_url: str | None
    created_at: datetime
    updated_at: datetime

subjects:
    name: str
    description: str
    icon: str
    color: str
    classes: list[str]
    board: str
    created_at: datetime

chapters:
    subject_id: str
    student_class: str
    board: str
    name: str
    description: str
    order_index: int
    created_at: datetime

topics:
    chapter_id: str
    name: str
    explanation: str
    examples: str
    order_index: int
    created_at: datetime

questions:
    topic_id: str
    question_text: str
    question_type: str (MCQ / Short Answer / Numerical)
    options: list[str]
    correct_answer: str
    difficulty: str (Easy / Medium / Hard)
    marks: int
    created_at: datetime

mock_tests:
    title: str
    description: str
    test_type: str (Mock Test / Chapter Test / JEE / NEET)
    student_class: str
    subject_name: str
    duration_minutes: int
    total_marks: int
    is_active: bool
    created_at: datetime

test_questions:
    test_id: str
    question_text: str
    question_type: str
    options: list[str]
    correct_answer: str
    marks: int
    order_index: int
    created_at: datetime

student_attempts:
    user_id: str
    test_id: str
    score: float
    total_marks: float
    percentage: float
    time_taken_seconds: int
    proctoring_warnings: int
    auto_submitted: bool
    answers: list[dict]
    completed_at: datetime
    created_at: datetime

progress:
    user_id: str
    topic_id: str
    completed: bool
    time_spent_seconds: int
    created_at: datetime
    updated_at: datetime

chat_sessions:
    user_id: str
    topic_id: str | None
    language: str
    created_at: datetime

chat_messages:
    session_id: str
    role: str (user / assistant)
    content: str
    created_at: datetime

textbooks:
    title: str
    class: str
    board: str
    subject: str
    file_url: str
    file_size_mb: float
    uploaded_by: str
    created_at: datetime

exam_papers:
    user_id: str
    student_class: str
    subject: str
    chapter: str
    topic: str
    difficulty: str
    num_questions: int
    questions: list[dict]
    created_at: datetime
"""
