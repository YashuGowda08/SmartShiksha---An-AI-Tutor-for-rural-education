"""Clean up topics collection by removing raw JSON strings and markdown symbols."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
import re
import json

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "smart_shiksha")

async def cleanup():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[MONGODB_DB_NAME]
    topics_collection = db["topics"]
    
    print("Fetching topics...")
    cursor = topics_collection.find({})
    topics = await cursor.to_list(length=1000)
    
    for topic in topics:
        explanation = topic.get("explanation", "")
        examples = topic.get("examples", "")
        updated = False
        
        # 1. Detect and parse raw JSON in explanation
        if explanation.strip().startswith("{"):
            try:
                # Try to find JSON block
                json_match = re.search(r'\{.*\}', explanation, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group(0))
                    explanation = data.get("explanation", explanation)
                    examples = data.get("examples", examples)
                    updated = True
            except:
                pass

        # 2. Strip markdown symbols (# and **)
        # Remove headers
        original_explanation = explanation
        explanation = re.sub(r'^#+\s*', '', explanation, flags=re.MULTILINE)
        # Remove bolding
        explanation = explanation.replace("**", "")
        
        if explanation != original_explanation:
            updated = True
            
        original_examples = examples
        examples = re.sub(r'^#+\s*', '', examples, flags=re.MULTILINE)
        examples = examples.replace("**", "")
        
        if examples != original_examples:
            updated = True
            
        if updated:
            print(f"Cleaning up topic: {topic.get('name', 'Unknown')}")
            await topics_collection.update_one(
                {"_id": topic["_id"]},
                {"$set": {"explanation": explanation, "examples": examples}}
            )
            
    print("Cleanup complete!")
    client.close()

if __name__ == "__main__":
    asyncio.run(cleanup())
