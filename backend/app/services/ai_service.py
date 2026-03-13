"""AI Tutor service using Groq + LangChain."""
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import HumanMessage, AIMessage
from app.config import get_settings

settings = get_settings()


def get_llm():
    """Get LangChain Groq LLM instance."""
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model_name=settings.GROQ_MODEL,
        temperature=0.7,
        max_tokens=2048,
        request_timeout=60,
    )


def get_llm_exam():
    """Get LangChain Groq LLM with higher token limit for exam generation."""
    return ChatGroq(
        api_key=settings.GROQ_API_KEY,
        model_name=settings.GROQ_MODEL,
        temperature=0.7,
        max_tokens=8000,
        request_timeout=90,
    )


# ── Prompt Templates ──────────────────────────────────────────────────

TUTOR_SYSTEM_PROMPT = """You are a friendly, patient, and encouraging teacher named "Shiksha AI" helping students learn.

CONTEXT:
- Student's Class: {student_class}
- Subject: {subject}
- Current Topic: {topic}
- Preferred Language: {language}

YOUR ROLE:
1. Explain concepts in simple, easy-to-understand language suitable for a Class {student_class} student
2. Use real-world examples that rural Indian students can relate to
3. Break down complex concepts step-by-step
4. Give exam tips and memory tricks
5. Provide practice questions when asked
6. Be encouraging and supportive
7. If the student asks in Hindi or a regional language, respond in that language
8. Use analogies from daily life, farming, nature, and common experiences

RESPONSE GUIDELINES:
- Keep explanations concise but clear
- Use bullet points and numbered lists for clarity
- Include examples after every concept
- If responding in {language}, use simple vocabulary
- End with a quick question to check understanding

Remember: Your goal is to make learning fun and accessible for students in rural India."""

EXAM_QUESTION_PROMPT = """Generate {num_questions} exam questions for:
- Class: {student_class}
- Subject: {subject}
- Chapter: {chapter}
- Topic: {topic}
- Difficulty: {difficulty}
- Question Types: {question_types}
- Exam Pattern: {test_type}

DIFFICULTY CALIBRATION:
- Easy: Direct formula/definition based, single-step problems, NCERT examples
- Medium: Application-based, 2-3 step problems, moderate conceptual understanding
- Hard: Multi-concept integration, 4+ step problems, previous year IIT/NEET level, tricky options, requires deep understanding

EXAM PATTERN RULES:

If {test_type} is "JEE":
  - JEE Main Pattern: 20 MCQs (4 marks each, -1 for wrong) + 5 Numerical (4 marks each, no negative)
  - Each MCQ must have exactly 4 options with only ONE correct answer
  - Questions must test conceptual depth and application
  - Include problems requiring formula derivation and multi-step reasoning
  - Difficulty should match IIT JEE level
  - Total marks: MCQ section = 80, Numerical section = 20
  - For MCQ: marks=4, for Numerical: marks=4
  - Add "negative_marking": true for MCQs, false for Numerical

If {test_type} is "NEET":
  - NEET Pattern: All MCQs with 4 options each, only ONE correct answer
  - Section A: 35 questions (4 marks each, -1 for wrong) — all compulsory
  - Section B: 15 questions (4 marks each, -1 for wrong) — attempt any 10
  - Questions must be strictly NCERT-based
  - Focus on factual accuracy, diagrams, and biological/chemical concepts
  - Physics questions should be calculation-based but not overly complex
  - Biology should cover both Botany and Zoology
  - marks=4 for all, "negative_marking": true

If {test_type} is "Chapter Test" or "Mock Test":
  - Follow CBSE/State Board pattern
  - Mix of MCQ (1 mark), Short Answer (2-3 marks), Long Answer (5 marks)
  - Questions should be from the specific chapter mentioned
  - Include application-based HOTS (Higher Order Thinking Skills) questions

For each question provide:
1. question_text: The question (clear, unambiguous)
2. question_type: MCQ, Numerical, or Short Answer
3. options: (for MCQ only) exactly 4 options as a list
4. correct_answer: The correct answer
5. explanation: Brief but clear explanation
6. marks: As per pattern above
7. negative_marking: true/false (true for JEE MCQ, NEET MCQ)

Respond in valid JSON format as a list of question objects.
IMPORTANT: Generate EXACTLY {num_questions} questions at {difficulty} difficulty.
"""

