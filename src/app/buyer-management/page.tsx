'use client';

import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '../../lib/firebase/firebaseUtils';
import { BUYER_OPTIONS } from '../../lib/constants';
import { useAuth } from '../../lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface Buyer {
  id?: string;
  buyerId: string;
  name: string;
}

const BuyerManagement: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [editingBuyer, setEditingBuyer] = useState<Buyer | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const { userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!userData || !userData.isAdmin) {
        router.push('/'); // Redirect non-admin users to the home page
      } else {
        fetchBuyers();
      }
    }
  }, [userData, loading, router]);

  const fetchBuyers = async () => {
    const buyersData = await getDocuments('buyer');
    setBuyers(buyersData as Buyer[]);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getNextBuyerId = (existingBuyers: Buyer[]): string => {
    const maxId = existingBuyers.reduce((max, buyer) => {
      const currentId = parseInt(buyer.buyerId.replace('Buyer', ''));
      return currentId > max ? currentId : max;
    }, 0);
    return `Buyer${(maxId + 1).toString().padStart(4, '0')}`;
  };

  const handleAddBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newBuyerName.trim()) {
      const newBuyerId = getNextBuyerId(buyers);
      const newBuyer: Buyer = { buyerId: newBuyerId, name: newBuyerName.trim() };
      const addedBuyerId = await addDocument('buyer', newBuyer);
      if (typeof addedBuyerId === 'string') {
        setBuyers([...buyers, { ...newBuyer, id: addedBuyerId }]);
      } else {
        console.error('Failed to add buyer');
      }
      setNewBuyerName('');
    }
  };

  const handleEditBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBuyer && editingBuyer.name.trim() && editingBuyer.id) {
      await updateDocument('buyer', editingBuyer.id, { name: editingBuyer.name.trim() });
      setBuyers(buyers.map(b => b.id === editingBuyer.id ? editingBuyer : b));
      setEditingBuyer(null);
    }
  };

  const handleDeleteBuyer = (id: string | undefined) => {
    setDeleteConfirmation(id || null);
  };

  const confirmDelete = async () => {
    if (deleteConfirmation) {
      try {
        await deleteDocument('buyer', deleteConfirmation);
        setBuyers(buyers.filter(b => b.id !== deleteConfirmation));
        setDeleteConfirmation(null);
      } catch (error) {
        console.error('Cannot delete buyer: ', error);
      }
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  const initializeBuyersFromConstants = async () => {
    setIsInitializing(true);
    try {
      for (let i = 0; i < BUYER_OPTIONS.length; i++) {
        const buyerName = BUYER_OPTIONS[i];
        const buyerId = `Buyer${(i + 1).toString().padStart(4, '0')}`;
        const newBuyer: Buyer = { buyerId, name: buyerName };
        await addDocument('buyer', newBuyer);
      }
      await fetchBuyers(); // Refresh the buyers list
    } catch (error) {
      console.error('Error initializing buyers:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!userData || !userData.isAdmin) {
    return null; // This will prevent the component from rendering while redirecting
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="p-4">
        <div className="flex items-center mb-4">
          <button onClick={toggleSidebar} className="mr-4">
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-bold">Buyer Management</h1>
        </div>
        <div className="w-full mx-auto">
          <div className="mb-4 flex items-center space-x-2">
            <input
              type="text"
              value={newBuyerName}
              onChange={(e) => setNewBuyerName(e.target.value)}
              placeholder="Enter new buyer name"
              className="border p-2 flex-grow"
            />
            <button 
              onClick={handleAddBuyer}
              className="bg-blue-500 text-white p-2 rounded whitespace-nowrap"
            >
              Add Buyer
            </button>
            <button 
              onClick={initializeBuyersFromConstants}
              disabled={isInitializing}
              className="bg-green-500 text-white p-2 rounded disabled:bg-green-300 whitespace-nowrap"
            >
              {isInitializing ? 'Initializing...' : 'Initialize Buyers'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              <table className="w-full bg-white shadow-md rounded">
                <thead className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                  <tr>
                    <th className="py-3 px-6 text-left">Sr.</th>
                    <th className="py-3 px-6 text-left">Buyer ID</th>
                    <th className="py-3 px-6 text-left">Name</th>
                    <th className="py-3 px-6 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 text-sm font-light">
                  {buyers.map((buyer, index) => (
                    <tr key={buyer.id} className="border-b border-gray-200 hover:bg-gray-100">
                      <td className="py-3 px-6 text-left whitespace-nowrap">{index + 1}</td>
                      <td className="py-3 px-6 text-left whitespace-nowrap">{buyer.buyerId}</td>
                      <td className="py-3 px-6 text-left whitespace-nowrap">
                        {editingBuyer && editingBuyer.id === buyer.id ? (
                          <input
                            type="text"
                            value={editingBuyer.name}
                            onChange={(e) => setEditingBuyer({ ...editingBuyer, name: e.target.value })}
                            className="border p-1 w-full"
                          />
                        ) : (
                          buyer.name
                        )}
                      </td>
                      <td className="py-3 px-6 text-left">
                        {editingBuyer && editingBuyer.id === buyer.id ? (
                          <>
                            <button onClick={handleEditBuyer} className="text-green-600 hover:text-green-900 mr-2">Save</button>
                            <button onClick={() => setEditingBuyer(null)} className="text-gray-600 hover:text-gray-900">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditingBuyer(buyer)} className="text-blue-600 hover:text-blue-900 mr-2">Edit</button>
                            <button onClick={() => handleDeleteBuyer(buyer.id)} className="text-red-600 hover:text-red-900">Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-xl">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">
              Confirm Deletion
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this buyer? This action cannot be undone.
            </p>
            <div className="flex justify-end">
              <button
                onClick={cancelDelete}
                className="mr-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerManagement;
