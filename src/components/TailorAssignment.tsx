import React, { useState, useEffect, useCallback } from 'react';
import { BUYER_OPTIONS } from '../lib/constants';
import { getDocuments, updateDocument, addDocument } from '../lib/firebase/firebaseUtils';
import { format, parseISO, isBefore, addDays, subDays } from 'date-fns';
import Alert from './Alert';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

interface TailorCount {
  [date: string]: number;
}

interface BuyerTailorCount {
  id?: string;
  buyer: string;
  tailorCounts: TailorCount;
}

interface TailorAssignmentProps {
  topControls?: boolean;
  onUnsavedChanges: (hasUnsavedChanges: boolean) => void;
}

const TailorAssignment: React.FC<TailorAssignmentProps> = ({ topControls = false, onUnsavedChanges }) => {
  const [buyerTailorCounts, setBuyerTailorCounts] = useState<BuyerTailorCount[]>([]);
  const [allDates, setAllDates] = useState<string[]>([]);
  const [displayedDates, setDisplayedDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState<string>('');
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    onUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, onUnsavedChanges]);

  useEffect(() => {
    fetchTailorCounts();
  }, []);

  const fetchTailorCounts = async () => {
    try {
      const fetchedCounts = await getDocuments('tailorAssignments');
      if (fetchedCounts.length === 0) {
        const initialCounts = BUYER_OPTIONS.map(buyer => ({
          buyer,
          tailorCounts: {}
        }));
        setBuyerTailorCounts(initialCounts);
      } else {
        setBuyerTailorCounts(fetchedCounts as BuyerTailorCount[]);
      }
      updateDates(fetchedCounts as BuyerTailorCount[]);
    } catch (error) {
      console.error('Error fetching tailor counts:', error);
      setAlert({ message: 'Error fetching tailor assignments. Please try again.', type: 'error' });
    }
  };

  const updateDates = (counts: BuyerTailorCount[]) => {
    const dates = counts.flatMap(count => Object.keys(count.tailorCounts));
    const uniqueDates = Array.from(new Set(dates)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    setAllDates(uniqueDates);
    setDisplayedDates(uniqueDates.slice(-7)); // Initially display the last 7 dates
  };

  const setUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const handleCountChange = (buyerIndex: number, date: string, value: string) => {
    const newCounts = [...buyerTailorCounts];
    newCounts[buyerIndex].tailorCounts[date] = parseInt(value) || 0;
    setBuyerTailorCounts(newCounts);
    setUnsavedChanges();
  };

  const addNewDate = () => {
    if (!newDate) {
      setAlert({ message: "Please select a date to add.", type: 'warning' });
      return;
    }

    if (allDates.includes(newDate)) {
      setAlert({ message: "This date already exists in the table.", type: 'warning' });
      return;
    }

    const updatedAllDates = [...allDates, newDate].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    setAllDates(updatedAllDates);

    const newCounts = buyerTailorCounts.map(count => ({
      ...count,
      tailorCounts: { 
        ...count.tailorCounts, 
        [newDate]: count.tailorCounts[newDate] || 0 // Use existing data if available
      }
    }));
    setBuyerTailorCounts(newCounts);

    // Update displayed dates
    const newDateIndex = updatedAllDates.indexOf(newDate);
    if (newDateIndex >= updatedAllDates.length - 7) {
      setDisplayedDates(updatedAllDates.slice(-7));
    }

    setNewDate(''); // Reset the date input
    setAlert({ message: "New date added successfully. Please make sure to save your changes.", type: 'success' });
    setUnsavedChanges();
  };

  const saveTailorCounts = async () => {
    try {
      for (const count of buyerTailorCounts) {
        if (count.id) {
          await updateDocument('tailorAssignments', count.id, count);
        } else {
          await addDocument('tailorAssignments', count);
        }
      }
      setHasUnsavedChanges(false);
      setAlert({ message: 'Tailor assignments saved successfully!', type: 'success' });
      fetchTailorCounts();
    } catch (error) {
      setAlert({ message: 'Error saving tailor assignments. Please try again.', type: 'error' });
    }
  };

  const handlePreviousDates = () => {
    const currentFirstDate = displayedDates[0];
    const currentFirstIndex = allDates.indexOf(currentFirstDate);
    if (currentFirstIndex > 0) {
      const newFirstIndex = currentFirstIndex - 1;
      setDisplayedDates(allDates.slice(newFirstIndex, newFirstIndex + 7));
    }
  };

  const handleNextDates = () => {
    const currentLastDate = displayedDates[displayedDates.length - 1];
    const currentLastIndex = allDates.indexOf(currentLastDate);
    if (currentLastIndex < allDates.length - 1) {
      const newFirstIndex = allDates.indexOf(displayedDates[0]) + 1;
      setDisplayedDates(allDates.slice(newFirstIndex, newFirstIndex + 7));
    }
  };

  const handleDeleteDate = (dateToDelete: string) => {
    // Remove the date from allDates
    const updatedAllDates = allDates.filter(date => date !== dateToDelete);
    setAllDates(updatedAllDates);

    // Update displayedDates
    let newDisplayedDates = displayedDates.filter(date => date !== dateToDelete);

    // Function to add dates to newDisplayedDates
    const addDatesToDisplay = (startIndex: number, direction: 1 | -1) => {
      while (newDisplayedDates.length < 7 && startIndex >= 0 && startIndex < updatedAllDates.length) {
        const nextDate = updatedAllDates[startIndex];
        if (nextDate && !newDisplayedDates.includes(nextDate)) {
          if (direction === 1) {
            newDisplayedDates.push(nextDate);
          } else {
            newDisplayedDates.unshift(nextDate);
          }
        }
        startIndex += direction;
      }
    };

    // Try to add dates after the last displayed date
    let lastDisplayedIndex = updatedAllDates.indexOf(newDisplayedDates[newDisplayedDates.length - 1]);
    addDatesToDisplay(lastDisplayedIndex + 1, 1);

    // If we still don't have 7 dates, look for dates before the first displayed date
    if (newDisplayedDates.length < 7) {
      let firstDisplayedIndex = updatedAllDates.indexOf(newDisplayedDates[0]);
      addDatesToDisplay(firstDisplayedIndex - 1, -1);
    }

    setDisplayedDates(newDisplayedDates);

    // Remove the date from each buyer's tailorCounts
    const updatedCounts = buyerTailorCounts.map(count => ({
      ...count,
      tailorCounts: Object.fromEntries(
        Object.entries(count.tailorCounts).filter(([date]) => date !== dateToDelete)
      )
    }));
    setBuyerTailorCounts(updatedCounts);

    setAlert({ message: "Date removed successfully. Please make sure to save your changes.", type: 'success' });
    setUnsavedChanges();
  };

  return (
    <div className="container mx-auto px-4">
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
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handlePreviousDates}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
          disabled={displayedDates[0] === allDates[0]}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={handleNextDates}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50"
          disabled={displayedDates[displayedDates.length - 1] === allDates[allDates.length - 1]}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="max-h-[calc(100vh-178px)] overflow-y-auto">
          {buyerTailorCounts.length > 0 && displayedDates.length > 0 ? (
            <table className="min-w-full bg-white table-fixed">
              <thead className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal sticky top-0 z-10">
                <tr>
                  <th className="w-1/6 py-3 px-2 text-left sticky left-0 bg-gray-200 z-20">Buyer</th>
                  {displayedDates.map(date => (
                    <th key={date} className="w-1/9 py-3 px-1 text-center text-xs">
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
                {buyerTailorCounts.map((count, index) => (
                  <tr key={count.buyer} className="border-b border-gray-200 hover:bg-gray-100">
                    <td className="py-3 px-2 text-left whitespace-nowrap sticky left-0 bg-white">{count.buyer}</td>
                    {displayedDates.map(date => (
                      <td key={date} className="py-3 px-1 text-center">
                        <input
                          type="number"
                          min="0"
                          value={count.tailorCounts[date] || 0}
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
      
      {/* Debug information */}
      {/* <div className="mt-4 p-4 bg-gray-100 rounded">
        <h3 className="font-bold">Debug Info:</h3>
        <p>Buyer Count: {buyerTailorCounts.length}</p>
        <p>All Dates: {allDates.join(', ')}</p>
        <p>Displayed Dates: {displayedDates.join(', ')}</p>
      </div> */}
    </div>
  );
};

export default TailorAssignment;
