"""MongoDB async database connection using Motor."""
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

settings = get_settings()

# MongoDB client
client = AsyncIOMotorClient(settings.MONGODB_URI)
db = client[settings.MONGODB_DB_NAME]

# Collections
users_collection = db["users"]
subjects_collection = db["subjects"]
chapters_collection = db["chapters"]
topics_collection = db["topics"]
questions_collection = db["questions"]
mock_tests_collection = db["mock_tests"]
test_questions_collection = db["test_questions"]
student_attempts_collection = db["student_attempts"]
student_answers_collection = db["student_answers"]
progress_collection = db["progress"]
chat_sessions_collection = db["chat_sessions"]
chat_messages_collection = db["chat_messages"]
textbooks_collection = db["textbooks"]
exam_papers_collection = db["exam_papers"]
community_posts_collection = db["community_posts"]


async def init_db():
    """Create indexes for commonly queried fields."""
    await users_collection.create_index("clerk_id", unique=True)
    await users_collection.create_index("email", unique=True)
    await chapters_collection.create_index("subject_id")
    await topics_collection.create_index("chapter_id")
    await questions_collection.create_index("topic_id")
    await progress_collection.create_index([("user_id", 1), ("topic_id", 1)])
    await student_attempts_collection.create_index("user_id")
    await chat_sessions_collection.create_index("user_id")
    await community_posts_collection.create_index("author_id")
    await community_posts_collection.create_index("created_at")
    print("MongoDB indexes created")


async def close_db():
    """Close the MongoDB connection."""
    client.close()
