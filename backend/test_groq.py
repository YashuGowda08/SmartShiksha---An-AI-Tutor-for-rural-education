import os
import asyncio
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

async def test_groq():
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    
    print(f"Testing Groq API with model: {model}")
    print(f"API Key starts with: {api_key[:10]}...")
    
    try:
        llm = ChatGroq(
            api_key=api_key,
            model_name=model,
        )
        response = await llm.ainvoke("Say hello")
        print(f"SUCCESS! Response: {response.content}")
    except Exception as e:
        print(f"FAILED! Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_groq())
