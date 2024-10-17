'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { useAuth } from '../lib/hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { userData } = useAuth();

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-col w-full">
        <header className="bg-white shadow-sm z-10">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center">
              <button onClick={toggleSidebar} className="mr-4">
                <Menu size={24} />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Garment Sample Tracker</h1>
            </div>
            <span className="text-sm">
              Welcome, {userData?.firstName || 'User'}
              {userData?.isAdmin && <span className="ml-2 text-sm text-green-500">(Admin)</span>}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
