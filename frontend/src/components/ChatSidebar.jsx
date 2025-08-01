import { useState, useEffect } from 'react';
import axios from 'axios';
import { usePlatform } from '../contexts/PlatformContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ChatSidebar({ currentThreadId, onThreadSelect, onNewChat }) {
  const { settings } = usePlatform();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThreads();
  }, []);

  const fetchThreads = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/chat/threads`);
      setThreads(response.data.threads);
    } catch (error) {
      console.error('Failed to fetch threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteThread = async (threadId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/chat/threads/${threadId}`);
      setThreads(threads.filter(t => t.id !== threadId));
      if (currentThreadId === threadId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-72 bg-gray-900 h-full flex flex-col border-r border-gray-800">
      <div className="p-4 border-b border-gray-800">
        {/* Site Logo */}
        <div className="flex items-center justify-center mb-4">
          {settings.logo_url ? (
            <img 
              src={`${API_BASE_URL}${settings.logo_url}`}
              alt={settings.site_name}
              className="h-10 w-auto"
            />
          ) : (
            <h1 
              className="text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, ${settings.primary_color}, ${settings.primary_color}dd)`
              }}
            >
              {settings.site_name}
            </h1>
          )}
        </div>
        
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-medium transition-all transform hover:scale-105 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500 text-sm">No conversations yet</p>
            <p className="text-gray-600 text-xs mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="space-y-2">
            {threads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => onThreadSelect(thread.id)}
                className={`group relative flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  currentThreadId === thread.id
                    ? 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30'
                    : 'hover:bg-gray-800/50 border border-transparent'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`w-2 h-2 rounded-full ${
                    currentThreadId === thread.id ? 'bg-blue-500' : 'bg-gray-600'
                  }`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-100 truncate">
                    {thread.title || 'Untitled Chat'}
                  </h3>
                  {thread.last_message && (
                    <p className="text-xs text-gray-400 truncate mt-1">
                      {thread.last_message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">
                    {formatDate(thread.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteThread(thread.id, e)}
                  className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-700/50 rounded-lg transition-all"
                >
                  <svg className="w-4 h-4 text-gray-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}