TEXTBOOK_EXPLAIN_PROMPT = """A Class {student_class} student has highlighted the following paragraph from their {subject} textbook and wants help understanding it:

---
{paragraph}
---

Please:
1. Explain what this paragraph means in very simple language
2. Give a real-world example
3. Highlight any important terms or formulas
4. Give an exam tip related to this content

Respond in {language}."""


def build_tutor_chain(
    student_class: str = "10",
    subject: str = "General",
    topic: str = "General",
    language: str = "English",
    chat_history: list = None,
):
    """Build a LangChain conversation chain for the AI tutor."""
    llm = get_llm()

    prompt = ChatPromptTemplate.from_messages([
        ("system", TUTOR_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ])

    chain = prompt | llm

    history_messages = []
    if chat_history:
        for msg in chat_history:
            if msg["role"] == "user":
                history_messages.append(HumanMessage(content=msg["content"]))
            else:
                history_messages.append(AIMessage(content=msg["content"]))

    return chain, history_messages, {
        "student_class": student_class,
        "subject": subject,
        "topic": topic,
        "language": language,
    }


async def generate_tutor_response(
    message: str,
    student_class: str = "10",
    subject: str = "General",
    topic: str = "General",
    language: str = "English",
    chat_history: list = None,
) -> str:
    """Generate an AI tutor response with retry logic."""
    import asyncio
    chain, history_messages, params = build_tutor_chain(
        student_class, subject, topic, language, chat_history
    )

    max_retries = 2
    retry_delay = 1
    last_error = None

    for attempt in range(max_retries):
        try:
            response = await chain.ainvoke({
                "input": message,
                "chat_history": history_messages,
                **params,
            })
            return response.content
        except Exception as e:
            last_error = str(e)
            if "429" in str(e): # Rate limit
                print(f"[AI-TUTOR] Rate limit hit. Retrying in {retry_delay}s...")
                await asyncio.sleep(retry_delay)
                retry_delay += 2
                continue
            break # Non-retryable error
            
    raise Exception(f"Failed to generate tutor response: {last_error}")


async def generate_exam_questions(
    student_class: str,
    subject: str,
    chapter: str = "",
    topic: str = "",
    difficulty: str = "Medium",
    question_types: str = "MCQ, Short Answer, Numerical",
    num_questions: int = 20,
    language: str = "English",
    test_type: str = "Chapter Test",
) -> str:
    """Generate exam questions using AI with retry logic."""
    llm = get_llm_exam()
    import asyncio
    import time

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert exam paper setter for Indian school board exams. Always respond with raw valid JSON only. No markdown, no code blocks."),
        ("human", EXAM_QUESTION_PROMPT),
    ])

    chain = prompt | llm
    
    max_retries = 3
    retry_delay = 2
    
    last_error = None
    for attempt in range(max_retries):
        try:
            response = await chain.ainvoke({
                "student_class": student_class,
                "subject": subject,
                "chapter": chapter,
                "topic": topic,
                "difficulty": difficulty,
                "question_types": question_types,
                "num_questions": num_questions,
                "language": language,
                "test_type": test_type,
            })
            
            content = response.content.strip()
            # Clean up formatting noise
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            # Simple validation: should look like a JSON list
            if content.startswith("[") and content.endswith("]"):
                return content
            
            # If not a list, maybe it's wrapped in an object?
            if content.startswith("{") and content.endswith("}"):
                return content
                
            last_error = f"Invalid format: {content[:100]}..."
        except Exception as e:
            last_error = str(e)
            if "429" in str(e): # Rate limit
                print(f"[AI-SYNC] Rate limit hit. Retrying in {retry_delay}s...")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2
                continue
            break # Non-retryable error
            
    raise Exception(f"Failed to generate questions after {max_retries} attempts. Last error: {last_error}")


