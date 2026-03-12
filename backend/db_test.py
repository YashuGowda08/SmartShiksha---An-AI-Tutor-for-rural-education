import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def main():
    uri = "mongodb+srv://yasha1b2c:8880Mgyash@cluster0.z1p6i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    client = AsyncIOMotorClient(uri)
    db = client.smart_shiksha
    
    test = await db.mock_tests.find_one()
    print(f"Sample test _id: {test['_id']} (type: {type(test['_id'])})")
    
    qs = await db.test_questions.find({"test_id": str(test["_id"])}).to_list(10)
    print(f"Questions found with string test_id: {len(qs)}")
    
    for q in qs[:1]:
        print(f"Sample Question test_id: {q['test_id']} (type: {type(q['test_id'])})")
        print(f"Sample Question options: {q.get('options')} (type: {type(q.get('options'))})")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
