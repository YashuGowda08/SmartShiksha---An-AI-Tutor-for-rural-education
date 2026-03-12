import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import sys
import os

# Add parent dir to path to import app
sys.path.append(os.getcwd())

from app.routers.mock_tests import rebuild_test_with_ai

async def trigger_sync():
    client = AsyncIOMotorClient('mongodb+srv://SmartShiksha_db_user:6W7wA5MeTpfOUCMq@cluster0.iqkfuvn.mongodb.net/')
    db = client.smart_shiksha
    
    ids = ["69b2c943a3db42e8c011bcda", "69b2c944a3db42e8c011bd35"]
    
    for tid in ids:
        test = await db.mock_tests.find_one({"_id": ObjectId(tid)})
        if test:
            print(f"Triggering sync for: {test.get('title')}")
            # We can't easily run the background task here as it depends on app context
            # but we can try to call the function directly if it's isolated enough
            try:
                await rebuild_test_with_ai(tid, test)
            except Exception as e:
                print(f"Failed for {tid}: {e}")
        else:
            print(f"Test not found: {tid}")

    client.close()

if __name__ == "__main__":
    asyncio.run(trigger_sync())
