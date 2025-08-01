import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function WordPressSSO() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('Verifying WordPress login...');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleSSO = async () => {
      const ssoToken = searchParams.get('sso_token');
      const userId = searchParams.get('user_id');

      if (!ssoToken || !userId) {
        setError('Invalid SSO request');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Verify with WordPress first
        const wpSettings = await axios.get(`${API_BASE_URL}/api/settings/wordpress`);
        if (!wpSettings.data.settings?.url) {
          throw new Error('WordPress not configured');
        }

        const wpUrl = wpSettings.data.settings.url.replace(/\/$/, '');
        
        // Verify SSO token with WordPress
        const ssoVerify = await axios.post(`${wpUrl}/wp-json/chatplatform/v1/sso/verify`, {
          token: ssoToken
        });

        if (!ssoVerify.data.valid) {
          throw new Error('Invalid SSO token');
        }

        // Now verify with our backend
        const response = await axios.post(`${API_BASE_URL}/api/wordpress-auth/verify`, {
          sessionToken: ssoToken,
          userId: userId
        });

        if (response.data.success) {
          // Store the token and user info
          localStorage.setItem('token', response.data.token);
          
          // Update auth context
          await login(response.data.token, response.data.user);
          
          setStatus('Login successful! Redirecting...');
          setTimeout(() => navigate('/'), 1500);
        } else {
          throw new Error(response.data.message || 'Authentication failed');
        }
      } catch (error) {
        console.error('SSO error:', error);
        
        if (error.response?.data?.subscription_required) {
          setError('Active subscription required. Please subscribe to access the platform.');
          setTimeout(() => {
            window.location.href = wpSettings.data.settings.url + '/pricing';
          }, 3000);
        } else {
          setError(error.response?.data?.message || error.message || 'SSO authentication failed');
          setTimeout(() => navigate('/login'), 3000);
        }
      }
    };

    handleSSO();
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          {error ? (
            <>
              <h2 className="text-2xl font-bold text-red-600 mb-2">Authentication Failed</h2>
              <p className="text-gray-600">{error}</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">WordPress Single Sign-On</h2>
              <p className="text-gray-600">{status}</p>
              <div className="mt-4">
                <div className="inline-flex items-center">
                  <svg className="animate-spin h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm text-gray-500">Please wait...</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}