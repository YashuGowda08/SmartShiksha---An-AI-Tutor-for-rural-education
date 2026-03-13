"""Auth router — Clerk verification + user onboarding (MongoDB)."""
from fastapi import APIRouter, Depends, HTTPException, Header
import httpx
from datetime import datetime
from bson import ObjectId
from jose import jwt

from app.database import users_collection
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()

# Cache for JWKS
JWKS_CACHE = None

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


async def get_jwks():
    """Fetch and cache Clerk JWKS."""
    global JWKS_CACHE
    if JWKS_CACHE:
        return JWKS_CACHE
    
    url = "https://better-cobra-12.clerk.accounts.dev/.well-known/jwks.json"
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(url)
            if r.status_code == 200:
                JWKS_CACHE = r.json()
                return JWKS_CACHE
        except Exception as e:
            print(f"Auth Error: Failed to fetch JWKS: {e}")
    return None


async def fetch_clerk_user_details(clerk_id: str) -> dict:
    """Fetch full user details from Clerk Backend API."""
    url = f"https://api.clerk.com/v1/users/{clerk_id}"
    headers = {
        "Authorization": f"Bearer {settings.CLERK_SECRET_KEY}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(url, headers=headers)
            if r.status_code == 200:
                data = r.json()
                email = None
                if data.get("email_addresses"):
                    email = data["email_addresses"][0].get("email_address")
                
                return {
                    "clerk_id": clerk_id,
                    "email": email,
                    "name": f"{data.get('first_name', '')} {data.get('last_name', '')}".strip() or "Student",
                    "image_url": data.get("image_url")
                }
        except Exception as e:
            print(f"Auth Error: Clerk API request failed: {e}")
    return None


async def verify_clerk_token(authorization: str = Header(None)) -> dict:
    """Verify Clerk JWT locally and return user info."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        # 1. Get kid from header
        headers = jwt.get_unverified_header(token)
        kid = headers.get("kid")
        if not kid:
            raise Exception("Token missing kid")

        # 2. Get JWKS
        jwks = await get_jwks()
        if not jwks:
            payload = jwt.get_unverified_claims(token)
        else:
            rsa_key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
            if not rsa_key:
                raise Exception(f"Key {kid} not found in JWKS")

            payload = jwt.decode(
                token, 
                rsa_key, 
                algorithms=["RS256"],
                options={"verify_aud": False}
            )
            
        return {
            "clerk_id": payload.get("sub"),
            "name": payload.get("name") or "Student",
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_current_user(authorization: str = Header(None)) -> dict:
    """Get current authenticated user from MongoDB, syncing with Clerk if needed."""
    clerk_auth = await verify_clerk_token(authorization)
    clerk_id = clerk_auth["clerk_id"]
    
    # 1. Try finding by clerk_id
    user = await users_collection.find_one({"clerk_id": clerk_id})
    
    # 2. Not found or missing details? Fetch from Clerk API
    if not user:
        clerk_details = await fetch_clerk_user_details(clerk_id)
        if not clerk_details:
            raise HTTPException(status_code=401, detail="Could not verify user identity via Clerk")

        # Sync by email
        if clerk_details.get("email"):
            user = await users_collection.find_one({"email": clerk_details["email"]})
            if user:
                await users_collection.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"clerk_id": clerk_id}}
                )
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found in database. Please register.")

    # 3. Enforce Admin Role by Email (Ensures Admin access even if DB is out of sync)
    if user.get("email") and user["email"].lower() == settings.ADMIN_EMAIL.lower():
        if user.get("role") != "admin":
            await users_collection.update_one({"_id": user["_id"]}, {"$set": {"role": "admin"}})
            user["role"] = "admin"
        
    return serialize_user(user)


@router.post("/register")
async def register_user(authorization: str = Header(None)):
    """Register a new user from Clerk authentication."""
    clerk_auth = await verify_clerk_token(authorization)
    clerk_id = clerk_auth["clerk_id"]

    clerk_details = await fetch_clerk_user_details(clerk_id)
    if not clerk_details:
        raise HTTPException(status_code=401, detail="Could not fetch user info from Clerk")

    existing = await users_collection.find_one({
        "$or": [
            {"clerk_id": clerk_id},
            {"email": clerk_details["email"]} if clerk_details["email"] else {"clerk_id": "NEVER_MATCH"}
        ]
    })

    if existing:
        if not existing.get("clerk_id"):
            await users_collection.update_one(
                {"_id": existing["_id"]},
                {"$set": {"clerk_id": clerk_id}}
            )
        return serialize_user(existing)

    role = "student"
    if clerk_details["email"] and clerk_details["email"].lower() == settings.ADMIN_EMAIL.lower():
        role = "admin"

    user_doc = {
        "clerk_id": clerk_id,
        "name": clerk_details["name"],
        "email": clerk_details["email"],
        "role": role,
        "student_class": None,
        "board": None,
        "language": "English",
        "onboarding_completed": False,
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
    if "role" in data:
        del data["role"]
        
    await users_collection.update_one(
        {"clerk_id": user["clerk_id"]},
        {"$set": data}
    )
    return {"status": "success"}
