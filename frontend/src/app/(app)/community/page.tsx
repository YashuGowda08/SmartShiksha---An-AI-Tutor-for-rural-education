"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { communityAPI } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  MessageSquare, Image as ImageIcon, Send, User, 
  Clock, MessageCircle, ChevronDown, ChevronUp, AlertCircle,
  X, Paperclip, MoreHorizontal, Reply as ReplyIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Reply {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  image_url?: string;
  created_at: string;
}

interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  content: string;
  image_url?: string;
  subject: string;
  topic: string;
  replies_count: number;
  created_at: string;
  replies?: Reply[];
  showReplies?: boolean;
}

export default function CommunityPage() {
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // New Post State
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState("General");
  const subjects = ["General", "Mathematics", "Science", "English", "Social Science", "Computer Science"];

  useEffect(() => {
    fetchPosts();
  }, [selectedSubject]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await communityAPI.getPosts(selectedSubject);
      setPosts(res.data.map((p: any) => ({ ...p, showReplies: false, replies: [] })));
    } catch (err) {
      console.error(err);
      setError("Failed to load community posts");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewPostImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() && !newPostImage) return;

    setIsPosting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("content", newPostContent);
      formData.append("subject", selectedSubject);
      if (newPostImage) formData.append("image", newPostImage);

      const res = await communityAPI.createPost(formData, token);
      setPosts([{ ...res.data, showReplies: false, replies: [] }, ...posts]);
      setNewPostContent("");
      setNewPostImage(null);
      setImagePreview(null);
    } catch (err) {
      console.error(err);
      alert("Failed to create post. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  const toggleReplies = async (post: Post) => {
    if (!post.showReplies && post.replies?.length === 0 && post.replies_count > 0) {
      try {
        const res = await communityAPI.getReplies(post.id);
        setPosts(posts.map(p => 
          p.id === post.id ? { ...p, showReplies: true, replies: res.data } : p
        ));
      } catch (err) {
        console.error(err);
      }
    } else {
      setPosts(posts.map(p => 
        p.id === post.id ? { ...p, showReplies: !p.showReplies } : p
      ));
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-indigo-600" />
            {t("community")}
          </h1>
          <p className="text-slate-500">Ask questions, share knowledge, and learn together.</p>
        </div>
        
        {/* Subject Tabs */}
        <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 scrollbar-none">
          {subjects.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubject(sub)}
              className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition ${
                selectedSubject === sub 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>

      {/* New Post Card */}
      <div className="card overflow-hidden mb-8 border-indigo-100 shadow-indigo-100/50">
        <form onSubmit={submitPost}>
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="Share a doubt or something you learned..."
            className="w-full bg-transparent border-none focus:ring-0 p-4 min-h-[120px] text-lg resize-none"
          />
          
          {imagePreview && (
            <div className="px-4 pb-4 relative">
              <img src={imagePreview} alt="Preview" className="max-h-[300px] w-auto rounded-xl border border-slate-200" />
              <button 
                type="button" 
                onClick={() => {setNewPostImage(null); setImagePreview(null);}}
                className="absolute top-2 left-6 bg-slate-800/80 text-white p-1.5 rounded-full hover:bg-slate-900 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 transition flex items-center gap-2"
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Image</span>
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageChange} 
                className="hidden" 
                accept="image/*" 
              />
            </div>
            
            <button
              type="submit"
              disabled={isPosting || (!newPostContent.trim() && !newPostImage)}
              className="px-6 py-2 rounded-xl gradient-primary text-white font-bold shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 transition hover:scale-105 active:scale-95"
            >
              {isPosting ? "Posting..." : "Post"}
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Feed */}
      {loading && posts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading community discussions...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <p className="text-slate-500">{error}</p>
          <button onClick={fetchPosts} className="mt-4 text-indigo-600 font-bold hover:underline">Try Again</button>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 card bg-slate-50 border-dashed">
          <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">No posts yet in {selectedSubject}</h3>
          <p className="text-slate-500">Be the first to start a conversation!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onToggleReplies={() => toggleReplies(post)} onReplyAdded={(reply) => {
              setPosts(posts.map(p => p.id === post.id ? { ...p, replies: [...(p.replies || []), reply], replies_count: p.replies_count + 1 } : p));
            }} />
          ))}
          
          <div className="text-center pt-8">
            <button className="text-indigo-600 font-bold hover:underline transition">Load More Discussions</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PostCard({ post, onToggleReplies, onReplyAdded }: { post: Post, onToggleReplies: () => void, onReplyAdded: (r: Reply) => void }) {
  const { getToken } = useAuth();
  const [replyContent, setReplyContent] = useState("");
  const [replyImage, setReplyImage] = useState<File | null>(null);
  const [replyPreview, setReplyPreview] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReplyImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReplyImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setReplyPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const submitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() && !replyImage) return;

    setIsReplying(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const formData = new FormData();
      formData.append("content", replyContent);
      if (replyImage) formData.append("image", replyImage);

      const res = await communityAPI.createReply(post.id, formData, token);
      onReplyAdded(res.data);
      setReplyContent("");
      setReplyImage(null);
      setReplyPreview(null);
      setShowReplyForm(false);
    } catch (err) {
      console.error(err);
      alert("Failed to reply");
    } finally {
      setIsReplying(false);
    }
  };

  // Convert URLs to absolute if needed
  const getImageUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return `http://localhost:8000${url}`;
  };

  return (
    <div className="card shadow-sm hover:shadow-md transition-all group border-slate-200">
      <div className="p-5">
        {/* Author Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden border border-indigo-200">
              {post.author_avatar ? (
                <img src={post.author_avatar} alt={post.author_name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-indigo-500" />
              )}
            </div>
            <div>
              <div className="font-bold text-slate-800">{post.author_name}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(post.created_at))} ago • {post.subject}
              </div>
            </div>
          </div>
          <button className="p-2 rounded-full hover:bg-slate-100 transition opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="text-slate-700 mb-4 whitespace-pre-wrap leading-relaxed">
          {post.content}
        </div>

        {post.image_url && (
          <div className="mb-4 rounded-xl overflow-hidden border border-slate-100">
            <img 
              src={getImageUrl(post.image_url)!} 
              alt="Post attachment" 
              className="max-h-[500px] w-auto mx-auto object-contain bg-slate-50" 
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
          <button 
            onClick={onToggleReplies}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition text-sm font-medium ${
              post.showReplies ? "bg-indigo-50 text-indigo-600" : "hover:bg-slate-50 text-slate-600"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            {post.replies_count} Replies
            {post.showReplies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          <button 
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition text-sm font-medium text-slate-600"
          >
            <ReplyIcon className="w-4 h-4" />
            Reply
          </button>
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl animate-in slide-in-from-top-2">
            <form onSubmit={submitReply}>
              <textarea
                autoFocus
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write your answer or thoughts..."
                className="w-full bg-transparent border-none focus:ring-0 p-0 mb-3 text-sm resize-none"
              />
              
              {replyPreview && (
                <div className="mb-3 relative inline-block">
                  <img src={replyPreview} alt="Reply preview" className="max-h-[150px] rounded-lg border" />
                  <button type="button" onClick={() => {setReplyImage(null); setReplyPreview(null);}} className="absolute -top-2 -right-2 bg-slate-800 text-white p-1 rounded-full"><X className="w-3 h-3" /></button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-slate-200 text-slate-600 transition">
                  <Paperclip className="w-4 h-4" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleReplyImage} className="hidden" accept="image/*" />
                
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowReplyForm(false)} className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">Cancel</button>
                  <button 
                    type="submit" 
                    disabled={isReplying || (!replyContent.trim() && !replyImage)}
                    className="px-4 py-1.5 text-sm font-bold bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                  >
                    {isReplying ? "..." : "Send Reply"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Replies List */}
        {post.showReplies && (
          <div className="mt-6 space-y-4 pl-4 border-l-2 border-slate-100 animate-in fade-in duration-300">
            {post.replies?.map((reply) => (
              <div key={reply.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0 mt-1">
                  {reply.author_avatar ? (
                    <img src={reply.author_avatar} alt={reply.author_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-800">{reply.author_name}</span>
                      <span className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(reply.created_at))} ago</span>
                    </div>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">{reply.content}</div>
                    {reply.image_url && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-slate-200 inline-block">
                        <img src={getImageUrl(reply.image_url)!} alt="Reply attachment" className="max-h-[250px] w-auto" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {post.replies_count === 0 && (
              <div className="text-center py-4 text-sm text-slate-400">No replies yet. Be the first to answer!</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
