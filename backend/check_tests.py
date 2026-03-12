import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def list_tests():
    client = AsyncIOMotorClient('mongodb+srv://SmartShiksha_db_user:6W7wA5MeTpfOUCMq@cluster0.iqkfuvn.mongodb.net/')
    db = client.smart_shiksha
    tests = await db.mock_tests.find().to_list(length=100)
    for t in tests:
        print(f"Test: {t.get('title')}, Type: {t.get('test_type')}, Duration: {t.get('duration_minutes')}")
    client.close()

if __name__ == "__main__":
    asyncio.run(list_tests())
