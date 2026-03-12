"""Mock test CRUD and evaluation router (MongoDB)."""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from bson import ObjectId
from datetime import datetime

from app.database import (
    mock_tests_collection, test_questions_collection,
    student_attempts_collection, student_answers_collection,
    questions_collection
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/mock-tests", tags=["Mock Tests"])


def serialize_doc(doc: dict) -> dict:
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


@router.get("/")
async def list_tests(
    test_type: Optional[str] = None,
    student_class: Optional[str] = None,
    subject_name: Optional[str] = None,
):
    """List available mock tests."""
    query = {"is_active": True}
    if test_type:
        query["test_type"] = test_type
    if student_class:
        query["student_class"] = student_class
    if subject_name:
        query["subject_name"] = subject_name

    cursor = mock_tests_collection.find(query).sort("created_at", -1)
    tests = await cursor.to_list(length=50)
    return [serialize_doc(t) for t in tests]


@router.get("/{test_id}")
async def get_test(test_id: str):
    """Get a specific test with its questions."""
    test = await mock_tests_collection.find_one({"_id": ObjectId(test_id)})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Get associated questions (handle both string and ObjectId test_ids)
    cursor = test_questions_collection.find({
        "$or": [
            {"test_id": test_id},
            {"test_id": ObjectId(test_id)}
        ]
    }).sort("order_index", 1)
    questions = await cursor.to_list(length=200)

    test_data = serialize_doc(test)
    test_data["questions"] = [serialize_doc(q) for q in questions]
    return test_data


@router.post("/")
async def create_test(data: dict):
    """Create a new mock test (admin only)."""
    data["is_active"] = True
    data["created_at"] = datetime.utcnow()
    result = await mock_tests_collection.insert_one(data)

    # If questions are provided inline, add them
    if "questions" in data:
        for i, q in enumerate(data["questions"]):
            q["test_id"] = str(result.inserted_id)
            q["order_index"] = i
            q["created_at"] = datetime.utcnow()
        await test_questions_collection.insert_many(data["questions"])

    data["_id"] = result.inserted_id
    return serialize_doc(data)


@router.post("/{test_id}/submit")
async def submit_test(test_id: str, req: dict, user: dict = Depends(get_current_user)):
    """Submit a test attempt and auto-evaluate."""
    test = await mock_tests_collection.find_one({"_id": ObjectId(test_id)})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    answers = req.get("answers", [])
    time_taken = req.get("time_taken_seconds", 0)
    proctoring_warnings = req.get("proctoring_warnings", 0)
    auto_submitted = req.get("auto_submitted", False)

    # Auto-evaluate MCQs
    total_score = 0
    total_marks = 0
    evaluated_answers = []

    for answer in answers:
        q_id = answer.get("question_id")
        student_ans = answer.get("student_answer", "")

        question = await test_questions_collection.find_one({"_id": ObjectId(q_id)}) if q_id and len(q_id) == 24 else None
        if not question:
            # Try to find by other means or use a generic score
            evaluated_answers.append({
                "question_id": q_id,
                "student_answer": student_ans,
                "is_correct": False,
                "marks_obtained": 0,
            })
            total_marks += 1
            continue

        marks = question.get("marks", 1)
        total_marks += marks
        correct_answer = question.get("correct_answer", "")
        is_correct = student_ans.strip().lower() == correct_answer.strip().lower() if correct_answer else False

        marks_obtained = marks if is_correct else 0
        total_score += marks_obtained

        evaluated_answers.append({
            "question_id": q_id,
            "student_answer": student_ans,
            "correct_answer": correct_answer,
            "is_correct": is_correct,
            "marks_obtained": marks_obtained,
        })

    # Calculate percentage
    percentage = (total_score / total_marks * 100) if total_marks > 0 else 0

    # Save attempt
    attempt_doc = {
        "user_id": user["id"],
        "test_id": test_id,
        "score": total_score,
        "total_marks": total_marks,
        "percentage": round(percentage, 1),
        "time_taken_seconds": time_taken,
        "proctoring_warnings": proctoring_warnings,
        "auto_submitted": auto_submitted,
        "answers": evaluated_answers,
        "completed_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    }
    result = await student_attempts_collection.insert_one(attempt_doc)

    return {
        "attempt_id": str(result.inserted_id),
        "score": total_score,
        "total_marks": total_marks,
        "percentage": round(percentage, 1),
        "time_taken_seconds": time_taken,
        "proctoring_warnings": proctoring_warnings,
        "auto_submitted": auto_submitted,
    }


@router.get("/{test_id}/attempts")
async def get_test_attempts(test_id: str, user: dict = Depends(get_current_user)):
    """Get all attempts for a test by the current user."""
    cursor = student_attempts_collection.find({
        "user_id": user["id"],
        "test_id": test_id,
    }).sort("created_at", -1)
    attempts = await cursor.to_list(length=20)
    return [serialize_doc(a) for a in attempts]


@router.get("/my/attempts")
async def get_my_attempts(user: dict = Depends(get_current_user)):
    """Get all test attempts for the current user."""
    cursor = student_attempts_collection.find(
        {"user_id": user["id"]}
    ).sort("created_at", -1).limit(30)
    attempts = await cursor.to_list(length=30)
    return [serialize_doc(a) for a in attempts]
