'use client';

import React from 'react';
import { useAuth } from '../lib/hooks/useAuth';
import { X, Home, Users, Calendar, Settings, FileText, Archive, BarChart, BarChart2, Clipboard, TrendingUp, List, CheckCircle, ClipboardList } from 'lucide-react';
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

  const canAccessAssignTailors = userData?.isAdmin || userData?.team === 'Sampling' || userData?.team === 'Viewer';
  const canAccessDailyOutput = userData?.isAdmin || userData?.team === 'Sampling' || userData?.team === 'Viewer';
  const canAccessArchived = userData?.isAdmin || userData?.team === 'Merchandising' || userData?.team === 'Viewer';

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
      <div className="flex justify-end p-4">
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>
      <nav className="mt-8">
        <button onClick={() => handleNavigation('/')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
          <Home size={18} className="inline-block mr-2" />
          Dashboard
        </button>
        {canAccessAssignTailors && (
          <button onClick={() => handleNavigation('/assign-tailors')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
            <Calendar size={18} className="inline-block mr-2" />
            Assign Tailors
          </button>
        )}
        {canAccessDailyOutput && (
          <button onClick={() => handleNavigation('/daily-sampling-output')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
            <Clipboard size={18} className="inline-block mr-2" />
            Daily Output
          </button>
        )}
        {canAccessDailyOutput && (
          <button onClick={() => handleNavigation('/daily-qc-output')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
            <CheckCircle size={18} className="inline-block mr-2" />
            Daily QC Output
          </button>
        )}
        {canAccessDailyOutput && (
          <button onClick={() => handleNavigation('/daily-qc-status')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
            <ClipboardList size={18} className="inline-block mr-2" />
            Daily QC Status
          </button>
        )}
        <button 
            onClick={() => handleNavigation('/monthly-sampling-report')} 
            className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100"
          >
            <TrendingUp size={18} className="inline-block mr-2" />
            Drill Down Yearly Report
        </button>
        <button onClick={() => handleNavigation('/daily-tailor-report')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
          <FileText size={18} className="inline-block mr-2" />
          Pending Samples Report
        </button>
        <button onClick={() => handleNavigation('/daily-sampling-status')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
          <FileText size={18} className="inline-block mr-2" />
          Daily Sampling Status
        </button>
        <button onClick={() => handleNavigation('/sampling-dashboard')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
          <BarChart size={18} className="inline-block mr-2" />
          Sampling Dashboard
        </button>
        <button onClick={() => handleNavigation('/merchandising-dashboard')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
          <BarChart2 size={18} className="inline-block mr-2" />
          Merchandising Dashboard
        </button>
        {userData?.isAdmin && (
          <button onClick={() => handleNavigation('/buyer-management')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
            <Users size={18} className="inline-block mr-2" />
            Buyer Management
          </button>
        )}
        {userData?.isAdmin && (
          <button onClick={() => handleNavigation('/user-management')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
            <Settings size={18} className="inline-block mr-2" />
            User Management
          </button>
        )}               
        {canAccessArchived && (
          <button onClick={() => handleNavigation('/archived-samples')} className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100">
            <Archive size={18} className="inline-block mr-2" />
            Archived Samples
          </button>
        )}
        <button
          onClick={handleSignOut}
          className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100"
        >
          <X size={18} className="inline-block mr-2" />
          Sign Out
        </button>
      </nav>
    </div>
  );
};

export default Sidebar;
