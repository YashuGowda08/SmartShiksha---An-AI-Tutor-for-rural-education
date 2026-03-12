"""Mock test CRUD and evaluation router (MongoDB)."""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
import random
import json
import asyncio

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
    # Make it idempotent
    if "_id" in doc:
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
async def get_test(test_id: str, background_tasks: BackgroundTasks):
    """Get a specific test with its questions. Shuffles content for JEE/NEET only."""
    if not ObjectId.is_valid(test_id):
        raise HTTPException(status_code=400, detail="Invalid test ID format")
        
    test = await mock_tests_collection.find_one({"_id": ObjectId(test_id)})
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Get associated questions
    cursor = test_questions_collection.find({"test_id": test_id}).sort("order_index", 1)
    questions = await cursor.to_list(length=1000)
    
    # If no questions found with string ID, try ObjectId
    if not questions:
        cursor = test_questions_collection.find({"test_id": ObjectId(test_id)}).sort("order_index", 1)
        questions = await cursor.to_list(length=1000)

    test_data = serialize_doc(test)
    test_data["is_generating"] = False

    is_full_exam = test_data.get("test_type") in ["JEE", "NEET"]
    
    # ── Lazy AI Generation Trigger (Full Exams Only) ──
    if is_full_exam:
        # Check if any questions look like placeholders (not just the first one due to shuffling)
        def is_placeholder(q_text):
            low = q_text.lower()
            return "placeholder" in low or ("question" in low and ("jee" in low or "neet" in low))

        needs_ai = len(questions) == 0 or any(is_placeholder(q.get("question_text", "")) for q in questions[:5])
        
        if needs_ai:
            print(f"[SHUFFLE] AI content needed for Full Exam {test_id}. Triggering background sync...")
            background_tasks.add_task(rebuild_test_with_ai, test_id, test)
            test_data["is_generating"] = True

        # Shuffling for Full Exams
        random.shuffle(questions)
        
        # Take a subset if the pool is large
        limit = 200 if test.get("test_type") == "NEET" else 90
        display_questions = questions[:limit]
        
        # Shuffle options for MCQs
        for q in display_questions:
            if q.get("question_type") == "MCQ" and q.get("options"):
                opts = q["options"][:]
                random.shuffle(opts)
                q["options"] = opts
        test_data["questions"] = [serialize_doc(q) for q in display_questions]
    else:
        # Standard test: preserve order and no generation
        test_data["is_generating"] = False
        test_data["questions"] = [serialize_doc(q) for q in questions]

    return test_data


async def rebuild_test_with_ai(test_id: str, test_doc: dict):
    """Background task to build a large pool of real AI questions in batches."""
    from app.services.ai_service import generate_exam_questions
    import json
    import asyncio
    
    try:
        print(f"[AI-SYNC] Starting Batch Generation for {test_id}...")
        
        # We'll do 3-5 batches of questions to create a "Question Bank" for this test
        # Each batch is roughly 20-30 questions to avoid token limits
        # Scale batches based on target question count
        target_count = 200 if test_doc.get("test_type") == "NEET" else (90 if test_doc.get("test_type") == "JEE" else 50)
        batch_size = 20
        num_batches = (target_count // batch_size) + 1
        
        all_new_questions = []
        
        for b in range(num_batches):
            print(f"[AI-SYNC] Generating batch {b+1}/{num_batches} for {test_doc.get('title')}...")
            
            # Simple retry logic with backoff
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    # Select a random chapter/topic from the test context if available to keep it focused but diverse
                    topic_focus = test_doc.get("subject_name", "General")
                    
                    raw_json = await generate_exam_questions(
                        student_class=test_doc.get("student_class", "12"),
                        subject=topic_focus,
                        num_questions=batch_size,
                        test_type=test_doc.get("test_type", "Mock Test"),
                        difficulty=random.choice(["Medium", "Hard"])
                    )
                    
                    batch_questions = json.loads(raw_json)
                    if isinstance(batch_questions, list):
                        all_new_questions.extend(batch_questions)
                    break # Success!
                except Exception as batch_err:
                    if "429" in str(batch_err) and attempt < max_retries - 1:
                        wait_time = (attempt + 1) * 10
                        print(f"[AI-SYNC] Rate limit hit. Waiting {wait_time}s before retry {attempt+2}...")
                        await asyncio.sleep(wait_time)
                    else:
                        print(f"[AI-SYNC] Batch {b+1} failed after {attempt+1} attempts: {batch_err}")
                        break
                
            # Small delay between batches to respect rate limits
            await asyncio.sleep(5)

        if len(all_new_questions) > 0:
            # Delete old placeholders
            await test_questions_collection.delete_many({"test_id": test_id})
            
            # Insert the new question pool
            for i, q in enumerate(all_new_questions):
                q["test_id"] = test_id
                q["order_index"] = i
                q["created_at"] = datetime.utcnow()
            
            await test_questions_collection.insert_many(all_new_questions)
            print(f"[AI-SYNC] Successfully populated Question Bank with {len(all_new_questions)} questions for {test_id}")
    except Exception as e:
        print(f"[AI-SYNC] Critical error in rebuild_test: {e}")


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
        
        # Negative markings for JEE/NEET
        if not is_correct and question.get("negative_marking") and student_ans.strip():
            marks_obtained = -1 # Standard -1 for JEE/NEET
            
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
