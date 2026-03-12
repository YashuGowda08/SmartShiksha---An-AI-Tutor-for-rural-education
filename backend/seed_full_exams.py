import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from bson import ObjectId

async def seed_exams():
    client = AsyncIOMotorClient('mongodb+srv://SmartShiksha_db_user:6W7wA5MeTpfOUCMq@cluster0.iqkfuvn.mongodb.net/')
    db = client.smart_shiksha
    
    # ── JEE MAIN FULL EXAM ────────────────────────────────────────────────
    jee_test = {
        "title": "JEE Main — Professional Full Mock Test",
        "description": "Full-length JEE Main pattern exam. 90 questions (Physics, Chemistry, Maths). Duration: 180 mins.",
        "test_type": "JEE",
        "student_class": "12",
        "subject_name": "Full Syllabus",
        "duration_minutes": 180,
        "total_marks": 300,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    jee_res = await db.mock_tests.insert_one(jee_test)
    jee_id = str(jee_res.inserted_id)
    
    jee_questions = []
    # Physics (30 total: 20 MCQ, 10 Numerical)
    for i in range(30):
        q_type = "MCQ" if i < 20 else "Numerical"
        jee_questions.append({
            "test_id": jee_id,
            "question_text": f"JEE Physics Question {i+1} ({q_type})",
            "question_type": q_type,
            "options": ["Option A", "Option B", "Option C", "Option D"] if q_type == "MCQ" else [],
            "correct_answer": "Option A" if q_type == "MCQ" else "10",
            "marks": 4,
            "negative_marking": True if q_type == "MCQ" else False,
            "order_index": i,
            "created_at": datetime.utcnow()
        })
        
    # Chemistry (30 total)
    for i in range(30):
        q_type = "MCQ" if i < 20 else "Numerical"
        jee_questions.append({
            "test_id": jee_id,
            "question_text": f"JEE Chemistry Question {i+1} ({q_type})",
            "question_type": q_type,
            "options": ["Option A", "Option B", "Option C", "Option D"] if q_type == "MCQ" else [],
            "correct_answer": "Option A" if q_type == "MCQ" else "15",
            "marks": 4,
            "negative_marking": True if q_type == "MCQ" else False,
            "order_index": 30 + i,
            "created_at": datetime.utcnow()
        })
        
    # Maths (30 total)
    for i in range(30):
        q_type = "MCQ" if i < 20 else "Numerical"
        jee_questions.append({
            "test_id": jee_id,
            "question_text": f"JEE Mathematics Question {i+1} ({q_type})",
            "question_type": q_type,
            "options": ["Option A", "Option B", "Option C", "Option D"] if q_type == "MCQ" else [],
            "correct_answer": "Option A" if q_type == "MCQ" else "20",
            "marks": 4,
            "negative_marking": True if q_type == "MCQ" else False,
            "order_index": 60 + i,
            "created_at": datetime.utcnow()
        })
        
    await db.test_questions.insert_many(jee_questions)
    print(f"Seeded JEE Full Exam with {len(jee_questions)} questions (ID: {jee_id})")
    
    # ── NEET UG FULL EXAM ─────────────────────────────────────────────────
    neet_test = {
        "title": "NEET UG — Professional Full Mock Test",
        "description": "Full-length NEET UG pattern exam. 200 questions. Duration: 200 mins.",
        "test_type": "NEET",
        "student_class": "12",
        "subject_name": "Full Syllabus",
        "duration_minutes": 200,
        "total_marks": 720,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    neet_res = await db.mock_tests.insert_one(neet_test)
    neet_id = str(neet_res.inserted_id)
    
    neet_questions = []
    # 200 questions total
    for i in range(200):
        neet_questions.append({
            "test_id": neet_id,
            "question_text": f"NEET Question {i+1} (MCQ)",
            "question_type": "MCQ",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "A",
            "marks": 4,
            "negative_marking": True,
            "order_index": i,
            "created_at": datetime.utcnow()
        })
        
    # Insert in batches for large sets
    batch_size = 50
    for i in range(0, len(neet_questions), batch_size):
        await db.test_questions.insert_many(neet_questions[i:i+batch_size])
        
    print(f"Seeded NEET Full Exam with {len(neet_questions)} questions (ID: {neet_id})")
    
    # Write the IDs to a temp file so the frontend can use them
    with open("full_exam_ids.txt", "w") as f:
        f.write(f"JEE_ID={jee_id}\nNEET_ID={neet_id}\n")

    client.close()

if __name__ == "__main__":
    asyncio.run(seed_exams())
