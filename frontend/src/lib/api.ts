import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    // Get Clerk token from window
    const token = await (window as any).__clerk_token?.();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────
export const authAPI = {
  register: (token: string) =>
    api.post("/auth/register", null, { headers: { Authorization: `Bearer ${token}` } }),
  onboarding: (data: { student_class: string; board: string; language: string }, token: string) =>
    api.post("/auth/onboarding", data, { headers: { Authorization: `Bearer ${token}` } }),
  getMe: (token: string) =>
    api.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } }),
  updateProfile: (data: any, token: string) =>
    api.patch("/auth/me", data, { headers: { Authorization: `Bearer ${token}` } }),
};

// ── Content ───────────────────────────────────────────────────────────
export const contentAPI = {
  getSubjects: async (studentClass?: string, board?: string) => {
    try {
      const res = await api.get("/content/subjects", { params: { student_class: studentClass, board } });
      return res;
    } catch (err) {
      if (typeof window !== "undefined") {
        const { db } = await import("./offline-db");
        let results = await db.subjects.toArray();
        if (studentClass) results = results.filter(s => s.classes.includes(studentClass));
        if (board) results = results.filter(s => s.board === board);
        return { data: results };
      }
      throw err;
    }
  },
  getChapters: async (subjectId: string, studentClass?: string, board?: string) => {
    try {
      const res = await api.get(`/content/subjects/${subjectId}/chapters`, { params: { student_class: studentClass, board } });
      return res;
    } catch (err) {
      if (typeof window !== "undefined") {
        const { db } = await import("./offline-db");
        let results = await db.chapters.where('subject_id').equals(subjectId).toArray();
        if (studentClass) results = results.filter(c => c.student_class === studentClass);
        if (board) results = results.filter(c => c.board === board);
        return { data: results };
      }
      throw err;
    }
  },
  getTopic: async (topicId: string, language: string = "English") => {
    try {
      const res = await api.get(`/content/topics/${topicId}`, { 
        params: { language },
        timeout: 120000 
      });
      return res;
    } catch (err) {
      if (typeof window !== "undefined") {
        const { db } = await import("./offline-db");
        const topic = await db.topics.get({ id: topicId, language });
        if (topic) return { data: topic };
      }
      throw err;
    }
  },
  getTopics: async (chapterId: string) => {
    try {
      const res = await api.get(`/content/chapters/${chapterId}/topics`);
      return res;
    } catch (err) {
      if (typeof window !== "undefined") {
        const { db } = await import("./offline-db");
        const results = await db.topics.where('chapter_id').equals(chapterId).toArray();
        return { data: results };
      }
      throw err;
    }
  },
  getQuestions: (topicId: string) => api.get(`/content/topics/${topicId}/questions`),
};

// ── AI Tutor ──────────────────────────────────────────────────────────
export const aiTutorAPI = {
  chat: (data: {
    message: string;
    session_id?: string;
    topic_id?: string;
    language?: string;
    student_class?: string;
    subject?: string;
    topic_name?: string;
  }, token: string) =>
    api.post("/ai-tutor/chat", data, { 
      headers: { Authorization: `Bearer ${token}` },
      timeout: 120000 
    }),
  getSessions: (token: string) =>
    api.get("/ai-tutor/sessions", { headers: { Authorization: `Bearer ${token}` } }),
  getSessionMessages: (sessionId: string, token: string) =>
    api.get(`/ai-tutor/sessions/${sessionId}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
  explainText: (paragraph: string, subject: string, language: string, token: string) =>
    api.post("/ai-tutor/explain-text", null, {
      params: { paragraph, subject, language },
      headers: { Authorization: `Bearer ${token}` },
    }),
};

// ── Mock Tests ────────────────────────────────────────────────────────
export const mockTestAPI = {
  listTests: (params?: { student_class?: string; test_type?: string; subject?: string }) =>
    api.get("/mock-tests/", { params }),
  getTest: (testId: string) => api.get(`/mock-tests/${testId}`),
  submitTest: (data: any, token: string) =>
    api.post(`/mock-tests/${data.test_id}/submit`, data, { headers: { Authorization: `Bearer ${token}` } }),
  getMyAttempts: (token: string) =>
    api.get("/mock-tests/attempts/my", { headers: { Authorization: `Bearer ${token}` } }),
  getAttemptDetail: (attemptId: string, token: string) =>
    api.get(`/mock-tests/attempts/${attemptId}`, { headers: { Authorization: `Bearer ${token}` } }),
};

// ── Exams ─────────────────────────────────────────────────────────────
export const examAPI = {
  generatePaper: (data: any, token: string) =>
    api.post("/exams/generate", data, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    }),
  getMyPapers: (token: string) =>
    api.get("/exams/my-papers", { headers: { Authorization: `Bearer ${token}` } }),
};

// ── Progress ──────────────────────────────────────────────────────────
export const progressAPI = {
  updateProgress: (data: { topic_id: string; completed: boolean; score?: number; time_spent_seconds: number }, token: string) =>
    api.post("/progress/update", data, { headers: { Authorization: `Bearer ${token}` } }),
  getMyProgress: (token: string) =>
    api.get("/progress/my", { headers: { Authorization: `Bearer ${token}` } }),
  getDashboard: (token: string) =>
    api.get("/progress/dashboard", { headers: { Authorization: `Bearer ${token}` } }),
};

// ── Admin ─────────────────────────────────────────────────────────────
export const adminAPI = {
  getStats: (token: string) =>
    api.get("/admin/stats", { headers: { Authorization: `Bearer ${token}` } }),
  getUsers: (token: string, page: number = 1) =>
    api.get("/admin/users", { params: { page }, headers: { Authorization: `Bearer ${token}` } }),
  uploadQuestions: (file: File, token: string) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/admin/upload-questions", formData, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
    });
  },
};

// ── Textbooks ─────────────────────────────────────────────────────────
export const textbookAPI = {
  listTextbooks: (params?: { student_class?: string; subject_id?: string }) =>
    api.get("/textbooks/", { params }),
  uploadTextbook: (data: FormData, token: string) =>
    api.post("/textbooks/", data, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
    }),
};

// ── Community ─────────────────────────────────────────────────────────
export const communityAPI = {
  getPosts: (subject?: string, skip: number = 0) =>
    api.get("/community/posts", { params: { subject, skip } }),
  createPost: (formData: FormData, token: string) =>
    api.post("/community/posts", formData, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
    }),
  getReplies: (postId: string) =>
    api.get(`/community/posts/${postId}/replies`),
  createReply: (postId: string, formData: FormData, token: string) =>
    api.post(`/community/posts/${postId}/replies`, formData, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
    }),
  deletePost: (postId: string, token: string) =>
    api.delete(`/community/posts/${postId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export default api;
