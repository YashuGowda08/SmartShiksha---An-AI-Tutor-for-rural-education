import asyncio
import os
import sys

# Ensure we can import from app
sys.path.append(os.getcwd())

from app.config import get_settings
from app.services.ai_service import generate_topic_content

async def debug_gen():
    settings = get_settings()
    # Explicitly print settings to verify key
    print(f"DEBUG: Using Model: {settings.GROQ_MODEL}")
    print(f"DEBUG: Key ends with: ...{settings.GROQ_API_KEY[-5:]}")
    
    try:
        content = await generate_topic_content(
            student_class="11",
            subject="Computer Science",
            chapter="Encoding Schemes",
            topic="Introduction to Encoding Schemes",
            language="English"
        )
        print("--- GENERATION RESULT ---")
        print(f"Explanation Preview: {content.get('explanation')[:200]}")
        print(f"Is Fallback? {'heavy load' in content.get('explanation').lower()}")
    except Exception as e:
        print(f"--- CRITICAL ERROR ---")
        print(str(e))

if __name__ == "__main__":
    asyncio.run(debug_gen())
