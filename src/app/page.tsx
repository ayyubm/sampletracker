'use client';

import { useAuth } from '../lib/hooks/useAuth';
import LoginForm from '../components/LoginForm';
import Dashboard from '../components/Dashboard';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-100">
      {user ? <Dashboard /> : <LoginForm />}
    </main>
  );
}
