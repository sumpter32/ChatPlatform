import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const PlatformContext = createContext({});

// Smart backend URL detection - same as App.jsx
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  
  // If accessing directly via localhost, use localhost backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  
  // If accessing via Cloudflare tunnel, use HTTPS through the tunnel
  return 'https://jesus.stevensumpter.com';
};

const API_BASE_URL = getApiBaseUrl();

export function PlatformProvider({ children }) {
  const [settings, setSettings] = useState({
    site_name: 'AI Chat Platform',
    footer_text: '© 2024 AI Chat Platform',
    primary_color: '#3B82F6',
    logo_url: null,
    favicon_url: null,
    custom_css: '',
    welcome_title: 'Welcome to AI Chat Platform',
    welcome_description: 'Choose an AI assistant to begin your conversation. Each assistant has unique capabilities tailored to help you.'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping platform settings fetch');
        setLoading(false);
        return;
      }

      console.log('Fetching platform settings from:', `${API_BASE_URL}/api/settings/platform`);
      const response = await axios.get(`${API_BASE_URL}/api/settings/platform`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Platform settings response:', response.data);

      if (response.data.settings) {
        const updatedSettings = {
          ...settings,
          ...response.data.settings
        };
        console.log('Updated platform settings:', updatedSettings);
        setSettings(updatedSettings);
      }
    } catch (error) {
      console.error('Failed to fetch platform settings:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  // Apply custom CSS
  useEffect(() => {
    if (settings.custom_css) {
      const styleId = 'platform-custom-css';
      let styleElement = document.getElementById(styleId);
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = settings.custom_css;
    }
  }, [settings.custom_css]);

  // Apply favicon
  useEffect(() => {
    if (settings.favicon_url) {
      const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'icon';
      link.href = `${API_BASE_URL}${settings.favicon_url}`;
      document.head.appendChild(link);
    }
  }, [settings.favicon_url]);

  // Apply site title
  useEffect(() => {
    if (settings.site_name) {
      document.title = settings.site_name;
    }
  }, [settings.site_name]);

  // Generate CSS variables for theme colors
  useEffect(() => {
    if (settings.primary_color) {
      const root = document.documentElement;
      root.style.setProperty('--primary-color', settings.primary_color);
      
      // Generate color variations
      const hex = settings.primary_color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      
      // Lighter variant
      root.style.setProperty('--primary-color-light', `rgba(${r}, ${g}, ${b}, 0.1)`);
      // Darker variant
      root.style.setProperty('--primary-color-dark', `rgba(${r * 0.8}, ${g * 0.8}, ${b * 0.8}, 1)`);
    }
  }, [settings.primary_color]);

  const refreshSettings = () => {
    fetchSettings();
  };

  return (
    <PlatformContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}