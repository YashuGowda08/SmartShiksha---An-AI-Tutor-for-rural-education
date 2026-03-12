import asyncio
from app.database import chapters_collection, subjects_collection, topics_collection
from app.routers.subjects import get_topics, get_topic

async def verify():
    print("--- Verifying Curriculum ---")
    subjs = await subjects_collection.find({}).to_list(100)
    print(f"Total Subjects: {len(subjs)}")
    
    # Check Class 9 Science
    sci_9 = await subjects_collection.find_one({"name": "Science", "classes": "9"})
    if sci_9:
        chaps = await chapters_collection.find({"subject_id": str(sci_9["_id"]), "student_class": "9"}).to_list(10)
        print(f"Class 9 Science Chapters: {len(chaps)}")
        if chaps:
            chap_id = str(chaps[0]["_id"])
            # Test auto-discovery
            topics = await get_topics(chap_id)
            print(f"Auto-discovered topics for '{chaps[0]['name']}': {len(topics)}")
            if topics:
                # Test dynamic content generation (mock AI might be used)
                topic_id = topics[0]["id"]
                content = await get_topic(topic_id)
                print(f"Dynamic content for '{topics[0]['name']}': {len(content.get('explanation', ''))} chars")

if __name__ == "__main__":
    asyncio.run(verify())
