import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AgentSelector({ selectedAgent, onAgentSelect }) {
  const [agents, setAgents] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/agents`);
      const activeAgents = response.data.agents.filter(agent => agent.active);
      setAgents(activeAgents);
      
      // Select default agent if none selected, otherwise first agent
      if (!selectedAgent && activeAgents.length > 0) {
        const defaultAgent = activeAgents.find(agent => agent.is_default);
        onAgentSelect(defaultAgent || activeAgents[0]);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading agents...</div>;
  }

  if (agents.length === 0) {
    return <div className="text-gray-500">No agents available</div>;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
      >
        {selectedAgent?.icon_url ? (
          <img
            src={`${API_BASE_URL}${selectedAgent.icon_url}`}
            alt={selectedAgent.name}
            className="w-8 h-8 rounded-full object-cover border border-gray-100"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
            {selectedAgent?.name?.charAt(0) || 'A'}
          </div>
        )}
        <div className="text-left">
          <div className="font-medium text-gray-900 text-sm">
            {selectedAgent?.name || 'Select Agent'}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  onAgentSelect(agent);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all text-left ${
                  selectedAgent?.id === agent.id 
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200' 
                    : 'hover:bg-gray-50'
                }`}
              >
                {agent.icon_url ? (
                  <img
                    src={`${API_BASE_URL}${agent.icon_url}`}
                    alt={agent.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-gray-100"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold shadow-sm">
                    {agent.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{agent.name}</div>
                </div>
                {selectedAgent?.id === agent.id && (
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}