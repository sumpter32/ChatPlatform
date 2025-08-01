import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { usePlatform } from '../contexts/PlatformContext';
import ChatSidebar from '../components/ChatSidebar';
import ChatMessage from '../components/ChatMessage';
import AgentSelector from '../components/AgentSelector';
import ShareModal from '../components/ShareModal';
import ExportModal from '../components/ExportModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Chat() {
  const { user, logout, isAdmin } = useAuth();
  const { settings } = usePlatform();
  const navigate = useNavigate();
  const [currentThreadId, setCurrentThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (threadId) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/chat/threads/${threadId}/messages`);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleThreadSelect = (threadId) => {
    setCurrentThreadId(threadId);
    fetchMessages(threadId);
    setMobileSidebarOpen(false); // Close sidebar on mobile after selection
  };

  const handleNewChat = async () => {
    if (!selectedAgent) {
      alert('Please select an agent first');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/chat/threads`, {
        title: `Chat with ${selectedAgent.name}`,
        agentId: selectedAgent.id
      });
      
      setCurrentThreadId(response.data.threadId);
      setMessages([]);
      setInputMessage('');
      setRefreshSidebar(prev => prev + 1);
      setMobileSidebarOpen(false);
      
      // Fetch messages to get the greeting if any
      fetchMessages(response.data.threadId);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !selectedAgent || !currentThreadId) return;
    
    const userMessage = {
      role: 'user',
      content: inputMessage,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSendingMessage(true);

    // Add a placeholder for the assistant message
    const assistantPlaceholder = {
      id: 'temp-' + Date.now(),
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, assistantPlaceholder]);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/chat/threads/${currentThreadId}/messages`,
        {
          content: userMessage.content,
          agentId: selectedAgent.id
        }
      );
      
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (newMessages[lastIndex].id === assistantPlaceholder.id) {
          newMessages[lastIndex] = response.data.message;
        }
        return newMessages;
      });
      setRefreshSidebar(prev => prev + 1);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.slice(0, -2)); // Remove user and assistant messages
      const errorMessage = error.response?.data?.message || 'Failed to send message. Please try again.';
      alert(errorMessage);
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="h-full bg-gray-50 flex relative">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`${
        mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <ChatSidebar
          key={refreshSidebar}
          currentThreadId={currentThreadId}
          onThreadSelect={handleThreadSelect}
          onNewChat={handleNewChat}
        />
      </div>
      
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Agent Selector - Desktop */}
              <div className="hidden sm:block">
                <AgentSelector
                  selectedAgent={selectedAgent}
                  onAgentSelect={setSelectedAgent}
                />
              </div>
            </div>

            <div className="flex-1"></div>

            <div className="flex items-center gap-2 sm:gap-4">
              {currentThreadId && messages.length > 0 && (
                <div className="flex gap-1 sm:gap-2">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Share conversation"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a3 3 0 10-5.432 0m5.432 0A3 3 0 0112 21m0-6a3 3 0 002.684-4.342M12 15a3 3 0 01-2.684-4.342M12 3a3 3 0 100 6 3 3 0 000-6z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowExportModal(true)}
                    className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Export conversation"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              )}
              
              {/* User Info */}
              {user && (
                <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-200">
                  <span className="text-sm text-gray-700">
                    Welcome, {user.name}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => navigate('/admin')}
                      className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Admin
                    </button>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile Agent Selector */}
          <div className="mt-3 sm:hidden">
            <AgentSelector
              selectedAgent={selectedAgent}
              onAgentSelect={setSelectedAgent}
            />
          </div>

          {/* Mobile User Info */}
          {user && (
            <div className="mt-3 px-4 py-2 bg-gray-50 border-t border-gray-100 sm:hidden">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">
                  Welcome, {user.name}
                </span>
                <div className="flex gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => navigate('/admin')}
                      className="text-gray-700 hover:text-gray-900 px-2 py-1 rounded text-sm font-medium"
                    >
                      Admin
                    </button>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    className="text-gray-700 hover:text-gray-900 px-2 py-1 rounded text-sm font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {!currentThreadId ? (
            <div className="h-full flex items-center justify-center p-4 sm:p-8">
              <div className="text-center max-w-md">
                <div className="mb-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full flex items-center justify-center shadow-lg" style={{
                    backgroundImage: `linear-gradient(to bottom right, ${settings.primary_color}, ${settings.primary_color}dd)`
                  }}>
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                  {settings.welcome_title}
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                  {settings.welcome_description}
                </p>
                {selectedAgent ? (
                  <button
                    onClick={handleNewChat}
                    className="px-6 sm:px-8 py-2.5 sm:py-3 text-white font-medium rounded-full transform hover:scale-105 transition-all shadow-lg text-sm sm:text-base"
                    style={{
                      backgroundColor: settings.primary_color,
                      backgroundImage: `linear-gradient(to right, ${settings.primary_color}, ${settings.primary_color}dd)`
                    }}
                  >
                    Start Chatting with {selectedAgent.name}
                  </button>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-500">
                    Select an agent from the dropdown above to get started
                  </p>
                )}
              </div>
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 text-sm">Loading messages...</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto py-4 sm:py-8">
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  message={message}
                  agentIcon={selectedAgent?.icon_url ? `${API_BASE_URL}${selectedAgent.icon_url}` : null}
                  agentName={selectedAgent?.name}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        {currentThreadId && (
          <div className="border-t border-gray-100 bg-white px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
            <form onSubmit={sendMessage} className="flex gap-2 sm:gap-3 max-w-4xl mx-auto">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Message ${selectedAgent?.name || 'Assistant'}...`}
                disabled={sendingMessage || !selectedAgent}
                className="flex-1 px-4 sm:px-5 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-full text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white disabled:opacity-50 transition-all"
              />
              <button
                type="submit"
                disabled={sendingMessage || !inputMessage.trim() || !selectedAgent}
                className="px-4 sm:px-6 py-2.5 sm:py-3 text-white font-medium rounded-full disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all shadow-md"
                style={{
                  backgroundColor: settings.primary_color,
                  backgroundImage: `linear-gradient(to right, ${settings.primary_color}, ${settings.primary_color}dd)`
                }}
              >
                {sendingMessage ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modals */}
      {showShareModal && (
        <ShareModal
          messages={messages}
          agentName={selectedAgent?.name}
          agentIcon={selectedAgent?.icon_url ? `${API_BASE_URL}${selectedAgent.icon_url}` : null}
          onClose={() => setShowShareModal(false)}
        />
      )}
      
      {showExportModal && (
        <ExportModal
          threadId={currentThreadId}
          messages={messages}
          agentName={selectedAgent?.name}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}