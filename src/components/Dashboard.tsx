'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../lib/hooks/useAuth';
import SampleList from './SampleList';
import SampleForm from './SampleForm';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import PrintSamplesModal from './PrintSamplesModal';
import { getDocuments } from '../lib/firebase/firebaseUtils';
import MasterExcelModal from './MasterExcelModal';

export default function Dashboard() {
  const { userData } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [clearFiltersFlag, setClearFiltersFlag] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showMasterExcelModal, setShowMasterExcelModal] = useState(false);
  const [samples, setSamples] = useState<any[]>([]);
  const [fabricCategoryFilter, setFabricCategoryFilter] = useState<'All' | 'Knit' | 'Woven'>('All');
  // const [isUpdatingFabricCategory, setIsUpdatingFabricCategory] = useState(false);

  useEffect(() => {
    const fetchSamples = async () => {
      const fetchedSamples = await getDocuments('samples');
      setSamples(fetchedSamples);
    };
    fetchSamples();
  }, [refreshTrigger]);

  const handleSampleAdded = useCallback(() => {
    setShowForm(false);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleSampleUpdated = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const clearAllFilters = () => {
    setClearFiltersFlag(true);
    // Reset the flag after a short delay
    setTimeout(() => setClearFiltersFlag(false), 100);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const canViewMasterExcel = userData?.team === 'Viewer' || 
                            userData?.team === 'Admin' || 
                            userData?.team === 'Management';

  // const handleBulkUpdateFabricCategory = async () => {
  //   if (!userData?.isAdmin) {
  //     alert('Only administrators can perform this operation.');
  //     return;
  //   }

  //   const confirmUpdate = window.confirm(
  //     'This will set the fabric category to "Woven" for ALL samples (including archived ones). This action cannot be undone. Are you sure you want to continue?'
  //   );

  //   if (!confirmUpdate) return;

  //   setIsUpdatingFabricCategory(true);
  //   try {
  //     const response = await fetch('/api/bulk-update-fabric-category', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({
  //         userToken: userData.email, // Using email as token for simplicity
  //         fabricCategory: 'Woven'
  //       }),
  //     });

  //     const result = await response.json();

  //     if (result.success) {
  //       alert(`Success! ${result.message}`);
  //       setRefreshTrigger(prev => prev + 1); // Refresh the samples list
  //     } else {
  //       throw new Error(result.error || 'Failed to update fabric categories');
  //     }
  //   } catch (error) {
  //     console.error('Error updating fabric categories:', error);
  //     alert(`Error: ${error instanceof Error ? error.message : 'Failed to update fabric categories'}`);
  //   } finally {
  //     setIsUpdatingFabricCategory(false);
  //   }
  // };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <header className="flex justify-between items-center p-4">
        <div className="flex items-center">
          <button onClick={toggleSidebar} className="mr-4">
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-bold">Garment Sample Tracker</h1>
        </div>
        <span className="mr-4">
          Welcome, {userData?.firstName || 'User'}
          {userData?.isAdmin && <span className="ml-2 text-sm text-green-500">(Admin)</span>}
        </span>
      </header>
      <div className="flex justify-between items-center px-4 py-2">
        <button
          onClick={() => setShowForm(true)}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Add New Sample
        </button>
        <div className="flex items-center space-x-4">
          {/* Fabric Category Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Fabric Category:</span>
            <div className="flex bg-gray-200 rounded-lg p-1">
              {(['All', 'Knit', 'Woven'] as const).map((category) => (
                <button
                  key={category}
                  onClick={() => setFabricCategoryFilter(category)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    fabricCategoryFilter === category
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
          <div className="flex space-x-2">
            {/* Admin-only button for bulk fabric category update */}
            {/* {userData?.isAdmin && (
              <button
                onClick={handleBulkUpdateFabricCategory}
                disabled={isUpdatingFabricCategory}
                className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                title="Set all samples fabric category to Woven (Admin only)"
              >
                {isUpdatingFabricCategory ? 'Updating...' : 'Set All to Woven'}
              </button>
            )} */}
            {canViewMasterExcel && (
              <button
                onClick={() => setShowMasterExcelModal(true)}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Print Master Excel
              </button>
            )}
            <button
              onClick={() => setShowPrintModal(true)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Print Samples
            </button>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      </div>
      {showForm && <SampleForm onClose={() => setShowForm(false)} onSampleAdded={handleSampleAdded} />}
      <div className="flex-grow overflow-hidden px-4 pb-4">
        <SampleList 
          refreshTrigger={refreshTrigger} 
          onSampleUpdated={handleSampleUpdated} 
          clearFiltersFlag={clearFiltersFlag}
          samples={samples}
          setSamples={setSamples}
          fabricCategoryFilter={fabricCategoryFilter}
        />
      </div>
      {showPrintModal && (
        <PrintSamplesModal
          onClose={() => setShowPrintModal(false)}
          samples={samples.filter(sample => !sample.isArchived)}
        />
      )}
      {showMasterExcelModal && (
        <MasterExcelModal
          onClose={() => setShowMasterExcelModal(false)}
          samples={samples}
        />
      )}
    </div>
  );
}
