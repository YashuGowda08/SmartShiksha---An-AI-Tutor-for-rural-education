import asyncio
import json
from app.services.ai_service import generate_exam_questions

async def verify_exam_gen():
    print("--- Verifying Exam Generator AI ---")
    try:
        # Test with Class 10 Physics
        questions_text = await generate_exam_questions(
            student_class="10",
            subject="Physics",
            chapter="Light",
            topic="Reflection",
            difficulty="Medium",
            question_types=["MCQ"],
            num_questions=2
        )
        print("Raw AI Output Length:", len(questions_text))
        
        # Try parse
        questions = json.loads(questions_text)
        print(f"Successfully parsed {len(questions)} questions.")
        if len(questions) > 0:
            print("First Question:", questions[0].get("question_text")[:50], "...")
            
    except Exception as e:
        print(f"FAILED: {str(e)}")

if __name__ == "__main__":
    asyncio.run(verify_exam_gen())
