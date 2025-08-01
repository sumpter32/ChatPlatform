import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AgentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [models, setModels] = useState([]);
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    greeting: '',
    prompt_template: '',
    model_id: '',
    max_tokens: 2048,
    temperature: 0.7,
    vision_enabled: false,
    has_pre_prompt: false,
    response_style: 'direct',
    active: true
  });

  useEffect(() => {
    fetchModels();
    if (isEdit) {
      fetchAgent();
    }
  }, [id]);

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/models`);
      setModels(response.data.models.filter(m => m.enabled));
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
  };

  const fetchAgent = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/agents/${id}`);
      const agent = response.data.agent;
      setFormData({
        name: agent.name || '',
        greeting: agent.greeting || '',
        prompt_template: agent.prompt_template || '',
        model_id: agent.model_id || '',
        max_tokens: agent.max_tokens || 2048,
        temperature: agent.temperature || 0.7,
        vision_enabled: agent.vision_enabled || false,
        has_pre_prompt: agent.has_pre_prompt || false,
        response_style: agent.response_style || 'direct',
        active: agent.active !== false
      });
      if (agent.icon_url) {
        setIconPreview(`${API_BASE_URL}${agent.icon_url}`);
      }
    } catch (error) {
      setError('Failed to fetch agent details');
      console.error('Fetch agent error:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleIconChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setIconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIconPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields on frontend
      if (!formData.name || !formData.model_id) {
        setError('Name and model are required fields');
        setLoading(false);
        return;
      }
      
      console.log('Form data being submitted:', formData);
      console.log('Icon file being submitted:', iconFile);
      
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        console.log(`Adding to FormData: ${key} = ${formData[key]}`);
        data.append(key, formData[key]);
      });
      
      if (iconFile) {
        console.log('Adding icon file to FormData:', iconFile.name, iconFile.type, iconFile.size);
        data.append('icon', iconFile);
      }
      
      // Log FormData contents (for debugging)
      for (let pair of data.entries()) {
        console.log('FormData entry:', pair[0], pair[1]);
      }

      if (isEdit) {
        await axios.put(`${API_BASE_URL}/api/agents/${id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.post(`${API_BASE_URL}/api/agents`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      navigate('/admin/agents');
    } catch (error) {
      console.error('Agent form submission error:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to save agent';
      if (error.response?.data) {
        errorMessage = error.response.data.message || errorMessage;
        if (error.response.data.error) {
          errorMessage += ': ' + error.response.data.error;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        {isEdit ? 'Edit Agent' : 'Create New Agent'}
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agent Icon
            </label>
            <div className="flex items-center space-x-4">
              {iconPreview ? (
                <img
                  src={iconPreview}
                  alt="Agent icon preview"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleIconChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Agent Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Jesus, Buddha, Socrates"
            />
          </div>

          <div>
            <label htmlFor="model_id" className="block text-sm font-medium text-gray-700 mb-1">
              Model *
            </label>
            <select
              id="model_id"
              name="model_id"
              required
              value={formData.model_id}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a model</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="greeting" className="block text-sm font-medium text-gray-700 mb-1">
              Greeting Message
            </label>
            <textarea
              id="greeting"
              name="greeting"
              rows="3"
              value={formData.greeting}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="The message users see when they start a conversation..."
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="prompt_template" className="block text-sm font-medium text-gray-700 mb-1">
              Prompt Template *
            </label>
            <textarea
              id="prompt_template"
              name="prompt_template"
              rows="6"
              required
              value={formData.prompt_template}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="You are {agent_name}. You should respond in character..."
            />
            <p className="mt-1 text-sm text-gray-500">
              Use {'{user_message}'} for user input and {'{agent_name}'} for the agent's name
            </p>
          </div>

          <div>
            <label htmlFor="response_style" className="block text-sm font-medium text-gray-700 mb-1">
              Response Style
            </label>
            <select
              id="response_style"
              name="response_style"
              value={formData.response_style}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Response Style</option>
              <option value="helpful">Helpful</option>
              <option value="direct">Direct</option>
              <option value="casual">Casual</option>
              <option value="formal">Formal</option>
              <option value="creative">Creative</option>
              <option value="technical">Technical</option>
              <option value="parables">Parables</option>
              <option value="king_james">King James</option>
            </select>
          </div>

          <div>
            <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
              Temperature ({formData.temperature})
            </label>
            <input
              type="range"
              id="temperature"
              name="temperature"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature}
              onChange={handleInputChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Focused</span>
              <span>Creative</span>
            </div>
          </div>

          <div>
            <label htmlFor="max_tokens" className="block text-sm font-medium text-gray-700 mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              id="max_tokens"
              name="max_tokens"
              min="1"
              max="4096"
              value={formData.max_tokens}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="vision_enabled"
                checked={formData.vision_enabled}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable vision (image uploads)</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="has_pre_prompt"
                checked={formData.has_pre_prompt}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Has pre-prompt</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Active</span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/admin/agents')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (isEdit ? 'Update Agent' : 'Create Agent')}
          </button>
        </div>
      </form>
    </div>
  );
}