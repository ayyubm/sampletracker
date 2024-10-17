'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/hooks/useAuth';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { app } from '../lib/firebase/firebase'; // Import the Firebase app instance
import Link from 'next/link';
import { Home } from 'lucide-react'; // Import the Home icon
import { Menu } from 'lucide-react'; // Import the Menu icon
import Sidebar from './Sidebar'; // Import the Sidebar component

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  team: string;
  isAdmin: boolean;
}

interface NewUser extends Omit<User, 'id'> {
  password: string;
}

interface EditingUser extends User {
  newPassword?: string;
}

const TEAMS = ['Merchandising', 'Sampling', 'Fabric', 'Trims', 'Warehouse', 'Management', 'Admin'];

const UserManagement: React.FC = () => {
  const { userData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState<NewUser>({
    email: '',
    firstName: '',
    lastName: '',
    team: '',
    isAdmin: false,
    password: '',
  });
  const [editingUser, setEditingUser] = useState<EditingUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Initialize Firestore
  const db = getFirestore(app);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const usersCollection = collection(db, 'users');
    const userSnapshot = await getDocs(usersCollection);
    const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    setUsers(userList);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create user');
      }

      setNewUser({ email: '', firstName: '', lastName: '', team: '', isAdmin: false, password: '' });
      fetchUsers();
    } catch (error: any) {
      console.error("Error adding new user:", error);
      setError(error.message);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      try {
        // Update user in Firestore
        const { newPassword, ...userWithoutPassword } = editingUser;
        await setDoc(doc(db, 'users', editingUser.id), userWithoutPassword, { merge: true });

        // Update email in Firebase Authentication if it has changed
        if (editingUser.email !== users.find(u => u.id === editingUser.id)?.email) {
          const response = await fetch('/api/update-user-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: editingUser.id, newEmail: editingUser.email }),
          });
          if (!response.ok) {
            throw new Error('Failed to update email in Authentication');
          }
        }

        // Update password if a new one is provided
        if (newPassword) {
          const response = await fetch('/api/change-user-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: editingUser.id, newPassword }),
          });
          if (!response.ok) {
            throw new Error('Failed to update password');
          }
        }

        setEditingUser(null);
        fetchUsers();
      } catch (error: any) {
        console.error("Error updating user:", error);
        setError(error.message);
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Delete user from Firebase Authentication
      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete user from Authentication');
      }

      // Delete user from Firestore
      await deleteDoc(doc(db, 'users', userId));

      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      setError("Failed to delete user. Please try again.");
    }
  };

  const startEditing = (user: User) => {
    setEditingUser(user);
  };

  if (!userData?.isAdmin) {
    return <div>You do not have permission to access this page.</div>;
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="p-6">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex items-center mb-4">
        <button onClick={toggleSidebar} className="mr-4">
          <Menu size={24} />
        </button>
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      <form onSubmit={handleAddUser} className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Add New User</h2>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            className="p-2 border rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            className="p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="First Name"
            value={newUser.firstName}
            onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
            className="p-2 border rounded"
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={newUser.lastName}
            onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
            className="p-2 border rounded"
            required
          />
          <div className="flex items-center space-x-4">
            <select
              value={newUser.team}
              onChange={(e) => setNewUser({ ...newUser, team: e.target.value })}
              className="p-2 border rounded w-40" // Changed from flex-grow to w-40
              required
            >
              <option value="">Select Team</option>
              {TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
            <label className="flex items-center flex-grow"> {/* Added flex-grow here */}
              <input
                type="checkbox"
                checked={newUser.isAdmin}
                onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })}
                className="mr-2"
              />
              Is Admin
            </label>
          </div>
        </div>
        <button type="submit" className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
          Add User
        </button>
      </form>
      <h2 className="text-xl font-semibold mb-2">User List</h2>
      <div className="overflow-x-auto">
        <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-200 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">First Name</th>
                <th className="p-2 text-left">Last Name</th>
                <th className="p-2 text-left">Team</th>
                <th className="p-2 text-left">Admin</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b">
                  {editingUser && editingUser.id === user.id ? (
                    <>
                      <td className="p-2">
                        <input
                          type="email"
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                          className="w-full p-1 border rounded"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={editingUser.firstName}
                          onChange={(e) => setEditingUser({ ...editingUser, firstName: e.target.value })}
                          className="w-full p-1 border rounded"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={editingUser.lastName}
                          onChange={(e) => setEditingUser({ ...editingUser, lastName: e.target.value })}
                          className="w-full p-1 border rounded"
                        />
                      </td>
                      <td className="p-2">
                        <select
                          value={editingUser.team}
                          onChange={(e) => setEditingUser({ ...editingUser, team: e.target.value })}
                          className="w-full p-1 border rounded"
                        >
                          {TEAMS.map((team) => (
                            <option key={team} value={team}>
                              {team}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={editingUser.isAdmin}
                          onChange={(e) => setEditingUser({ ...editingUser, isAdmin: e.target.checked })}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="password"
                          placeholder="New Password (optional)"
                          value={editingUser.newPassword || ''}
                          onChange={(e) => setEditingUser({ ...editingUser, newPassword: e.target.value })}
                          className="w-full p-1 border rounded mb-2"
                        />
                        <button
                          onClick={handleUpdateUser}
                          className="bg-green-500 text-white px-2 py-1 rounded mr-2"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="bg-gray-500 text-white px-2 py-1 rounded"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2">{user.email}</td>
                      <td className="p-2">{user.firstName}</td>
                      <td className="p-2">{user.lastName}</td>
                      <td className="p-2">{user.team}</td>
                      <td className="p-2">{user.isAdmin ? 'Yes' : 'No'}</td>
                      <td className="p-2">
                        <button
                          onClick={() => startEditing(user)}
                          className="bg-yellow-500 text-white px-2 py-1 rounded mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="bg-red-500 text-white px-2 py-1 rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
