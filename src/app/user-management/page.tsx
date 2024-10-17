'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/hooks/useAuth';
import UserManagement from '../../components/UserManagement';

export default function UserManagementPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !userData?.isAdmin)) {
      router.push('/login');
    }
  }, [user, userData, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || !userData?.isAdmin) {
    return null;
  }

  return <UserManagement />;
}
