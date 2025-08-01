import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Models() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [syncForm, setSyncForm] = useState({
    baseUrl: 'https://chat.openwebui.net',
    apiKey: 'sk-2cd6735854574093afbc03b32c00dd82'
  });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/models`);
      setModels(response.data.models);
    } catch (error) {
      setError('Failed to fetch models');
      console.error('Fetch models error:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncModels = async (e) => {
    e.preventDefault();
    setSyncing(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/models/sync`, syncForm);
      setModels(response.data.models);
      alert(`Successfully synced ${response.data.count} models`);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to sync models');
    } finally {
      setSyncing(false);
    }
  };

  const toggleModel = async (modelId) => {
    try {
      await axios.put(`${API_BASE_URL}/api/models/${modelId}/toggle`);
      fetchModels();
    } catch (error) {
      console.error('Toggle model error:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading models...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Model Management</h2>
        
        {/* Sync Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sync with Open WebUI</h3>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={syncModels} className="space-y-4">
            <div>
              <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Open WebUI Base URL
              </label>
              <input
                id="baseUrl"
                type="url"
                required
                value={syncForm.baseUrl}
                onChange={(e) => setSyncForm({ ...syncForm, baseUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="http://localhost:8080"
              />
              <p className="mt-1 text-sm text-gray-500">
                The URL where your Open WebUI instance is running
              </p>
            </div>

            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                API Key (Optional)
              </label>
              <input
                id="apiKey"
                type="password"
                value={syncForm.apiKey}
                onChange={(e) => setSyncForm({ ...syncForm, apiKey: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter API key if required"
              />
            </div>

            <button
              type="submit"
              disabled={syncing}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              {syncing ? 'Syncing...' : 'Sync Models'}
            </button>
          </form>
        </div>

        {/* Models List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Available Models</h3>
          </div>

          <div className="divide-y divide-gray-200">
            {models.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No models synced yet. Use the form above to sync models from Open WebUI.
              </div>
            ) : (
              models.map((model) => (
                <div key={model.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{model.name}</h4>
                    <p className="text-sm text-gray-500">{model.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Provider: {model.provider} | 
                      Last synced: {model.last_synced ? new Date(model.last_synced).toLocaleString() : 'Never'}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => toggleModel(model.id)}
                    className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      model.enabled
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {model.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}