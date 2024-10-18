'use client';

import React, { useState, useEffect } from 'react';
import { getDocuments } from '../lib/firebase/firebaseUtils';
import { format } from 'date-fns';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface SampleCount {
  FIT: number;
  PP: number;
  GPT: number;
  SMS: number;
  Other: number;
}

interface BuyerData {
  id: string;
  buyerId: string;
  name: string;
  sampleCounts: SampleCount;
  tailorsAssigned: number;
}

interface Sample {
  buyerId: string;
  typeOfSample: string;
  noOfPieces: number;
}

const DailyTailorAllotmentReport: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [reportData, setReportData] = useState<BuyerData[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchReportData();
    }
  }, [user, loading, router, selectedDate]);

  const fetchReportData = async () => {
    setDataLoading(true);
    setError(null);
    try {
      // Fetch buyers
      const buyers = await getDocuments('buyer');
      
      // Fetch samples
      const samples = await getDocuments('samples');

      // Process sample counts
      const sampleCounts: { [buyerId: string]: SampleCount } = {};
      samples.forEach((sample: any) => {
        // Check if the sample is not archived before counting it
        if (!sample.isArchived) {
          if (!sampleCounts[sample.buyerId]) {
            sampleCounts[sample.buyerId] = { FIT: 0, PP: 0, GPT: 0, SMS: 0, Other: 0 };
          }
          const sampleType = sample.typeOfSample.toUpperCase();
          const pieceCount = Number(sample.noOfPieces) || 0;
          if (sampleType === 'SMS/SRS/PA/COLOUR RUN') {
            sampleCounts[sample.buyerId].SMS += pieceCount;
          }
          else if (sampleType === 'FIT') {
            sampleCounts[sample.buyerId].FIT += pieceCount;
          }
          else if (sampleType === 'PP') {
            sampleCounts[sample.buyerId].PP += pieceCount;
          }
          else if (sampleType === 'GPT') {
            sampleCounts[sample.buyerId].GPT += pieceCount;
          }
          else {
            sampleCounts[sample.buyerId].Other += pieceCount;
          }
        }
      });

      // Prepare report data
      const reportData: BuyerData[] = buyers.map((buyer: any) => ({
        id: buyer.id,
        buyerId: buyer.buyerId,
        name: buyer.name,
        sampleCounts: sampleCounts[buyer.buyerId] || { FIT: 0, PP: 0, GPT: 0, SMS: 0, Other: 0 },
        tailorsAssigned: buyer.tailorCounts?.[selectedDate] || 0
      }));

      setReportData(reportData);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError('An error occurred while fetching the report data. Please try again.');
    } finally {
      setDataLoading(false);
    }
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
    <div className="flex flex-col h-screen p-6">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex items-center mb-4">
        <button onClick={toggleSidebar} className="mr-4">
          <Menu size={24} />
        </button>
        <h1 className="text-2xl font-bold">Daily Tailor Allotment Report</h1>
      </div>
      <div className="mb-4">
        <label htmlFor="date" className="mr-2">Select Date:</label>
        <input
          type="date"
          id="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded p-1"
        />
      </div>
      {dataLoading && <p>Loading report data...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!dataLoading && !error && reportData.length === 0 && (
        <p>No data available for the selected date.</p>
      )}
      {reportData.length > 0 && (
        <div className="flex-grow overflow-hidden">
          <div className="h-full overflow-y-auto">
            <table className="w-full border-collapse border table-fixed">
              <colgroup>
                <col className="w-1/4" />
                <col className="w-1/12" />
                <col className="w-1/12" />
                <col className="w-1/12" />
                <col className="w-1/12" />
                <col className="w-1/12" />
                <col className="w-1/12" />
                <col className="w-1/12" />
              </colgroup>
              <thead className="bg-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="border p-2 sticky left-0 bg-gray-200 z-20 text-center">Buyer</th>
                  <th className="border p-2 text-center">FIT</th>
                  <th className="border p-2 text-center">PP</th>
                  <th className="border p-2 text-center">GPT</th>
                  <th className="border p-2 text-center">SMS</th>
                  <th className="border p-2 text-center">Other</th>
                  <th className="border p-2 text-center">Total Samples</th>
                  <th className="border p-2 text-center">Tailors Assigned</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((data) => (
                  <tr key={data.id}>
                    <td className="border p-2 sticky left-0 bg-white text-center truncate">{data.name}</td>
                    <td className="border p-2 text-center">{data.sampleCounts.FIT}</td>
                    <td className="border p-2 text-center">{data.sampleCounts.PP}</td>
                    <td className="border p-2 text-center">{data.sampleCounts.GPT}</td>
                    <td className="border p-2 text-center">{data.sampleCounts.SMS}</td>
                    <td className="border p-2 text-center">{data.sampleCounts.Other}</td>
                    <td className="border p-2 text-center">
                      {Object.values(data.sampleCounts).reduce((a, b) => a + b, 0)}
                    </td>
                    <td className="border p-2 text-center">{data.tailorsAssigned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTailorAllotmentReport;