async def generate_topic_content(
    student_class: str,
    subject: str,
    chapter: str,
    topic: str,
    language: str = "English",
) -> dict:
    """Generate detailed topic content (explanation and examples) using AI."""
    llm = get_llm()
    
    system_prompt = """You are an expert In1. Explain concepts simply for students in rural India.
2. Use real-world Indian examples (farming, village life, common tools).
3. Use plain text only. NO markdown, NO #, NO **, NO bold.
4. Output MUST be valid JSON."""

    human_prompt = """Generate detailed learning content for:
- Subject: {subject}
- Chapter: {chapter}
- Topic: {topic}
- Class: {student_class}
- Language: {language}

REQUIRED JSON FORMAT (return ONLY this JSON):
{{
  "explanation": "A highly detailed, structured point-wise explanation organized under clear section headings. Follow the EXPLANATION FORMAT RULES below strictly.",
  "examples": "Provide exactly 3 real-world Indian context examples with step-by-step solutions. MINIMUM 100 words per example."
}}

EXPLANATION FORMAT RULES (VERY IMPORTANT):
- Start with a one-line definition of the topic.
- Organize the content into clear sections using plain text headings like: Definition, Key Concepts, Core Mechanisms, Formulas (if any), and Important Points to Remember.
- Use a colon after each heading.
- Under EVERY heading, write content exclusively as numbered points (1. 2. 3. etc).
- EACH numbered point must be a single, concise sentence or a single fact. Do NOT write paragraphs anywhere.
- Provide a deep dive into the topic. Include at least 15 to 20 distinct numbered points across all your sections.
- Use simple language that a rural Indian student can easily understand.
- Use the literal string '\\n' (backslash followed by n) to separate sections and points inside the JSON string. Do NOT use actual unescaped newlines.
- NO paragraphs allowed. Only headings and bullet/numbered points.

IMPORTANT JSON RULES: 
- DO NOT use markdown symbols (#, **, etc.).
- Use double quotes for JSON keys and values.
- Escape any double quotes inside the text with a backslash (\\").
- DO NOT use placeholders like "coming soon" or "heavy load".
- Return ONLY the raw JSON object.
- If topic is for Class 11, ensure the depth is highly appropriate for Class 11 {subject}."""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", human_prompt),
    ])

    chain = prompt | llm
    import asyncio
    import json
    import re
    
    max_retries = 5
    retry_delay = 3
    last_error = None
    
    for attempt in range(max_retries):
        try:
            print(f"[AI-CONTENT] Generating for {topic} (Attempt {attempt+1}/{max_retries})...")
            response = await chain.ainvoke({
                "student_class": student_class,
                "subject": subject,
                "chapter": chapter,
                "topic": topic,
                "language": language,
            })

            content = response.content.strip()
            
            # Clean up formatting noise
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            # Extract JSON if extra text exists
            if not (content.startswith("{") and content.endswith("}")):
                json_match = re.search(r'\{.*\}', content, re.DOTALL)
                if json_match:
                    content = json_match.group(0)

            # CLEANUP: Remove trailing commas before closing braces/brackets (common LLM error)
            content = re.sub(r',\s*\}', '}', content)
            content = re.sub(r',\s*\]', ']', content)
            
            # CLEANUP: Remove potential invalid control characters
            content = "".join(char for char in content if ord(char) >= 32 or char in "\n\r\t")

            try:
                parsed = json.loads(content)
            except json.JSONDecodeError as je:
                print(f"[AI-CONTENT] JSON Parse Error: {je}")
                print(f"[AI-CONTENT] Raw Content Sample: {content[:200]}...")
                raise je
            
            # Crucial check: make sure we didn't get "coming soon" in the JSON itself
            expl = parsed.get("explanation", "")
            exs = parsed.get("examples", "")
            
            if "coming soon" in expl.lower() or "coming soon" in exs.lower():
                raise ValueError("AI returned placeholder content")
                
            return parsed
            
        except Exception as e:
            last_error = str(e)
            print(f"[AI-CONTENT] Attempt {attempt+1} failed: {e}")
            if "429" in str(e): # Rate limit
                await asyncio.sleep(retry_delay)
                retry_delay *= 2
                continue
            # Wait briefly and retry
            await asyncio.sleep(1)
            await asyncio.sleep(1)
            continue
            
    # Final fallback if all retries fail
    print(f"[AI-CONTENT] All attempts failed for topic {topic}. Final error: {last_error}")
    return {
        "explanation": "Content generation is currently under heavy load. Please refresh the page in a moment to try again.",
        "examples": "Examples are being prepared. Please refresh the page in a moment."
    }


async def explain_textbook_paragraph(
    paragraph: str,
    student_class: str = "10",
    subject: str = "General",
    language: str = "English",
) -> str:
    """Explain a highlighted textbook paragraph."""
    llm = get_llm()

    prompt = ChatPromptTemplate.from_messages([
        ("human", TEXTBOOK_EXPLAIN_PROMPT),
    ])

    chain = prompt | llm

    response = await chain.ainvoke({
        "paragraph": paragraph,
        "student_class": student_class,
        "subject": subject,
        "language": language,
    })

    return response.content
