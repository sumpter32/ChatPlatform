import { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function InstallWizard({ onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [dbConfig, setDbConfig] = useState({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: '',
    database: 'chatplatform'
  });
  
  const [adminUser, setAdminUser] = useState({
    name: '',
    email: '',
    password: ''
  });
  
  const [createAdmin, setCreateAdmin] = useState(true);

  const testConnection = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/install/test-connection`, dbConfig);
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setStep(2);
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/api/install/setup`, {
        dbConfig,
        adminUser: createAdmin ? adminUser : null
      });
      
      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          onComplete();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
            <h2 className="text-3xl font-bold text-white">
              Welcome to AI Chat Platform
            </h2>
            <p className="mt-2 text-blue-100">
              Let's get your platform up and running
            </p>
          </div>

          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${step >= 1 ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-300'}`}>
                  {step > 1 ? '✓' : '1'}
                </div>
                <span className={`ml-3 font-medium ${step >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                  Database Setup
                </span>
              </div>
              
              <div className="flex-1 mx-4">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-500 ${step > 1 ? 'w-full' : 'w-0'}`} />
                </div>
              </div>
              
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${step >= 2 ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-300'}`}>
                  2
                </div>
                <span className={`ml-3 font-medium ${step >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                  Admin Account
                </span>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="ml-3 text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="ml-3 text-sm text-green-800">
                  {step === 1 ? 'Database connection successful!' : 'Setup completed successfully!'}
                </p>
              </div>
            )}

            {step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); testConnection(); }}>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-1">
                      Database Host
                    </label>
                    <input
                      id="host"
                      name="host"
                      type="text"
                      required
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="localhost"
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({...dbConfig, host: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-1">
                        Port
                      </label>
                      <input
                        id="port"
                        name="port"
                        type="text"
                        required
                        className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="3306"
                        value={dbConfig.port}
                        onChange={(e) => setDbConfig({...dbConfig, port: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="database" className="block text-sm font-medium text-gray-700 mb-1">
                        Database Name
                      </label>
                      <input
                        id="database"
                        name="database"
                        type="text"
                        required
                        className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="chatplatform"
                        value={dbConfig.database}
                        onChange={(e) => setDbConfig({...dbConfig, database: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      id="user"
                      name="user"
                      type="text"
                      required
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="root"
                      value={dbConfig.user}
                      onChange={(e) => setDbConfig({...dbConfig, user: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter password"
                      value={dbConfig.password}
                      onChange={(e) => setDbConfig({...dbConfig, password: e.target.value})}
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Testing Connection...
                      </span>
                    ) : 'Test Database Connection'}
                  </button>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={(e) => { e.preventDefault(); completeSetup(); }}>
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <input
                        id="create-admin"
                        name="create-admin"
                        type="checkbox"
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={createAdmin}
                        onChange={(e) => setCreateAdmin(e.target.checked)}
                      />
                      <label htmlFor="create-admin" className="ml-3 block text-base font-medium text-gray-900">
                        Create admin account
                      </label>
                    </div>
                    <p className="mt-2 text-sm text-gray-500 ml-8">
                      Recommended for first-time setup to access the admin panel
                    </p>
                  </div>

                  {createAdmin && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="admin-name" className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          id="admin-name"
                          name="name"
                          type="text"
                          required={createAdmin}
                          className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="John Doe"
                          value={adminUser.name}
                          onChange={(e) => setAdminUser({...adminUser, name: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="admin-email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          id="admin-email"
                          name="email"
                          type="email"
                          required={createAdmin}
                          className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="admin@example.com"
                          value={adminUser.email}
                          onChange={(e) => setAdminUser({...adminUser, email: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="admin-password" className="block text-sm font-medium text-gray-700 mb-1">
                          Password
                        </label>
                        <input
                          id="admin-password"
                          name="password"
                          type="password"
                          required={createAdmin}
                          className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                          placeholder="Choose a strong password"
                          value={adminUser.password}
                          onChange={(e) => setAdminUser({...adminUser, password: e.target.value})}
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Minimum 8 characters recommended
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex gap-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 px-4 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Setting up...
                      </span>
                    ) : 'Complete Installation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Need help? Check out our{' '}
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
              installation guide
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}