import { useState } from 'react';
import { useAuth } from '../lib/hooks/useAuth';
import { createUser } from '../lib/firebase/firebaseUtils';

export default function UserCreationForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    isAdmin: false,
  });
  const [error, setError] = useState('');
  const { userData } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Pass the admin user data to the createUser function
      await createUser(formData, { email: userData.email, password: userData.password });
      onSuccess();
      // Clear the form
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        isAdmin: false,
      });
    } catch (error) {
      setError('An error occurred while creating the user: ' + error.message);
    }
  };

  // ... rest of the component (form inputs, etc.)
}