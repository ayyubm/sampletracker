'use client';

import React, { useState, useEffect } from 'react';
import { getDocuments, updateDocument, deleteDocument } from '../../lib/firebase/firebaseUtils';
import { useAuth } from '../../lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Menu, ArrowUpCircle, Trash2 } from 'lucide-react';
import Sidebar from '../../components/Sidebar';

interface Sample {
  id: string;
  sampleId: string;
  buyer: string;
  style: string;
  typeOfSample: string;
  noOfPieces: number;
  actualSampleReceivedDate: string;
  isArchived: boolean;
}

const ArchivedSamples: React.FC = () => {
  const [archivedSamples, setArchivedSamples] = useState<Sample[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchArchivedSamples();
    }
  }, [user, loading, router]);

  const fetchArchivedSamples = async () => {
    const samples = await getDocuments('samples') as Sample[];
    setArchivedSamples(samples.filter((sample: Sample) => sample.isArchived));
  };

  const handleUnarchive = async (sampleId: string) => {
    try {
      await updateDocument('samples', sampleId, { isArchived: false });
      fetchArchivedSamples(); // Refresh the archived samples list
    } catch (error) {
      console.error('Error unarchiving sample:', error);
    }
  };

  const handleDelete = (sampleId: string) => {
    setDeleteConfirmation(sampleId);
  };

  const confirmDelete = async () => {
    if (deleteConfirmation) {
      try {
        await deleteDocument('samples', deleteConfirmation);
        fetchArchivedSamples(); // Refresh the archived samples list
      } catch (error) {
        console.error('Error deleting sample:', error);
      }
      setDeleteConfirmation(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmation(null);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="p-4">
        <div className="flex items-center mb-4">
          <button onClick={toggleSidebar} className="mr-4">
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-bold">Archived Samples</h1>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
              <tr>
                <th className="py-3 px-6 text-left">Sample ID</th>
                <th className="py-3 px-6 text-left">Buyer</th>
                <th className="py-3 px-6 text-left">Style</th>
                <th className="py-3 px-6 text-left">Sample Type</th>
                <th className="py-3 px-6 text-left">No. of Pieces</th>
                <th className="py-3 px-6 text-left">Actual Sample Received Date</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {archivedSamples.map((sample) => (
                <tr key={sample.id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-6 text-left whitespace-nowrap">{sample.sampleId}</td>
                  <td className="py-3 px-6 text-left">{sample.buyer}</td>
                  <td className="py-3 px-6 text-left">{sample.style}</td>
                  <td className="py-3 px-6 text-left">{sample.typeOfSample}</td>
                  <td className="py-3 px-6 text-left">{sample.noOfPieces}</td>
                  <td className="py-3 px-6 text-left">{sample.actualSampleReceivedDate}</td>
                  <td className="py-3 px-6 text-center">
                    <div className="flex justify-center items-center space-x-2">
                      <button
                        onClick={() => handleUnarchive(sample.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Unarchive"
                      >
                        <ArrowUpCircle size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(sample.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-xl">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">
              Confirm Deletion
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this sample? This action cannot be undone.
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

export default ArchivedSamples;
