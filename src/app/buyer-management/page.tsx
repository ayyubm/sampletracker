'use client';

import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '../../lib/firebase/firebaseUtils';
import { BUYER_OPTIONS } from '../../lib/constants';

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

  useEffect(() => {
    fetchBuyers();
  }, []);

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

  const handleDeleteBuyer = async (id: string | undefined) => {
    if (id) {
      await deleteDocument('buyer', id);
      setBuyers(buyers.filter(b => b.id !== id));
    } else {
      console.error('Cannot delete buyer: ID is undefined');
    }
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
                <thead className="bg-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Sr.
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Buyer ID
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {buyers.map((buyer, index) => (
                    <tr key={buyer.id} className="border-b">
                      <td className="px-4 py-2 whitespace-nowrap">{index + 1}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{buyer.buyerId}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
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
                      <td className="px-4 py-2 whitespace-nowrap">
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
    </div>
  );
};

export default BuyerManagement;
