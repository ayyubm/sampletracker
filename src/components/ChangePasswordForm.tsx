import { useState } from 'react';
import { useAuth } from '../lib/hooks/useAuth';

export default function ChangePasswordForm({ userId, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const { userData } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword }),
      });
      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to change password');
      }
    } catch (error) {
      setError('An error occurred while changing the password');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New Password"
        required
      />
      <button type="submit">Change Password</button>
      {error && <p className="text-red-500">{error}</p>}
    </form>
  );
}