'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DailyQCStatus from '@/components/DailyQCStatus';

export default function DailyQCStatusPage() {
  const { user, loading, userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!userData?.isAdmin && userData?.team !== 'Sampling' && userData?.team !== 'Viewer') {
        router.push('/'); // Redirect to home if not admin or not in Sampling team or Viewer
      }
    }
  }, [user, loading, userData, router]);

  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!userData || (!userData.isAdmin && userData.team !== 'Sampling' && userData.team !== 'Viewer')) {
    return null;
  }

  return <DailyQCStatus />;
} 