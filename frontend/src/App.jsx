import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { AuthProvider } from './contexts/AuthContext';
import { PlatformProvider } from './contexts/PlatformContext';
import InstallWizard from './pages/InstallWizard';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Admin from './pages/Admin';
import Dashboard from './pages/admin/Dashboard';
import Agents from './pages/admin/Agents';
import AgentForm from './pages/admin/AgentForm';
import Models from './pages/admin/Models';
import Settings from './pages/admin/Settings';
import TestCSS from './pages/admin/TestCSS';
import WordPressSSO from './pages/WordPressSSO';

// Smart backend URL detection - use tunnel for HTTPS to avoid mixed content
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  
  console.log('Current hostname:', hostname);
  
  // If accessing directly via localhost, use localhost backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // If accessing via Cloudflare tunnel, use HTTPS through the tunnel
  return 'https://jesus.stevensumpter.com';
};

const API_BASE_URL = getApiBaseUrl();
console.log('Using API_BASE_URL:', API_BASE_URL);

function App() {
  const [installed, setInstalled] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkInstallation();
  }, []);

  const checkInstallation = async (retryCount = 0) => {
    try {
      console.log(`Checking installation status (attempt ${retryCount + 1})...`);
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Full URL:', `${API_BASE_URL}/api/install/check`);
      
      // First, let's test if we can reach the health endpoint
      try {
        console.log('Testing health endpoint:', `${API_BASE_URL}/api/health`);
        const healthResponse = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
        console.log('Health check successful:', healthResponse.data);
      } catch (healthError) {
        console.log('Health check failed:', healthError.message);
        console.log('Health check error details:', healthError.response?.status, healthError.response?.data);
      }
      
      const response = await axios.get(`${API_BASE_URL}/api/install/check`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        // Add timestamp to prevent caching
        params: {
          _t: Date.now()
        },
        timeout: 10000 // 10 second timeout
      });
      
      console.log('Installation check response:', response.data);
      setInstalled(response.data.installed);
      
      // Log debug info if not installed
      if (!response.data.installed) {
        console.log('Installation check failed:', response.data.reason);
        if (response.data.debug) {
          console.log('Debug info:', response.data.debug);
        }
        
        // If the server is running but not installed, and this is the first attempt,
        // wait a moment and try again in case routes are still loading
        if (retryCount === 0) {
          console.log('Retrying installation check in 2 seconds...');
          setTimeout(() => {
            setLoading(true); // Reset loading state for retry
            checkInstallation(1);
          }, 2000);
          setLoading(false); // Set loading false while waiting
          return;
        }
      }
    } catch (error) {
      console.error('Failed to check installation:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config,
        request: error.request
      });
      console.error('Full error object:', error);
      
      // If this is the first attempt and we get a connection error,
      // the server might still be starting up
      if (retryCount === 0 && (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET')) {
        console.log('Server might be starting up, retrying in 3 seconds...');
        setTimeout(() => {
          setLoading(true);
          checkInstallation(1);
        }, 3000);
        setLoading(false);
        return;
      }
      
      setInstalled(false);
    } finally {
      // Always set loading to false after the final attempt
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!installed) {
    return <InstallWizard onComplete={() => setInstalled(true)} />;
  }

  return (
    <PlatformProvider>
      <AuthProvider>
        <Router>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/wordpress-sso" element={<WordPressSSO />} />
          <Route path="/" element={<Layout />}>
            <Route
              index
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute requireAdmin>
                  <Admin />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="agents" element={<Agents />} />
              <Route path="agents/new" element={<AgentForm />} />
              <Route path="agents/:id/edit" element={<AgentForm />} />
              <Route path="models" element={<Models />} />
              <Route path="settings" element={<Settings />} />
              <Route path="test" element={<TestCSS />} />
            </Route>
          </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </PlatformProvider>
  );
}

export default App;