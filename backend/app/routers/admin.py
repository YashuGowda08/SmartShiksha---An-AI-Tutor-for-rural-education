"""Admin panel router (MongoDB)."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from bson import ObjectId
from datetime import datetime, timedelta
import json

from app.database import (
    users_collection, student_attempts_collection,
    questions_collection, subjects_collection,
    topics_collection
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])


async def verify_admin(user: dict = Depends(get_current_user)):
    """Verify the user has admin role."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/stats")
async def get_platform_stats(user: dict = Depends(get_current_user)):
    """Get platform-wide statistics."""
    # Total students
    total_students = await users_collection.count_documents({"role": "student"})

    # Active today
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    active_today = await student_attempts_collection.count_documents({
        "created_at": {"$gte": today}
    })

    # Total tests taken
    total_tests = await student_attempts_collection.count_documents({})

    # Average score
    pipeline = [
        {"$group": {"_id": None, "avg": {"$avg": "$percentage"}}}
    ]
    avg_result = await student_attempts_collection.aggregate(pipeline).to_list(length=1)
    avg_score = round(avg_result[0]["avg"], 1) if avg_result else 0

    # Class distribution
    class_pipeline = [
        {"$match": {"role": "student"}},
        {"$group": {"_id": "$student_class", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    class_result = await users_collection.aggregate(class_pipeline).to_list(length=10)
    class_distribution = {
        f"Class {r['_id'] or 'Unknown'}": r["count"]
        for r in class_result
    }

    # Most difficult topics (lowest avg scores)
    difficult_pipeline = [
        {"$unwind": "$answers"},
        {"$group": {
            "_id": "$test_id",
            "avg_score": {"$avg": {"$cond": [{"$eq": ["$answers.is_correct", True]}, 100, 0]}}
        }},
        {"$sort": {"avg_score": 1}},
        {"$limit": 5}
    ]
    difficult_result = await student_attempts_collection.aggregate(difficult_pipeline).to_list(length=5)
    most_difficult = [
        {"test": r.get("_id", "Unknown"), "subject": "Mixed", "avg_score": round(r.get("avg_score", 0), 1)}
        for r in difficult_result
    ]

    return {
        "total_students": total_students,
        "active_users_today": active_today,
        "total_tests_taken": total_tests,
        "average_platform_score": avg_score,
        "class_distribution": class_distribution,
        "most_difficult_topics": most_difficult,
    }


@router.post("/upload-questions")
async def upload_questions(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    """Upload question bank from JSON file."""
    content = await file.read()
    try:
        data = json.loads(content.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    questions = data if isinstance(data, list) else data.get("questions", [])
    if not questions:
        raise HTTPException(status_code=400, detail="No questions found in file")

    for q in questions:
        q["created_at"] = datetime.utcnow()
        q["uploaded_by"] = user["id"]

    result = await questions_collection.insert_many(questions)
    return {"message": f"Uploaded {len(result.inserted_ids)} questions successfully"}


@router.get("/users")
async def list_users(
    page: int = 1,
    limit: int = 20,
    user: dict = Depends(get_current_user),
):
    """List all users (admin only)."""
    skip = (page - 1) * limit
    cursor = users_collection.find(
        {},
        {"_id": 1, "name": 1, "email": 1, "student_class": 1, "board": 1, "role": 1, "created_at": 1}
    ).sort("created_at", -1).skip(skip).limit(limit)

    users = await cursor.to_list(length=limit)
    total = await users_collection.count_documents({})

    return {
        "users": [
            {
                "id": str(u["_id"]),
                "name": u.get("name"),
                "email": u.get("email"),
                "student_class": u.get("student_class"),
                "board": u.get("board"),
                "role": u.get("role"),
                "created_at": u["created_at"].isoformat() if isinstance(u.get("created_at"), datetime) else "",
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }
