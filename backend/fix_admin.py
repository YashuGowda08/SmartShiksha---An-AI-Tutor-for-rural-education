from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

async def run():
    c = AsyncIOMotorClient("mongodb+srv://SmartShiksha_db_user:6W7wA5MeTpfOUCMq@cluster0.iqkfuvn.mongodb.net/")
    db = c.smart_shiksha

    real_clerk_id = "user_3AnLZ1SSAPziuvPNcdRFpJefq9j"
    admin_email = "yashugowda8102005@gmail.com"

    # Step 1: Delete the wrong record with that clerk_id (the student duplicate)
    res = await db.users.delete_many({
        "clerk_id": real_clerk_id,
        "email": {"$ne": admin_email}
    })
    print(f"Step 1 - Deleted duplicates with real clerk_id: {res.deleted_count}")

    # Step 2: Update the admin record with the correct clerk_id
    res2 = await db.users.update_one(
        {"email": admin_email},
        {"$set": {"clerk_id": real_clerk_id, "role": "admin"}}
    )
    print(f"Step 2 - Updated admin: matched={res2.matched_count}, modified={res2.modified_count}")

    # Step 3: Verify
    admin = await db.users.find_one({"email": admin_email})
    print(f"\nVERIFIED: clerk_id={admin.get('clerk_id')} | email={admin.get('email')} | role={admin.get('role')}")

    # Show all users
    print("\nAll users:")
    users = await db.users.find({}).to_list(100)
    for u in users:
        print(f"  {u.get('clerk_id')} | {u.get('email')} | {u.get('role')}")

    c.close()

asyncio.run(run())
