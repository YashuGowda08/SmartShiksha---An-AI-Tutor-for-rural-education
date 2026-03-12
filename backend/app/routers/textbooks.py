"""Textbook management router (MongoDB)."""
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from bson import ObjectId
from datetime import datetime

from app.database import textbooks_collection
from app.routers.auth import get_current_user

router = APIRouter(prefix="/textbooks", tags=["Textbooks"])


def serialize_doc(doc: dict) -> dict:
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    for key, val in doc.items():
        if isinstance(val, datetime):
            doc[key] = val.isoformat()
    return doc


@router.get("/")
async def list_textbooks(
    student_class: Optional[str] = None, 
    board: Optional[str] = None,
    subject: Optional[str] = None
):
    """List available textbooks with flexible filtering."""
    query = {}
    if student_class and student_class != "all":
        query["class"] = student_class
    if board:
        query["board"] = board
    if subject:
        query["subject"] = {"$regex": subject, "$options": "i"}
        
    cursor = textbooks_collection.find(query).sort("created_at", -1)
    textbooks = await cursor.to_list(length=100)
    return [serialize_doc(t) for t in textbooks]


@router.get("/{textbook_id}")
async def get_textbook(textbook_id: str):
    """Get a specific textbook."""
    textbook = await textbooks_collection.find_one({"_id": ObjectId(textbook_id)})
    if not textbook:
        raise HTTPException(status_code=404, detail="Textbook not found")
    return serialize_doc(textbook)


@router.post("/")
async def upload_textbook(
    title: str = Form(...),
    student_class: str = Form(...),
    board: str = Form("CBSE"),
    subject: str = Form(""),
    file: UploadFile = File(None),
    user: dict = Depends(get_current_user),
):
    """Upload a new textbook (admin only)."""
    file_url = ""
    file_size_mb = 0.0

    if file:
        content = await file.read()
        file_size_mb = round(len(content) / (1024 * 1024), 1)
        
        # Save to local uploads folder
        file_path = os.path.join("uploads", file.filename)
        with open(file_path, "wb") as f:
            f.write(content)
            
        file_url = f"/uploads/{file.filename}"

    doc = {
        "title": title,
        "class": student_class,
        "board": board,
        "subject": subject,
        "file_url": file_url,
        "file_size_mb": file_size_mb,
        "uploaded_by": user["id"],
        "created_at": datetime.utcnow(),
    }
    result = await textbooks_collection.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


@router.delete("/{textbook_id}")
async def delete_textbook(textbook_id: str, user: dict = Depends(get_current_user)):
    """Delete a textbook (admin only)."""
    result = await textbooks_collection.delete_one({"_id": ObjectId(textbook_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Textbook not found")
    return {"message": "Textbook deleted"}
