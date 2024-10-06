'use client';

import { useAuth } from '../../lib/hooks/useAuth';
import Link from 'next/link';
import TailorAssignment from '../../components/TailorAssignment';
import { Home } from 'lucide-react';

export default function AssignTailorsPage() {
  const { userData } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="flex justify-end mb-4">
        <Link 
          href="/" 
          className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition-colors duration-200"
          title="Back to Home"
        >
          <Home size={24} />
        </Link>
      </header>
      <main className="-mt-12">
        <TailorAssignment topControls={true} />
      </main>
    </div>
  );
}