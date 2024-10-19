import React, { useState, useEffect, useCallback } from 'react';
import { getDocuments, updateDocument } from '../lib/firebase/firebaseUtils';
import { format, parseISO } from 'date-fns';
import Alert from './Alert';
import { Trash2 } from 'lucide-react';

interface Buyer {
  id: string;
  buyerId: string;
  name: string;
  tailorCounts?: {
    [date: string]: number;
  };
}

interface TailorAssignmentProps {
  topControls?: boolean;
  onUnsavedChanges: (hasUnsavedChanges: boolean) => void;
}

const TailorAssignment: React.FC<TailorAssignmentProps> = ({ topControls = false, onUnsavedChanges }) => {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [allDates, setAllDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState<string>('');
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    onUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChanges]);

  useEffect(() => {
    fetchBuyers();
  }, []);

  const fetchBuyers = async () => {
    const buyersData = await getDocuments('buyer');
    setBuyers(buyersData as Buyer[]);
    const dates = extractDatesFromBuyers(buyersData as Buyer[]);
    setAllDates(dates);
  };

  const extractDatesFromBuyers = (buyers: Buyer[]): string[] => {
    const allDates = new Set<string>();
    buyers.forEach(buyer => {
      if (buyer.tailorCounts) {
        Object.keys(buyer.tailorCounts).forEach(date => allDates.add(date));
      }
    });
    return Array.from(allDates).sort();
  };

  const addNewDate = () => {
    if (newDate && !allDates.includes(newDate)) {
      const updatedDates = [...allDates, newDate].sort();
      setAllDates(updatedDates);
      setNewDate('');
      setHasUnsavedChanges(true);
    }
  };

  const handleCountChange = (buyerIndex: number, date: string, value: string) => {
    const updatedBuyers = [...buyers];
    if (!updatedBuyers[buyerIndex].tailorCounts) {
      updatedBuyers[buyerIndex].tailorCounts = {};
    }
    updatedBuyers[buyerIndex].tailorCounts[date] = parseInt(value) || 0;
    setBuyers(updatedBuyers);
    setHasUnsavedChanges(true);
  };

  const saveTailorCounts = async () => {
    try {
      for (const buyer of buyers) {
        if (buyer.id) {
          await updateDocument('buyer', buyer.id, { tailorCounts: buyer.tailorCounts || {} });
        }
      }
      setAlert({ message: 'Tailor counts saved successfully', type: 'success' });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving tailor counts:', error);
      setAlert({ message: 'Error saving tailor counts', type: 'error' });
    }
  };

  const handleDeleteDate = async (dateToDelete: string) => {
    const updatedBuyers = buyers.map(buyer => ({
      ...buyer,
      tailorCounts: buyer.tailorCounts ? 
        Object.fromEntries(
          Object.entries(buyer.tailorCounts).filter(([date]) => date !== dateToDelete)
        ) : {}
    }));

    setBuyers(updatedBuyers);
    setAllDates(allDates.filter(date => date !== dateToDelete));
    setHasUnsavedChanges(true);
  };

  // Add this function to reverse and sort the dates
  const getReversedDates = useCallback(() => {
    return [...allDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [allDates]);

  return (
    <div className="w-full px-4">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="p-2 border rounded"
          />
          <button
            onClick={addNewDate}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Add New Date
          </button>
          <button
            onClick={saveTailorCounts}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Save Assignments
          </button>
        </div>
      </div>
      {alert && (
        <Alert
          message={alert.message}
          type={alert.type}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="overflow-x-auto -mx-4">
        <div className="max-h-[calc(100vh-178px)] overflow-y-auto relative">
          {buyers.length > 0 && allDates.length > 0 ? (
            <table className="w-full bg-white">
              <thead className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal sticky top-0 z-20">
                <tr>
                  <th className="w-48 py-3 px-2 text-left sticky left-0 z-30 bg-gray-200">Buyer</th>
                  {getReversedDates().map(date => (
                    <th key={date} className="py-3 px-1 text-center text-xs" style={{ minWidth: '8rem' }}>
                      <div className="flex items-center justify-center">
                        <span>{format(parseISO(date), 'dd/MM/yy')}</span>
                        <button
                          onClick={() => handleDeleteDate(date)}
                          className="ml-2 text-red-500 hover:text-red-700"
                          title="Delete date"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm font-light">
                {buyers.map((buyer, index) => (
                  <tr key={buyer.id} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="w-48 py-3 px-2 text-left whitespace-nowrap sticky left-0 bg-white z-10">{buyer.name}</td>
                    {getReversedDates().map(date => (
                      <td key={date} className="py-3 px-1 text-center" style={{ minWidth: '8rem' }}>
                        <input
                          type="number"
                          min="0"
                          value={buyer.tailorCounts?.[date] || 0}
                          onChange={(e) => handleCountChange(index, date, e.target.value)}
                          className="w-full text-center border rounded-md p-1"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No data available. Please add new dates or refresh the page.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TailorAssignment;
