# Smart Shiksha 🎓🚀

Smart Shiksha is an AI-powered educational platform designed specifically for students in rural India. It provides high-quality, structured, and easy-to-understand learning materials, dynamic exam paper generation, mock tests, and an interactive AI tutor, bridging the educational gap for students in remote areas.

## Features ✨

*   **AI-Powered Topic Explanations:** Deep dives into educational topics (e.g., Physics, Chemistry, Math) structured in clear, point-wise lists specifically tailored for rural Indian students.
*   **Dynamic Exam Generation:** Instantly generate exam papers matching patterns like JEE, NEET, or Chapter Tests with a customizable number of questions.
*   **Interactive AI Tutor:** Ask questions and get conversational help using advanced AI (powered by Llama 3).
*   **Mock Tests:** Take timed mock tests and evaluate your performance in real-time.
*   **Admin Panel:** Secure, role-based admin dashboard to manage users, content, and system settings.
*   **Community:** Connect with other students, ask questions, and share knowledge.

## Tech Stack 🛠️

*   **Frontend:** Next.js (React), Tailwind CSS, TypeScript
*   **Backend:** FastAPI (Python)
*   **Database:** MongoDB
*   **Authentication:** Clerk
*   **AI Integration:** LangChain & Groq (Llama 3.3 70B Versatile)

## Getting Started 🚀

### Prerequisites
*   Node.js (for frontend)
*   Python 3.9+ (for backend)
*   MongoDB instance
*   Clerk Account (for Auth)
*   Groq API Key (for AI)

### Backend Setup
1.  Navigate to the `backend` directory.
2.  Create a virtual environment: `python -m venv venv`
3.  Activate it: `source venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows).
4.  Install dependencies: `pip install -r requirements.txt`
5.  Set up environment variables in `backend/.env` (see `.env.example` if applicable).
6.  Run the server: `python -m uvicorn app.main:app --reload`

### Frontend Setup
1.  Navigate to the `frontend` directory.
2.  Install dependencies: `npm install`
3.  Set up environment variables in `frontend/.env.local`.
4.  Run the development server: `npm run dev`

## Deployment 🌍

The application is structured to be easily deployable on modern cloud platforms.
*   **Frontend:** Vercel or Netlify.
*   **Backend:** Render, Railway, or Heroku.
*   **Database:** MongoDB Atlas.

Ensure that CORS settings in the backend (`ALLOWED_ORIGINS`) and API URLs in the frontend (`NEXT_PUBLIC_API_URL`) are correctly updated for production environments.

---
Built with ❤️ for education.
