import { useState, useEffect } from 'react';
import axios from 'axios';
import { usePlatform } from '../../contexts/PlatformContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Settings() {
  const { refreshSettings } = usePlatform();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('platform');
  
  const [platformSettings, setPlatformSettings] = useState({
    site_name: '',
    footer_text: '',
    primary_color: '#3B82F6',
    custom_css: '',
    welcome_title: 'Welcome to AI Chat Platform',
    welcome_description: 'Choose an AI assistant to begin your conversation. Each assistant has unique capabilities tailored to help you.'
  });

  const [wordpressSettings, setWordpressSettings] = useState({
    url: '',
    api_key: ''
  });

  const [chatplatformApiKey, setChatplatformApiKey] = useState('');
  const [responseStyles, setResponseStyles] = useState([]);
  const [newResponseStyle, setNewResponseStyle] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchResponseStyles = async () => {
    try {
      // Get unique response styles from agents
      const response = await axios.get(`${API_BASE_URL}/api/agents`);
      const agents = response.data.agents;
      const styles = [...new Set(agents.map(agent => agent.response_style).filter(Boolean))];
      
      // Create objects with name and description (description can be enhanced later)
      const styleObjects = styles.map(style => ({
        name: style,
        description: `${style.charAt(0).toUpperCase() + style.slice(1)} response style`
      }));
      
      setResponseStyles(styleObjects);
    } catch (error) {
      console.error('Failed to fetch response styles:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const [platformRes, wpRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/settings/platform`),
        axios.get(`${API_BASE_URL}/api/settings/wordpress`)
      ]);

      if (platformRes.data.settings) {
        setPlatformSettings(prev => ({
          ...prev,
          ...platformRes.data.settings
        }));
      }

      if (wpRes.data.settings) {
        setWordpressSettings(wpRes.data.settings);
      }

      // Get or generate ChatPlatform API key
      const apiKeyResponse = await axios.get(`${API_BASE_URL}/api/settings/chatplatform-api-key`);
      setChatplatformApiKey(apiKeyResponse.data.api_key);
      
      // Fetch response styles
      await fetchResponseStyles();
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePlatformSettings = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put(`${API_BASE_URL}/api/settings/platform`, platformSettings);
      alert('Platform settings saved successfully');
      // Refresh the platform context to apply new settings
      refreshSettings();
    } catch (error) {
      alert('Failed to save platform settings');
    } finally {
      setSaving(false);
    }
  };

  const saveWordpressSettings = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put(`${API_BASE_URL}/api/settings/wordpress`, wordpressSettings);
      alert('WordPress settings saved successfully');
    } catch (error) {
      alert('Failed to save WordPress settings');
    } finally {
      setSaving(false);
    }
  };

  const testWordpressConnection = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/settings/wordpress/test`, wordpressSettings);
      if (response.data.success) {
        alert(`Connection successful! Connected as: ${response.data.user}`);
      }
    } catch (error) {
      const errorData = error.response?.data;
      let message = errorData?.message || 'Unknown error';
      
      if (errorData?.details) {
        message += `\n\nDetails:\n- Status: ${errorData.details.status}\n- Code: ${errorData.details.code}\n- URL: ${errorData.details.url}`;
      }
      
      alert(`Connection failed: ${message}`);
    }
  };

  const checkWordpressAPI = async () => {
    if (!wordpressSettings.url) {
      alert('Please enter a WordPress URL first');
      return;
    }

    try {
      const cleanUrl = wordpressSettings.url.replace(/\/$/, '');
      const response = await axios.get(`${cleanUrl}/wp-json/wp/v2`, { 
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.data) {
        alert(`✓ WordPress REST API is accessible!\n\nSite: ${response.data.name || 'WordPress Site'}\nDescription: ${response.data.description || 'No description'}\nURL: ${response.data.url || cleanUrl}`);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        alert('❌ WordPress REST API not found!\n\nThe REST API might be:\n- Disabled by a plugin\n- Blocked by security settings\n- Using a non-standard URL\n\nCheck your WordPress settings.');
      } else {
        alert(`❌ Cannot access WordPress site\n\nError: ${error.message}\nMake sure the URL is correct and the site is accessible.`);
      }
    }
  };

  const generateNewApiKey = async () => {
    if (!confirm('Are you sure you want to generate a new API key? This will invalidate the old key.')) {
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/settings/chatplatform-api-key/generate`);
      setChatplatformApiKey(response.data.api_key);
      alert('New API key generated! Make sure to update it in your WordPress plugin.');
    } catch (error) {
      alert('Failed to generate new API key');
    }
  };

  const handleFileUpload = async (type, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/settings/platform/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setPlatformSettings(prev => ({
        ...prev,
        [`${type}_url`]: response.data.url
      }));
    } catch (error) {
      alert(`Failed to upload ${type}`);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6">
        <nav className="-mb-px flex flex-wrap space-x-2 sm:space-x-8">
          <button
            onClick={() => setActiveTab('platform')}
            className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === 'platform'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Platform Settings
          </button>
          <button
            onClick={() => setActiveTab('wordpress')}
            className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === 'wordpress'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            WordPress Integration
          </button>
          <button
            onClick={() => setActiveTab('response-styles')}
            className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
              activeTab === 'response-styles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Response Styles
          </button>
        </nav>
      </div>

      {/* Platform Settings */}
      {activeTab === 'platform' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <form onSubmit={savePlatformSettings} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="site_name" className="block text-sm font-medium text-gray-700 mb-1">
                Site Name
              </label>
              <input
                id="site_name"
                type="text"
                value={platformSettings.site_name}
                onChange={(e) => setPlatformSettings({ ...platformSettings, site_name: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="AI Chat Platform"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Logo
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                {platformSettings.logo_url && (
                  <img
                    src={`${API_BASE_URL}${platformSettings.logo_url}`}
                    alt="Site logo"
                    className="h-8 sm:h-12"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files[0] && handleFileUpload('logo', e.target.files[0])}
                  className="block w-full text-xs sm:text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Favicon
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                {platformSettings.favicon_url && (
                  <img
                    src={`${API_BASE_URL}${platformSettings.favicon_url}`}
                    alt="Favicon"
                    className="h-6 w-6 sm:h-8 sm:w-8"
                  />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files[0] && handleFileUpload('favicon', e.target.files[0])}
                  className="block w-full text-xs sm:text-sm text-gray-500 file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-full file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700 mb-1">
                Primary Theme Color
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <input
                  id="primary_color"
                  type="color"
                  value={platformSettings.primary_color}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, primary_color: e.target.value })}
                  className="h-8 w-16 sm:h-10 sm:w-20"
                />
                <input
                  type="text"
                  value={platformSettings.primary_color}
                  onChange={(e) => setPlatformSettings({ ...platformSettings, primary_color: e.target.value })}
                  className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            <div>
              <label htmlFor="footer_text" className="block text-sm font-medium text-gray-700 mb-1">
                Footer Text
              </label>
              <input
                id="footer_text"
                type="text"
                value={platformSettings.footer_text}
                onChange={(e) => setPlatformSettings({ ...platformSettings, footer_text: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="© 2024 Your Company"
              />
            </div>

            <div>
              <label htmlFor="welcome_title" className="block text-sm font-medium text-gray-700 mb-1">
                Welcome Title
              </label>
              <input
                id="welcome_title"
                type="text"
                value={platformSettings.welcome_title}
                onChange={(e) => setPlatformSettings({ ...platformSettings, welcome_title: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Welcome to AI Chat Platform"
              />
            </div>

            <div>
              <label htmlFor="welcome_description" className="block text-sm font-medium text-gray-700 mb-1">
                Welcome Description
              </label>
              <textarea
                id="welcome_description"
                rows="2"
                value={platformSettings.welcome_description}
                onChange={(e) => setPlatformSettings({ ...platformSettings, welcome_description: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Choose an AI assistant to begin your conversation. Each assistant has unique capabilities tailored to help you."
              />
            </div>

            <div>
              <label htmlFor="custom_css" className="block text-sm font-medium text-gray-700 mb-1">
                Custom CSS
              </label>
              <textarea
                id="custom_css"
                rows="4"
                value={platformSettings.custom_css}
                onChange={(e) => setPlatformSettings({ ...platformSettings, custom_css: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="/* Add custom CSS here */"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-sm sm:text-base"
            >
              {saving ? 'Saving...' : 'Save Platform Settings'}
            </button>
          </form>
        </div>
      )}

      {/* WordPress Settings */}
      {activeTab === 'wordpress' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          {/* ChatPlatform API Key Section */}
          <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">ChatPlatform API Key</h3>
            <p className="text-sm text-gray-600 mb-3">
              Copy this API key and add it to your WordPress ChatPlatform plugin settings.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <input
                type="text"
                value={chatplatformApiKey}
                readOnly
                className="flex-1 px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg font-mono text-xs sm:text-sm"
                onClick={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(chatplatformApiKey);
                  alert('API key copied to clipboard!');
                }}
                className="px-3 sm:px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={generateNewApiKey}
                className="px-3 sm:px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
              >
                Regenerate
              </button>
            </div>
          </div>

          <form onSubmit={saveWordpressSettings} className="space-y-4 sm:space-y-6">
            <div>
              <label htmlFor="wp_url" className="block text-sm font-medium text-gray-700 mb-1">
                WordPress Site URL
              </label>
              <input
                id="wp_url"
                type="url"
                value={wordpressSettings.url}
                onChange={(e) => setWordpressSettings({ ...wordpressSettings, url: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="https://yoursite.com"
              />
            </div>

            <div>
              <label htmlFor="wp_api_key" className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                id="wp_api_key"
                type="password"
                value={wordpressSettings.api_key}
                onChange={(e) => setWordpressSettings({ ...wordpressSettings, api_key: e.target.value })}
                className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Enter WordPress API key"
              />
              <p className="mt-1 text-sm text-gray-500">
                Generate an application password in WordPress under Users → Profile → Application Passwords
              </p>
              <div className="mt-2 p-2 sm:p-3 bg-blue-50 rounded-lg text-xs sm:text-sm">
                <p className="font-semibold mb-1">How to set up WordPress authentication:</p>
                <ol className="list-decimal list-inside space-y-1 text-gray-700">
                  <li>Log into WordPress Admin</li>
                  <li>Go to Users → Your Profile</li>
                  <li>Scroll to "Application Passwords" section</li>
                  <li>Enter a name (e.g., "AI Chat Platform")</li>
                  <li>Click "Add New Application Password"</li>
                  <li>Copy the generated password (spaces don't matter)</li>
                  <li>In the API Key field above, enter: <code className="bg-white px-1 py-0.5 rounded text-xs">username:password</code></li>
                  <li>Example: <code className="bg-white px-1 py-0.5 rounded text-xs">admin:xxxx xxxx xxxx xxxx xxxx xxxx</code></li>
                </ol>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-sm sm:text-base"
              >
                {saving ? 'Saving...' : 'Save WordPress Settings'}
              </button>
              
              <button
                type="button"
                onClick={checkWordpressAPI}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
              >
                Check API Status
              </button>
              
              <button
                type="button"
                onClick={testWordpressConnection}
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm sm:text-base"
              >
                Test Connection
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Response Styles */}
      {activeTab === 'response-styles' && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Response Styles Management</h3>
            <p className="text-sm text-gray-600">
              Manage the response styles available for your AI agents. These styles determine how agents communicate with users.
            </p>
          </div>

          {/* Current Response Styles */}
          <div className="mb-8">
            <h4 className="text-md font-semibold text-gray-900 mb-4">Current Response Styles</h4>
            {responseStyles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {responseStyles.map((style, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900 capitalize">{style.name}</h5>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Active
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{style.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-500 text-sm">No response styles found</p>
                <p className="text-gray-400 text-xs mt-1">Create some agents first to see their response styles here</p>
              </div>
            )}
          </div>

          {/* Available Response Style Options */}
          <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-blue-50 rounded-lg">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Available Style Options</h4>
            <p className="text-sm text-gray-600 mb-3">
              When creating or editing agents, you can choose from these response styles:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1 sm:gap-2">
              {['helpful', 'direct', 'casual', 'formal', 'creative', 'technical', 'parables', 'king_james'].map((style) => (
                <span key={style} className="inline-flex items-center justify-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-200 text-center">
                  {style.charAt(0).toUpperCase() + style.slice(1).replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-yellow-800 mb-1">How Response Styles Work</h4>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p>• Response styles are assigned to agents when creating or editing them</p>
                  <p>• They influence how the AI responds to users (tone, formality, etc.)</p>
                  <p>• Users don't see the response style names in the frontend</p>
                  <p>• You can customize the available options by editing the AgentForm component</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}