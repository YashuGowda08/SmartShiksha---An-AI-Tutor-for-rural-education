"""Subjects, Chapters, Topics CRUD router (MongoDB)."""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from bson import ObjectId
from datetime import datetime

from app.database import (
    subjects_collection, chapters_collection,
    topics_collection, questions_collection,
    textbooks_collection
)
from app.services.ai_service import generate_topic_content

router = APIRouter(prefix="/content", tags=["Content"])


def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB doc to JSON-safe dict."""
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    for key, val in doc.items():
        if isinstance(val, datetime):
            doc[key] = val.isoformat()
        if isinstance(val, ObjectId):
            doc[key] = str(val)
    return doc


# ── Subjects ───────────────────────────────────────────────────────────

@router.get("/subjects")
async def get_subjects(student_class: Optional[str] = Query(None), board: Optional[str] = Query(None)):
    """Get all subjects, optionally filtered by class and board."""
    query = {}
    if student_class:
        query["classes"] = student_class
    if board:
        query["board"] = board
    cursor = subjects_collection.find(query)
    subjects = await cursor.to_list(length=100)
    return [serialize_doc(s) for s in subjects]


@router.get("/subjects/{subject_id}")
async def get_subject(subject_id: str):
    """Get a single subject by ID."""
    subject = await subjects_collection.find_one({"_id": ObjectId(subject_id)})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return serialize_doc(subject)


@router.post("/subjects")
async def create_subject(data: dict):
    """Create a new subject (admin only)."""
    data["created_at"] = datetime.utcnow()
    result = await subjects_collection.insert_one(data)
    data["_id"] = result.inserted_id
    return serialize_doc(data)


# ── Chapters ───────────────────────────────────────────────────────────

@router.get("/subjects/{subject_id}/chapters")
async def get_chapters(subject_id: str, student_class: Optional[str] = Query(None), board: Optional[str] = Query(None)):
    """Get all chapters for a subject."""
    query = {"subject_id": subject_id}
    if student_class:
        query["student_class"] = student_class
    if board:
        query["board"] = board
    cursor = chapters_collection.find(query).sort("order_index", 1)
    chapters = await cursor.to_list(length=100)
    return [serialize_doc(c) for c in chapters]


@router.get("/chapters/{chapter_id}")
async def get_chapter(chapter_id: str):
    """Get a single chapter."""
    chapter = await chapters_collection.find_one({"_id": ObjectId(chapter_id)})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return serialize_doc(chapter)


@router.post("/chapters")
async def create_chapter(data: dict):
    """Create a new chapter (admin only)."""
    data["created_at"] = datetime.utcnow()
    result = await chapters_collection.insert_one(data)
    data["_id"] = result.inserted_id
    return serialize_doc(data)


# ── Topics ─────────────────────────────────────────────────────────────

@router.get("/chapters/{chapter_id}/topics")
async def get_topics(chapter_id: str):
    """Get all topics for a chapter with auto-discovery."""
    cursor = topics_collection.find({"chapter_id": chapter_id}).sort("order_index", 1)
    topics = await cursor.to_list(length=100)
    
    if not topics:
        # Auto-discover topics if none exist
        chapter = await chapters_collection.find_one({"_id": ObjectId(chapter_id)})
        if chapter:
            # For now, create 3 placeholder topics based on chapter name
            # In a real app, use AI to generate topic names
            default_topics = [
                {"name": f"Introduction to {chapter['name']}", "order_index": 0},
                {"name": f"Core Concepts of {chapter['name']}", "order_index": 1},
                {"name": f"Practice & Applications: {chapter['name']}", "order_index": 2},
            ]
            
            new_topics = []
            for i, dt in enumerate(default_topics):
                doc = {
                    "chapter_id": chapter_id,
                    "name": dt["name"],
                    "explanation": "Detailed content coming soon...",
                    "examples": "Example problems coming soon...",
                    "order_index": i,
                    "created_at": datetime.utcnow()
                }
                new_topics.append(doc)
            
            result = await topics_collection.insert_many(new_topics)
            # Retrieve again to get IDs
            cursor = topics_collection.find({"chapter_id": chapter_id}).sort("order_index", 1)
            topics = await cursor.to_list(length=100)

    return [serialize_doc(t) for t in topics]


@router.get("/topics/{topic_id}")
async def get_topic(topic_id: str, language: str = "English"):
    """Get a single topic with dynamic generation if needed."""
    topic = await topics_collection.find_one({"_id": ObjectId(topic_id)})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # If explanation is missing, generate it dynamically
    if not topic.get("explanation") or topic.get("explanation") == "Detailed content coming soon...":
        content = await generate_topic_content(
            student_class=chapter.get("student_class", "10"),
            subject=subject.get("name", "General"),
            chapter=chapter.get("name", "General"),
            topic=topic.get("name", "General"),
            language=language
        )
        # Update DB
        await topics_collection.update_one(
            {"_id": ObjectId(topic_id)},
            {"$set": {
                "explanation": content.get("explanation", ""),
                "examples": content.get("examples", ""),
                "updated_at": datetime.utcnow()
            }}
        )
        topic.update(content)

    response_data = serialize_doc(topic)
    response_data["student_class"] = chapter.get("student_class", "Unknown")
    response_data["subject_name"] = subject.get("name", "Unknown")
    response_data["chapter_name"] = chapter.get("name", "Unknown")
    
    return response_data


@router.post("/topics")
async def create_topic(data: dict):
    """Create a new topic (admin only)."""
    data["created_at"] = datetime.utcnow()
    result = await topics_collection.insert_one(data)
    data["_id"] = result.inserted_id
    return serialize_doc(data)


# ── Questions ──────────────────────────────────────────────────────────

@router.get("/topics/{topic_id}/questions")
async def get_questions(
    topic_id: str,
    question_type: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
):
    """Get questions for a topic."""
    query = {"topic_id": topic_id}
    if question_type:
        query["question_type"] = question_type
    if difficulty:
        query["difficulty"] = difficulty
    cursor = questions_collection.find(query)
    questions = await cursor.to_list(length=200)
    return [serialize_doc(q) for q in questions]


@router.post("/questions")
async def create_question(data: dict):
    """Create a new question (admin only)."""
    data["created_at"] = datetime.utcnow()
    result = await questions_collection.insert_one(data)
    data["_id"] = result.inserted_id
    return serialize_doc(data)


@router.post("/questions/bulk")
async def create_questions_bulk(questions: List[dict]):
    """Bulk create questions (admin only)."""
    for q in questions:
        q["created_at"] = datetime.utcnow()
    result = await questions_collection.insert_many(questions)
    return {"message": f"Created {len(result.inserted_ids)} questions"}
