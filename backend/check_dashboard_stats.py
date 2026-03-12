import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_stats():
    client = AsyncIOMotorClient('mongodb+srv://SmartShiksha_db_user:6W7wA5MeTpfOUCMq@cluster0.iqkfuvn.mongodb.net/')
    db = client.smart_shiksha
    
    # Check collections
    collections = ["users", "topics", "subjects", "chapters", "progress", "student_attempts"]
    for coll in collections:
        count = await db[coll].count_documents({})
        print(f"Collection {coll} has {count} documents")
    
    # Check a specific user (the admin/yash)
    user = await db.users.find_one({"email": "yashugowda8102005@gmail.com"})
    if user:
        uid = str(user["_id"])
        print(f"Found user: {user.get('name')} (ID: {uid}, ClerkID: {user.get('clerk_id')})")
        
        prog_count = await db.progress.count_documents({"user_id": uid})
        att_count = await db.student_attempts.count_documents({"user_id": uid})
        print(f"User {uid} progress: {prog_count}, attempts: {att_count}")
        
        # Check if any progress uses clerk_id instead
        cid = user.get("clerk_id")
        if cid:
            prog_count_c = await db.progress.count_documents({"user_id": cid})
            att_count_c = await db.student_attempts.count_documents({"user_id": cid})
            print(f"User {cid} progress: {prog_count_c}, attempts: {att_count_c}")
    else:
        print("User yashugowda8102005@gmail.com not found")

    client.close()

if __name__ == "__main__":
    asyncio.run(check_stats())
