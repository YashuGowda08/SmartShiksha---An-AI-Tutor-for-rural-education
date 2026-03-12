import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check_full_exams():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["smart_shiksha"]
    
    ids = ["69b2c943a3db42e8c011bcda", "69b2c944a3db42e8c011bd35"]
    
    for tid in ids:
        print(f"\nChecking Test: {tid}")
        q = await db.test_questions.find_one({"test_id": tid})
        if q:
            print(f"First Question: {q.get('question_text')[:100]}...")
        else:
            # Try ObjectId
            q = await db.test_questions.find_one({"test_id": ObjectId(tid)})
            if q:
                print(f"First Question (ObjectId): {q.get('question_text')[:100]}...")
            else:
                print("No questions found.")

    client.close()

if __name__ == "__main__":
    asyncio.run(check_full_exams())
