import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePlatform } from '../contexts/PlatformContext';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { settings } = usePlatform();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Check if we're on the chat page
  const isChat = location.pathname === '/';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`${isChat ? 'h-screen flex flex-col' : 'min-h-screen bg-gray-50'}`}>

      <main className={isChat ? 'flex-1 overflow-hidden' : 'flex-1'}>
        <Outlet />
      </main>
      
      {/* Footer - only show on non-chat pages */}
      {!isChat && settings.footer_text && (
        <footer className="bg-gray-100 border-t border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-sm text-gray-600">{settings.footer_text}</p>
          </div>
        </footer>
      )}
    </div>
  );
}