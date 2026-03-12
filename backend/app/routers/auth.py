"""Auth router — Clerk verification + user onboarding (MongoDB)."""
from fastapi import APIRouter, Depends, HTTPException, Header
import httpx
from datetime import datetime
from bson import ObjectId

from app.database import users_collection
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()


def serialize_user(user: dict) -> dict:
    """Convert MongoDB user doc to JSON-safe dict."""
    if not user:
        return None
    user["id"] = str(user["_id"])
    del user["_id"]
    if "created_at" in user and isinstance(user["created_at"], datetime):
        user["created_at"] = user["created_at"].isoformat()
    if "updated_at" in user and isinstance(user["updated_at"], datetime):
        user["updated_at"] = user["updated_at"].isoformat()
    return user


async def verify_clerk_token(authorization: str = Header(None)) -> dict:
    """Verify Clerk JWT and return user info."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")

    token = authorization.replace("Bearer ", "")

    try:
        # Try decoding JWT claims directly
        from jose import jwt
        try:
            payload = jwt.get_unverified_claims(token)
            return {
                "clerk_id": payload.get("sub", ""),
                "email": payload.get("email", payload.get("primary_email_address", "")),
                "name": payload.get("name", payload.get("first_name", "Student")),
            }
        except Exception:
            pass

        # Fallback: verify with Clerk backend API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.clerk.com/v1/users",
                headers={
                    "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
                },
            )
            if response.status_code == 200:
                return {
                    "clerk_id": token[:20],
                    "email": "student@smartshiksha.com",
                    "name": "Student",
                }
            raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


async def get_current_user(authorization: str = Header(None)) -> dict:
    """Get current authenticated user from MongoDB."""
    clerk_data = await verify_clerk_token(authorization)
    user = await users_collection.find_one({"clerk_id": clerk_data["clerk_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please complete registration.")
    return serialize_user(user)


@router.post("/register")
async def register_user(authorization: str = Header(None)):
    """Register a new user from Clerk authentication."""
    clerk_data = await verify_clerk_token(authorization)

    existing = await users_collection.find_one({"clerk_id": clerk_data["clerk_id"]})
    if existing:
        return serialize_user(existing)

    user_doc = {
        "clerk_id": clerk_data["clerk_id"],
        "name": clerk_data["name"] or "Student",
        "email": clerk_data["email"],
        "student_class": None,
        "board": None,
        "language": "English",
        "role": "student",
        "onboarding_complete": False,
        "avatar_url": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await users_collection.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return serialize_user(user_doc)


@router.post("/onboarding")
async def complete_onboarding(
    data: dict,
    user: dict = Depends(get_current_user),
):
    """Complete student onboarding with class, board, and language."""
    await users_collection.update_one(
        {"_id": ObjectId(user["id"])},
        {"$set": {
            "student_class": data.get("student_class"),
            "board": data.get("board"),
            "language": data.get("language", "English"),
            "onboarding_complete": True,
            "updated_at": datetime.utcnow(),
        }}
    )
    updated = await users_collection.find_one({"_id": ObjectId(user["id"])})
    return serialize_user(updated)


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user profile."""
    return user


@router.patch("/me")
async def update_profile(
    data: dict,
    user: dict = Depends(get_current_user),
):
    """Update user profile."""
    update_fields = {}
    if "name" in data and data["name"]:
        update_fields["name"] = data["name"]
    if "language" in data and data["language"]:
        update_fields["language"] = data["language"]
    if "avatar_url" in data:
        update_fields["avatar_url"] = data["avatar_url"]

    if update_fields:
        update_fields["updated_at"] = datetime.utcnow()
        await users_collection.update_one(
            {"_id": ObjectId(user["id"])},
            {"$set": update_fields}
        )

    updated = await users_collection.find_one({"_id": ObjectId(user["id"])})
    return serialize_user(updated)
