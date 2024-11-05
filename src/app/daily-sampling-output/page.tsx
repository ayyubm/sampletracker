'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import DailySamplingOutput from '@/components/DailySamplingOutput';

export default function DailySamplingOutputPage() {
  const { userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!userData) {
      router.push('/login');
      return;
    }

    if (!userData.isAdmin && userData.team !== 'Sampling') {
      router.push('/');
      return;
    }
  }, [userData, router]);

  if (!userData || (!userData.isAdmin && userData.team !== 'Sampling')) {
    return null;
  }

  return <DailySamplingOutput />;
} 