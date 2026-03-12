"""AI Tutor chat router (MongoDB)."""
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime

from app.database import (
    chat_sessions_collection, chat_messages_collection,
    topics_collection, chapters_collection, subjects_collection
)
from app.routers.auth import get_current_user
from app.services.ai_service import generate_tutor_response, explain_textbook_paragraph

router = APIRouter(prefix="/ai-tutor", tags=["AI Tutor"])


@router.post("/chat")
async def chat_with_tutor(
    req: dict,
    user: dict = Depends(get_current_user),
):
    """Chat with the AI tutor."""
    message = req.get("message", "")
    session_id = req.get("session_id")
    topic_id = req.get("topic_id")
    language = req.get("language", "English")
    student_class = req.get("student_class") or user.get("student_class", "10")
    subject = req.get("subject", "General")
    topic_name = req.get("topic_name", "General")

    # Get or create session
    session = None
    if session_id:
        session = await chat_sessions_collection.find_one({
            "_id": ObjectId(session_id),
            "user_id": user["id"],
        })

    if not session:
        session_doc = {
            "user_id": user["id"],
            "topic_id": topic_id,
            "language": language,
            "created_at": datetime.utcnow(),
        }
        result = await chat_sessions_collection.insert_one(session_doc)
        session_id = str(result.inserted_id)
    else:
        session_id = str(session["_id"])

    # Get chat history
    cursor = chat_messages_collection.find(
        {"session_id": session_id}
    ).sort("created_at", 1)
    history_docs = await cursor.to_list(length=20)
    chat_history = [{"role": m["role"], "content": m["content"]} for m in history_docs]

    # Try to get topic context
    if topic_id:
        topic = await topics_collection.find_one({"_id": ObjectId(topic_id)})
        if topic:
            topic_name = topic.get("name", topic_name)
            # Get subject name
            chapter = await chapters_collection.find_one({"_id": ObjectId(topic.get("chapter_id", ""))})
            if chapter:
                subj = await subjects_collection.find_one({"_id": ObjectId(chapter.get("subject_id", ""))})
                if subj:
                    subject = subj.get("name", subject)

    # Generate AI response
    try:
        ai_response = await generate_tutor_response(
            message=message,
            student_class=str(student_class),
            subject=subject,
            topic=topic_name,
            language=language,
            chat_history=chat_history[-10:],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")

    # Save messages
    now = datetime.utcnow()
    await chat_messages_collection.insert_many([
        {"session_id": session_id, "role": "user", "content": message, "created_at": now},
        {"session_id": session_id, "role": "assistant", "content": ai_response, "created_at": now},
    ])

    return {"response": ai_response, "session_id": session_id}


@router.get("/sessions")
async def get_chat_sessions(user: dict = Depends(get_current_user)):
    """Get all chat sessions for the current user."""
    cursor = chat_sessions_collection.find(
        {"user_id": user["id"]}
    ).sort("created_at", -1).limit(20)
    sessions = await cursor.to_list(length=20)

    result = []
    for s in sessions:
        msg_count = await chat_messages_collection.count_documents({"session_id": str(s["_id"])})
        result.append({
            "id": str(s["_id"]),
            "topic_id": s.get("topic_id"),
            "language": s.get("language", "English"),
            "created_at": s["created_at"].isoformat() if isinstance(s["created_at"], datetime) else str(s["created_at"]),
            "message_count": msg_count,
        })
    return result


@router.get("/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, user: dict = Depends(get_current_user)):
    """Get all messages in a chat session."""
    session = await chat_sessions_collection.find_one({
        "_id": ObjectId(session_id),
        "user_id": user["id"],
    })
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    cursor = chat_messages_collection.find(
        {"session_id": session_id}
    ).sort("created_at", 1)
    messages = await cursor.to_list(length=100)

    return [
        {
            "id": str(m["_id"]),
            "role": m["role"],
            "content": m["content"],
            "created_at": m["created_at"].isoformat() if isinstance(m["created_at"], datetime) else str(m["created_at"]),
        }
        for m in messages
    ]


@router.post("/explain-text")
async def explain_text(
    paragraph: str,
    subject: str = "General",
    language: str = "English",
    user: dict = Depends(get_current_user),
):
    """Explain a highlighted textbook paragraph."""
    student_class = user.get("student_class", "10")
    try:
        explanation = await explain_textbook_paragraph(
            paragraph=paragraph,
            student_class=str(student_class),
            subject=subject,
            language=language,
        )
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
