"""
Pydantic schemas for request/response validation.
Note: With MongoDB, many endpoints use dict directly for flexibility.
These schemas can be used for stricter validation when needed.
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ── Enums ──────────────────────────────────────────────────────────────

class StudentClass(str, Enum):
    CLASS_8 = "8"
    CLASS_9 = "9"
    CLASS_10 = "10"
    CLASS_11 = "11"
    CLASS_12 = "12"


class Board(str, Enum):
    CBSE = "CBSE"
    STATE_BOARD = "State Board"


class Language(str, Enum):
    ENGLISH = "English"
    HINDI = "Hindi"
    KANNADA = "Kannada"
    TELUGU = "Telugu"
    TAMIL = "Tamil"


class QuestionType(str, Enum):
    MCQ = "MCQ"
    SHORT_ANSWER = "Short Answer"
    NUMERICAL = "Numerical"


class Difficulty(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"


# ── Auth ───────────────────────────────────────────────────────────────

class OnboardingRequest(BaseModel):
    student_class: str
    board: str
    language: str = "English"


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    language: Optional[str] = None
    avatar_url: Optional[str] = None


# ── Content ────────────────────────────────────────────────────────────

class SubjectCreate(BaseModel):
    name: str
    description: str
    icon: str = "📚"
    color: str = "#6366f1"
    classes: List[str] = []


class ChapterCreate(BaseModel):
    subject_id: str
    student_class: str
    name: str
    description: str = ""
    order_index: int = 0


class TopicCreate(BaseModel):
    chapter_id: str
    name: str
    explanation: str = ""
    examples: str = ""
    order_index: int = 0


class QuestionCreate(BaseModel):
    topic_id: str
    question_text: str
    question_type: str = "MCQ"
    options: List[str] = []
    correct_answer: str = ""
    difficulty: str = "Medium"
    marks: int = 1


# ── AI Tutor ───────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    topic_id: Optional[str] = None
    language: str = "English"
    student_class: Optional[str] = None
    subject: str = "General"
    topic_name: str = "General"


# ── Exams ──────────────────────────────────────────────────────────────

class ExamGenerateRequest(BaseModel):
    student_class: str = "10"
    subject_name: str = "Mathematics"
    chapter_name: str = ""
    topic_name: str = ""
    difficulty: str = "Medium"
    question_types: List[str] = ["MCQ", "Short Answer"]
    num_questions: int = 20
    language: str = "English"


# ── Mock Tests ─────────────────────────────────────────────────────────

class TestSubmission(BaseModel):
    test_id: str
    answers: List[dict]
    time_taken_seconds: int = 0
    proctoring_warnings: int = 0
    auto_submitted: bool = False


# ── Progress ───────────────────────────────────────────────────────────

class ProgressUpdate(BaseModel):
    topic_id: str
    completed: bool = False
    time_spent_seconds: int = 0


# ── Community ─────────────────────────────────────────────────────────

class ReplyCreate(BaseModel):
    content: str
    image_url: Optional[str] = None


class PostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None
    subject: Optional[str] = "General"
    topic: Optional[str] = "General"
