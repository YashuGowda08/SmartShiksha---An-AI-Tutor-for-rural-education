"""Exam paper generation router (MongoDB)."""
import json
import io
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from bson import ObjectId
from datetime import datetime

from app.database import exam_papers_collection
from app.routers.auth import get_current_user, verify_clerk_token
from app.services.ai_service import generate_exam_questions
from app.services.pdf_service import create_exam_pdf

router = APIRouter(prefix="/exams", tags=["Exam Papers"])


async def get_optional_user(authorization: str = Header(None)) -> dict:
    """Get user if authenticated, otherwise return a guest dict."""
    try:
        if authorization and authorization.startswith("Bearer "):
            clerk_data = await verify_clerk_token(authorization)
            from app.database import users_collection
            user = await users_collection.find_one({"clerk_id": clerk_data["clerk_id"]})
            if user:
                user["id"] = str(user["_id"])
                del user["_id"]
                return user
        # Fallback guest user
        return {"id": "guest", "student_class": "10", "role": "student"}
    except Exception:
        return {"id": "guest", "student_class": "10", "role": "student"}


@router.post("/generate")
async def generate_paper(req: dict, user: dict = Depends(get_optional_user)):
    """Generate an AI-powered exam paper and return as PDF."""
    student_class = req.get("student_class", user.get("student_class", "10"))
    subject_name = req.get("subject_name", "Mathematics")
    chapter_name = req.get("chapter_name", "")
    topic_name = req.get("topic_name", "")
    difficulty = req.get("difficulty", "Medium")
    question_types = req.get("question_types", ["MCQ", "Short Answer"])
    # Convert list to string if needed (frontend sends array)
    if isinstance(question_types, list):
        question_types = ", ".join(question_types)
    num_questions = min(req.get("num_questions", 20), 50)
    language = req.get("language", "English")
    test_type = req.get("test_type", "Chapter Test")

    print(f"[EXAM] Generating: class={student_class}, subject={subject_name}, chapter={chapter_name}, "
          f"topic={topic_name}, diff={difficulty}, types={question_types}, n={num_questions}, pattern={test_type}")

    try:
        # Generate questions via AI
        questions_text = await generate_exam_questions(
            student_class=str(student_class),
            subject=subject_name,
            chapter=chapter_name,
            topic=topic_name,
            difficulty=difficulty,
            question_types=question_types,
            num_questions=num_questions,
            language=language,
            test_type=test_type,
        )

        print(f"[EXAM] AI returned {len(questions_text)} chars of text")

        # Parse JSON questions
        try:
            if isinstance(questions_text, str):
                questions = json.loads(questions_text)
            else:
                questions = questions_text
                
            if isinstance(questions, dict) and "questions" in questions:
                questions = questions["questions"]
            elif isinstance(questions, dict) and any(isinstance(v, list) for v in questions.values()):
                for v in questions.values():
                    if isinstance(v, list):
                        questions = v
                        break
            
            print(f"[EXAM] Parsed {len(questions)} questions successfully")
        except Exception as parse_err:
            print(f"[EXAM] JSON parse error: {parse_err}")
            # Real fallback
            questions = [{
                "question_text": f"Explain the key concepts of {topic_name or chapter_name or subject_name}.",
                "question_type": "Short Answer",
                "correct_answer": "Multiple points relating to the topic.",
                "explanation": "This is a comprehensive overview question.",
                "marks": 5
            }]
            
        # Ensure questions is always a list of dicts
        if not isinstance(questions, list):
            questions = [questions] if isinstance(questions, dict) else []
            
        if not questions:
             questions = [{
                "question_text": "Please provide more details for generation.",
                "question_type": "Short Answer",
                "correct_answer": "N/A",
                "explanation": "No content generated.",
                "marks": 0
            }]

    except Exception as e:
        print(f"[EXAM] AI generation error: {e}")
        import traceback
        traceback.print_exc()
        # Fallback instead of 500
        questions = [{
            "question_text": "The AI is currently busy. Please try again in 1 minute.",
            "question_type": "Short Answer",
            "correct_answer": "N/A",
            "explanation": "AI Service Timeout",
            "marks": 0
        }]

    # Save exam paper (Handle guest user carefully)
    user_id = user.get("id", "guest")
    paper_doc = {
        "user_id": user_id,
        "student_class": str(student_class),
        "subject": subject_name,
        "chapter": chapter_name,
        "topic": topic_name,
        "difficulty": difficulty,
        "num_questions": len(questions),
        "questions": questions,
        "created_at": datetime.utcnow(),
    }
    try:
        await exam_papers_collection.insert_one(paper_doc)
    except Exception as db_err:
        print(f"[EXAM] DB Save Error: {db_err}")

    # Generate PDF
    pdf_bytes = create_exam_pdf(
        title=f"{subject_name} Exam Paper",
        student_class=str(student_class),
        subject=subject_name,
        questions=questions,
        test_type=test_type,
    )
    
    pdf_buffer = io.BytesIO(pdf_bytes)

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=SmartShiksha_{subject_name}_Paper.pdf"}
    )


@router.get("/my-papers")
async def get_my_papers(user: dict = Depends(get_current_user)):
    """Get all generated exam papers for the current user."""
    cursor = exam_papers_collection.find(
        {"user_id": user["id"]}
    ).sort("created_at", -1).limit(20)
    papers = await cursor.to_list(length=20)

    return [
        {
            "id": str(p["_id"]),
            "subject": p.get("subject"),
            "chapter": p.get("chapter"),
            "student_class": p.get("student_class"),
            "difficulty": p.get("difficulty"),
            "num_questions": p.get("num_questions"),
            "created_at": p["created_at"].isoformat() if isinstance(p["created_at"], datetime) else str(p["created_at"]),
        }
        for p in papers
    ]
