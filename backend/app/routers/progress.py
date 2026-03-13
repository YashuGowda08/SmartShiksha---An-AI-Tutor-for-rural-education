"""Student progress tracking router (MongoDB)."""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime

from app.database import (
    progress_collection, student_attempts_collection,
    topics_collection, subjects_collection, chapters_collection
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.post("/update")
async def update_progress(data: dict, user: dict = Depends(get_current_user)):
    """Update topic progress for the current user."""
    topic_id = data.get("topic_id")
    completed = data.get("completed", False)
    time_spent = data.get("time_spent_seconds", 0)

    existing = await progress_collection.find_one({
        "user_id": user["id"],
        "topic_id": topic_id,
    })

    if existing:
        await progress_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "completed": completed,
                "updated_at": datetime.utcnow(),
            }, "$inc": {
                "time_spent_seconds": time_spent,
            }}
        )
    else:
        await progress_collection.insert_one({
            "user_id": user["id"],
            "topic_id": topic_id,
            "completed": completed,
            "time_spent_seconds": time_spent,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        })

    return {"message": "Progress updated"}


@router.get("/dashboard")
async def get_dashboard(user: dict = Depends(get_current_user)):
    """Get dashboard statistics for the current user."""
    try:
        print(f"[PROGRESS] Fetching dashboard for user: {user['id']}")
        # Topics completed
        topics_completed = await progress_collection.count_documents({
            "user_id": user["id"],
            "completed": True,
        })
        total_topics = await topics_collection.count_documents({})

        # Tests taken
        tests_taken = await student_attempts_collection.count_documents({
            "user_id": user["id"]
        })

        # Average score
        pipeline = [
            {"$match": {"user_id": user["id"]}},
            {"$group": {"_id": None, "avg_score": {"$avg": "$percentage"}}}
        ]
        avg_result = await student_attempts_collection.aggregate(pipeline).to_list(length=1)
        average_score = round(avg_result[0]["avg_score"], 1) if avg_result else 0

        # Performance by Subject (Real Data) - Robust Aggregation
        # We try to group by subject_name if it exists in the attempt, otherwise join.
        performance_pipeline = [
            {"$match": {"user_id": user["id"]}},
            # Create a field that might be an ObjectId OR just use the string
            {"$addFields": {
                "test_oid": {
                    "$cond": [
                        {"$regexMatch": {"input": "$test_id", "regex": "^[0-9a-fA-F]{24}$"}},
                        {"$toObjectId": "$test_id"},
                        "$test_id"
                    ]
                }
            }},
            {
                "$lookup": {
                    "from": "mock_tests",
                    "let": {"t_id": "$test_id", "t_oid": "$test_oid"},
                    "pipeline": [
                        {"$match": {
                            "$expr": {
                                "$or": [
                                    {"$eq": ["$_id", "$$t_oid"]},
                                    {"$eq": ["$_id", "$$t_id"]}
                                ]
                            }
                        }}
                    ],
                    "as": "test_details"
                }
            },
            # Allow attempts without test details to still pass through
            {"$unwind": {"path": "$test_details", "preserveNullAndEmptyArrays": True}},
            {
                "$group": {
                    "_id": {"$ifNull": ["$test_details.subject_name", "General Proficiency"]},
                    "avg_score": {"$avg": "$percentage"},
                    "attempts": {"$sum": 1}
                }
            }
        ]
        performance_results = await student_attempts_collection.aggregate(performance_pipeline).to_list(length=20)
        subject_scores = {res["_id"]: round(res["avg_score"], 1) for res in performance_results}

        # Total study time
        time_pipeline = [
            {"$match": {"user_id": user["id"]}},
            {"$group": {"_id": None, "total": {"$sum": "$time_spent_seconds"}}}
        ]
        time_result = await progress_collection.aggregate(time_pipeline).to_list(length=1)
        total_seconds = time_result[0]["total"] if time_result else 0
        total_hours = round(total_seconds / 3600, 1)

        # Topic progress per subject
        subject_progress = {}
        subjects = await subjects_collection.find().to_list(length=20)
        for subject in subjects:
            subject_id = str(subject["_id"])
            subject_name = subject.get("name", "Unknown")
            
            # Get chapters for this subject
            chapter_cursor = chapters_collection.find({"subject_id": subject_id})
            chapter_ids = [str(ch["_id"]) async for ch in chapter_cursor]

            # Get topics for these chapters
            topic_cursor = topics_collection.find({"chapter_id": {"$in": chapter_ids}})
            topic_ids = [str(tp["_id"]) async for tp in topic_cursor]

            total_in_subject = len(topic_ids)
            completed_in_subject = await progress_collection.count_documents({
                "user_id": user["id"],
                "topic_id": {"$in": topic_ids},
                "completed": True,
            }) if topic_ids else 0

            pct = round((completed_in_subject / total_in_subject * 100), 1) if total_in_subject > 0 else 0
            subject_progress[subject_name] = {
                "completed": completed_in_subject,
                "total": total_in_subject,
                "percentage": pct,
                "average_test_score": subject_scores.get(subject_name, 0)
            }

        # Recent scores - Robust sorting
        recent_cursor = student_attempts_collection.find(
            {"user_id": user["id"]}
        ).sort([("created_at", -1), ("completed_at", -1), ("_id", -1)]).limit(5)
        
        recent_scores = []
        async for attempt in recent_cursor:
            # Try to get a date
            dt = attempt.get("created_at") or attempt.get("completed_at")
            recent_scores.append({
                "test_id": attempt.get("test_id"),
                "score": attempt.get("score", 0),
                "percentage": attempt.get("percentage", 0),
                "date": dt.isoformat() if isinstance(dt, datetime) else "",
            })

        # Recommended topics (uncompleted)
        recommended = []
        uncompleted_cursor = topics_collection.find({
            "_id": {"$nin": [
                ObjectId(p["topic_id"])
                for p in await progress_collection.find(
                    {"user_id": user["id"], "completed": True},
                    {"topic_id": 1}
                ).to_list(length=100)
                if ObjectId.is_valid(p.get("topic_id", ""))
            ]}
        }).limit(3)
        async for topic in uncompleted_cursor:
            recommended.append({
                "topic_id": str(topic["_id"]),
                "name": topic.get("name", "Unknown"),
                "score": 0,
            })

        return {
            "topics_completed": topics_completed,
            "total_topics": total_topics if total_topics > 0 else 1,
            "tests_taken": tests_taken,
            "average_score": average_score,
            "total_study_time_hours": total_hours,
            "subject_progress": subject_progress,
            "recent_scores": recent_scores,
            "recommended_topics": recommended,
        }

    except Exception as e:
        print(f"[PROGRESS] Dashboard Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Dashboard calculation error: {str(e)}")


@router.get("/topics")
async def get_topic_progress(user: dict = Depends(get_current_user)):
    """Get progress for all topics."""
    cursor = progress_collection.find({"user_id": user["id"]})
    progress_list = await cursor.to_list(length=500)
    return [
        {
            "topic_id": p.get("topic_id"),
            "completed": p.get("completed", False),
            "time_spent_seconds": p.get("time_spent_seconds", 0),
        }
        for p in progress_list
    ]
