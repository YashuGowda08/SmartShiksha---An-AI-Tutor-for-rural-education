"""Community Chatting Router — Posts and Replies (MongoDB)."""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import Optional, List
from bson import ObjectId
from datetime import datetime
import os
import shutil

from app.database import community_posts_collection
from app.routers.auth import get_current_user
from app.schemas import PostCreate, ReplyCreate

router = APIRouter(prefix="/community", tags=["Community"])

def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB doc to JSON-safe dict, ensuring UTC ISO format."""
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    for key, val in doc.items():
        if isinstance(val, datetime):
            # Append 'Z' to indicate UTC, otherwise date-fns might treat it as local
            doc[key] = val.isoformat() + "Z" if not val.isoformat().endswith("Z") else val.isoformat()
        if isinstance(val, ObjectId):
            doc[key] = str(val)
    return doc

@router.get("/posts")
async def get_posts(
    subject: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """Fetch all community posts with pagination."""
    query = {"parent_id": None}  # Only top-level posts
    if subject and subject != "General":
        query["subject"] = subject
    
    cursor = community_posts_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
    posts = await cursor.to_list(length=limit)
    return [serialize_doc(p) for p in posts]

@router.post("/posts")
async def create_post(
    content: str = Form(...),
    subject: str = Form("General"),
    topic: str = Form("General"),
    image: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user)
):
    """Create a new community post with optional image."""
    image_url = None
    if image:
        os.makedirs("uploads/community", exist_ok=True)
        file_path = f"uploads/community/{datetime.utcnow().timestamp()}_{image.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = f"/uploads/community/{os.path.basename(file_path)}"

    post_doc = {
        "author_id": user["id"],
        "author_name": user["name"],
        "author_avatar": user.get("avatar_url"),
        "content": content,
        "image_url": image_url,
        "subject": subject,
        "topic": topic,
        "parent_id": None,
        "replies_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    result = await community_posts_collection.insert_one(post_doc)
    post_doc["_id"] = result.inserted_id
    return serialize_doc(post_doc)

@router.get("/posts/{post_id}/replies")
async def get_replies(post_id: str):
    """Fetch all replies for a specific post."""
    cursor = community_posts_collection.find({"parent_id": post_id}).sort("created_at", 1)
    replies = await cursor.to_list(length=100)
    return [serialize_doc(r) for r in replies]

@router.post("/posts/{post_id}/replies")
async def create_reply(
    post_id: str,
    content: str = Form(...),
    image: Optional[UploadFile] = File(None),
    user: dict = Depends(get_current_user)
):
    """Reply to a community post."""
    # Verify parent post exists
    parent = await community_posts_collection.find_one({"_id": ObjectId(post_id)})
    if not parent:
        raise HTTPException(status_code=404, detail="Parent post not found")

    image_url = None
    if image:
        os.makedirs("uploads/community", exist_ok=True)
        file_path = f"uploads/community/{datetime.utcnow().timestamp()}_{image.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
        image_url = f"/uploads/community/{os.path.basename(file_path)}"

    reply_doc = {
        "author_id": user["id"],
        "author_name": user["name"],
        "author_avatar": user.get("avatar_url"),
        "content": content,
        "image_url": image_url,
        "parent_id": post_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    result = await community_posts_collection.insert_one(reply_doc)
    
    # Update replies count on parent
    await community_posts_collection.update_one(
        {"_id": ObjectId(post_id)},
        {"$inc": {"replies_count": 1}}
    )
    
    reply_doc["_id"] = result.inserted_id
    return serialize_doc(reply_doc)

@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, user: dict = Depends(get_current_user)):
    """Delete a post or reply. Only author can delete."""
    post = await community_posts_collection.find_one({"_id": ObjectId(post_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    if post["author_id"] != user["id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
        
    # If it's a top-level post, delete its replies too
    if post["parent_id"] is None:
        await community_posts_collection.delete_many({"parent_id": post_id})
    else:
        # If it's a reply, decrement parent's count
        await community_posts_collection.update_one(
            {"_id": ObjectId(post["parent_id"])},
            {"$inc": {"replies_count": -1}}
        )
        
    await community_posts_collection.delete_one({"_id": ObjectId(post_id)})
    return {"message": "Success"}
