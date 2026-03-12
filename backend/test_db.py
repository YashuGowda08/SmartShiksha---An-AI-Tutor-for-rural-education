
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError

async def test_connection():
    uri = "mongodb+srv://SmartShiksha_db_user:6W7wA5MeTpfOUCMq@cluster0.iqkfuvn.mongodb.net/"
    print(f"Testing connection to: {uri.split('@')[1]}")
    client = AsyncIOMotorClient(uri, serverSelectionTimeoutMS=5000)
    try:
        # The ismaster command is cheap and does not require auth.
        await client.admin.command('ping')
        print("✅ MongoDB Connection Successful!")
    except ServerSelectionTimeoutError as e:
        print(f"❌ MongoDB Connection Timeout: {e}")
    except Exception as e:
        print(f"❌ MongoDB Connection Error: {type(e).__name__}: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_connection())
