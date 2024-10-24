'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';
import { getDocuments } from '../lib/firebase/firebaseUtils';
import { format, parseISO, isEqual, startOfDay } from 'date-fns';

interface Buyer {
  id: string;
  buyerId: string;
  name: string;
}

interface Sample {
  id: string;
  sampleId: string;
  buyerId: string;
  status: string;
  style: string;
  patternStatus: string;
  expectedCompletionDate: string;
  remarks: { text: string; timestamp: string; user: string }[];
  changeTracking: {
    [key: string]: {
      name: string;
      timestamp: string;
    };
  };
}

interface Change {
  sampleId: string;
  style: string;
  field: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
}

const MerchandisingDashboardContent: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [changes, setChanges] = useState<Change[]>([]);

  useEffect(() => {
    const fetchBuyers = async () => {
      const buyersData = await getDocuments('buyer') as Buyer[];
      setBuyers(buyersData);
    };
    fetchBuyers();
  }, []);

  useEffect(() => {
    const fetchChangesForBuyer = async () => {
      if (!selectedBuyerId || !selectedDate) return;

      const allSamples = await getDocuments('samples') as Sample[];
      const buyerSamples = allSamples.filter(sample => sample.buyerId === selectedBuyerId);
      const selectedDateChanges: Change[] = [];

      const selectedDateStart = startOfDay(parseISO(selectedDate));

      buyerSamples.forEach(sample => {
        const relevantFields = ['status', 'patternStatus', 'expectedCompletionDate'];
        
        relevantFields.forEach(field => {
          const changeInfo = sample.changeTracking[field];
          if (changeInfo && isEqual(startOfDay(parseISO(changeInfo.timestamp)), selectedDateStart)) {
            selectedDateChanges.push({
              sampleId: sample.sampleId,
              style: sample.style,
              field,
              newValue: sample[field as keyof Sample] as string,
              changedBy: changeInfo.name,
              changedAt: changeInfo.timestamp,
            });
          }
        });

        // Check for new remarks
        sample.remarks?.forEach(remark => {
          if (isEqual(startOfDay(parseISO(remark.timestamp)), selectedDateStart)) {
            selectedDateChanges.push({
              sampleId: sample.sampleId,
              style: sample.style,
              field: 'New Remark',
              newValue: remark.text,
              changedBy: remark.user,
              changedAt: remark.timestamp,
            });
          }
        });
      });

      setChanges(selectedDateChanges);
    };

    fetchChangesForBuyer();
  }, [selectedBuyerId, selectedDate]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const groupChangesBySample = (changes: Change[]) => {
    const grouped: { [key: string]: Change[] } = {};
    changes.forEach(change => {
      if (!grouped[change.sampleId]) {
        grouped[change.sampleId] = [];
      }
      grouped[change.sampleId].push(change);
    });
    return Object.entries(grouped);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center p-4 bg-white border-b">
          <button onClick={toggleSidebar} className="p-2 rounded-md hover:bg-gray-200 mr-4">
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-semibold">Merchandising Dashboard</h1>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4">
          <div className="mb-4 flex space-x-4">
            <select 
              value={selectedBuyerId} 
              onChange={(e) => setSelectedBuyerId(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="">Select a buyer</option>
              {buyers.map(buyer => (
                <option key={buyer.id} value={buyer.buyerId}>{buyer.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 border rounded"
            />
          </div>

          {changes.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Style</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Field</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">New Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Changed By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Changed At</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupChangesBySample(changes).map(([sampleId, sampleChanges], groupIndex) => (
                    <React.Fragment key={sampleId}>
                      {sampleChanges.map((change, index) => (
                        <tr key={`${sampleId}-${index}`} className={groupIndex % 2 === 0 ? 'bg-gray-100' : 'bg-white'}>
                          {index === 0 && (
                            <td rowSpan={sampleChanges.length} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-l-4 border-blue-500">
                              {change.sampleId}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{change.style}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{change.field}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{change.newValue}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{change.changedBy}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(parseISO(change.changedAt), "HH:mm:ss 'on' dd/MM/yyyy")}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No changes found for the selected date.</p>
          )}
        </main>
      </div>
    </div>
  );
};

export default MerchandisingDashboardContent;
