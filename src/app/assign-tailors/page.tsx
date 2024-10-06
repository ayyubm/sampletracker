'use client';

import { useAuth } from '../../lib/hooks/useAuth';
import Link from 'next/link';
import TailorAssignment from '../../components/TailorAssignment';

export default function AssignTailorsPage() {
  const { userData } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Assign Tailors</h1>
        <Link href="/" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Back to Home
        </Link>
      </header>
      <main>
        <TailorAssignment topControls={true} />
      </main>
    </div>
  );
}