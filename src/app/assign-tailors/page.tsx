'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/hooks/useAuth';
import TailorAssignment from '../../components/TailorAssignment';
import { useRouter } from 'next/navigation';
import Alert from '../../components/Alert';
import Sidebar from '../../components/Sidebar';
import { Menu } from 'lucide-react';

export default function AssignTailorsPage() {
  const { user, loading } = useAuth();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleUnsavedChanges = (unsavedChanges: boolean) => {
    setHasUnsavedChanges(unsavedChanges);
  };

  const handleNavigation = (path: string) => {
    if (hasUnsavedChanges) {
      setShowAlert(true);
      setPendingNavigation(path);
    } else {
      router.push(path);
    }
  };

  const handleAlertClose = () => {
    setShowAlert(false);
    setPendingNavigation(null);
  };

  const handleAlertConfirm = () => {
    setShowAlert(false);
    if (pendingNavigation) {
      router.push(pendingNavigation);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={handleNavigation}
      />
      {showAlert && (
        <Alert
          message="You have unsaved changes. Are you sure you want to leave this page?"
          type="warning"
          onClose={handleAlertClose}
          onConfirm={handleAlertConfirm}
        />
      )}
      <div className="p-4">
        <div className="flex items-center mb-4">
          <button onClick={toggleSidebar} className="mr-4">
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-bold">Assign Tailors</h1>
        </div>
        <main>
          <TailorAssignment topControls={true} onUnsavedChanges={handleUnsavedChanges} />
        </main>
      </div>
    </div>
  );
}
