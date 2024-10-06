'use client';

import { useAuth } from '../../lib/hooks/useAuth';
import UserManagement from '../../components/UserManagement';

export default function UserManagementPage() {
  const { userData, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userData?.isAdmin) {
    return <div>You do not have permission to access this page.</div>;
  }

  return <UserManagement />;
}