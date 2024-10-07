'use client';

import { useState } from 'react';
import { useAuth } from '../../lib/hooks/useAuth';
import Link from 'next/link';
import TailorAssignment from '../../components/TailorAssignment';
import { Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Alert from '../../components/Alert';

export default function AssignTailorsPage() {
  const { userData } = useAuth();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const router = useRouter();

  const handleUnsavedChanges = (unsavedChanges: boolean) => {
    setHasUnsavedChanges(unsavedChanges);
  };

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      setShowAlert(true);
    }
  };

  const handleAlertClose = () => {
    setShowAlert(false);
  };

  const handleAlertConfirm = () => {
    setShowAlert(false);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="flex justify-end mb-4">
        <Link 
          href="/" 
          className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors duration-200"
          title="Back to Home"
          onClick={handleHomeClick}
        >
          <Home size={24} />
        </Link>
      </header>
      {showAlert && (
        <Alert
          message="You have unsaved changes. Are you sure you want to leave this page?"
          type="warning"
          onClose={handleAlertClose}
          onConfirm={handleAlertConfirm}
        />
      )}
      <main className="-mt-12">
        <TailorAssignment topControls={true} onUnsavedChanges={handleUnsavedChanges} />
      </main>
    </div>
  );
}