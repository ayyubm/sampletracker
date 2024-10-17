'use client';

import React from 'react';
import { useAuth } from '../lib/hooks/useAuth';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onNavigate }) => {
  const { userData, signOut } = useAuth();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      router.push(path);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    handleNavigation('/login');
  };

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
      <div className="flex justify-end p-4">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>
      <nav className="mt-8">
        <button onClick={() => handleNavigation('/')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
          Dashboard
        </button>
        <button onClick={() => handleNavigation('/assign-tailors')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
          Assign Tailors
        </button>
        <button onClick={() => handleNavigation('/daily-tailor-report')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
          Daily Tailor Report
        </button>
        {userData?.isAdmin && (
          <button onClick={() => handleNavigation('/user-management')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
            User Management
          </button>
        )}
        <button
          onClick={handleSignOut}
          className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100"
        >
          Sign Out
        </button>
      </nav>
    </div>
  );
};

export default Sidebar;
