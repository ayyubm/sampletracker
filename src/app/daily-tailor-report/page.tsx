'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DailyTailorAllotmentReport from '../../components/DailyTailorAllotmentReport';
import { useAuth } from '../../lib/hooks/useAuth';

export default function DailyTailorReportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <DailyTailorAllotmentReport />;
}
