'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '../../components/LoginForm';
import { useAuth } from '../../lib/hooks/useAuth';

export default function LoginPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  return <LoginForm />;
}
