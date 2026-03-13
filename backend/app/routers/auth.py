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


async def fetch_clerk_user(token: str) -> dict:
    """Fetch user info from Clerk using the token."""
    # This URL is derived from the publishable key better-cobra-12.clerk.accounts.dev
    url = "https://better-cobra-12.clerk.accounts.dev/oauth/userinfo"
    
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(url, headers={"Authorization": f"Bearer {token}"})
            if r.status_code == 200:
                data = r.json()
                return {
                    "clerk_id": data.get("sub"),
                    "email": data.get("email"),
                    "name": data.get("name") or data.get("given_name") or "Student",
                }
            else:
                print(f"DEBUG AUTH: Clerk verification failed (status {r.status_code}): {r.text}")
                return None
        except Exception as e:
            print(f"DEBUG AUTH: Clerk request failed: {e}")
            return None


async def verify_clerk_token(authorization: str = Header(None)) -> dict:
    """Verify Clerk JWT and return user info."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    # Verify with Clerk in real-time
    clerk_data = await fetch_clerk_user(token)
    if not clerk_data:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    return clerk_data


async def get_current_user(authorization: str = Header(None)) -> dict:
    """Get current authenticated user from MongoDB."""
    clerk_data = await verify_clerk_token(authorization)
    
    # Try finding by clerk_id
    user = await users_collection.find_one({"clerk_id": clerk_data["clerk_id"]})
    
    # Fallback to finding by email
    if not user and clerk_data.get("email"):
        user = await users_collection.find_one({"email": clerk_data["email"]})
        if user:
            # Sync clerk_id
            await users_collection.update_one(
                {"_id": user["_id"]},
                {"$set": {"clerk_id": clerk_data["clerk_id"]}}
            )
            print(f"DEBUG DB: Synced clerk_id for {clerk_data['email']}")
            
    if not user:
        print(f"DEBUG DB: User NOT FOUND for clerk_id: {clerk_data['clerk_id']}")
        raise HTTPException(status_code=404, detail="User not found")
        
    return serialize_user(user)


@router.post("/register")
async def register_user(authorization: str = Header(None)):
    """Register a new user from Clerk authentication."""
    clerk_data = await verify_clerk_token(authorization)

    existing = await users_collection.find_one({"clerk_id": clerk_data["clerk_id"]})
    if not existing and clerk_data.get("email"):
        existing = await users_collection.find_one({"email": clerk_data["email"]})
        if existing:
            await users_collection.update_one(
                {"_id": existing["_id"]},
                {"$set": {"clerk_id": clerk_data["clerk_id"]}}
            )

    if existing:
        return serialize_user(existing)

    # Auto-assign admin if email matches
    role = "student"
    if clerk_data["email"].lower() == settings.ADMIN_EMAIL.lower():
        role = "admin"

    user_doc = {
        "clerk_id": clerk_data["clerk_id"],
        "name": clerk_data["name"] or "Student",
        "email": clerk_data["email"],
        "role": role,
        "student_class": None,
        "board": None,
        "language": "English",
        "created_at": datetime.utcnow(),
    }
    result = await users_collection.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return serialize_user(user_doc)


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user details."""
    return {"data": user}


@router.post("/onboarding")
async def complete_onboarding(
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Complete user onboarding."""
    await users_collection.update_one(
        {"clerk_id": user["clerk_id"]},
        {"$set": {
            "student_class": data.get("student_class"),
            "board": data.get("board"),
            "language": data.get("language", "English"),
            "onboarding_completed": True
        }}
    )
    return {"status": "success"}


@router.patch("/me")
async def update_profile(
    data: dict,
    user: dict = Depends(get_current_user)
):
    """Update user profile."""
    # Prevent changing role via this endpoint
    if "role" in data:
        del data["role"]
        
    await users_collection.update_one(
        {"clerk_id": user["clerk_id"]},
        {"$set": data}
    )
    return {"status": "success"}
