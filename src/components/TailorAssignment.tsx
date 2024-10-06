import React, { useState, useEffect } from 'react';
import { BUYER_OPTIONS } from '../lib/constants';
import { getDocuments, updateDocument, addDocument } from '../lib/firebase/firebaseUtils';
import { format, parseISO, isBefore, addDays, subDays } from 'date-fns';
import Alert from './Alert';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
}

const TailorAssignment: React.FC<TailorAssignmentProps> = ({ topControls = false }) => {
  const [buyerTailorCounts, setBuyerTailorCounts] = useState<BuyerTailorCount[]>([]);
  const [allDates, setAllDates] = useState<string[]>([]);
  const [displayedDates, setDisplayedDates] = useState<string[]>([]);
  const [newDate, setNewDate] = useState<string>('');
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  useEffect(() => {
    fetchTailorCounts();
  }, []);

  const fetchTailorCounts = async () => {
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
  };

  const updateDates = (counts: BuyerTailorCount[]) => {
    const dates = counts.flatMap(count => Object.keys(count.tailorCounts));
    const uniqueDates = Array.from(new Set(dates)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    setAllDates(uniqueDates);
    setDisplayedDates(uniqueDates.slice(-7)); // Initially display the last 7 dates
  };

  const handleCountChange = (buyerIndex: number, date: string, value: string) => {
    const newCounts = [...buyerTailorCounts];
    newCounts[buyerIndex].tailorCounts[date] = parseInt(value) || 0;
    setBuyerTailorCounts(newCounts);
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
    setAlert({ message: "New date added successfully.", type: 'success' });
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

  return (
    <div className="container mx-auto px-4">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-bold">Tailor Assignments</h2>
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
        </div>
        <button
          onClick={saveTailorCounts}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Save Assignments
        </button>
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
        <div className="max-h-[calc(100vh-178px)] overflow-y-auto"> {/* Changed from 250px to 178px */}
          <table className="min-w-full bg-white table-fixed">
            <thead className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal sticky top-0 z-10">
              <tr>
                <th className="w-1/6 py-3 px-2 text-left sticky left-0 bg-gray-200 z-20">Buyer</th>
                {displayedDates.map(date => (
                  <th key={date} className="w-1/9 py-3 px-1 text-center text-xs">
                    {format(parseISO(date), 'dd/MM/yy')}
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
        </div>
      </div>
    </div>
  );
};

export default TailorAssignment;