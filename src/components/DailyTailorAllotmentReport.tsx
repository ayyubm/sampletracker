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
  buyer: string;
  sampleCounts: SampleCount;
  tailorsAssigned: number;
}

interface TailorAssignment {
  date: string;
  buyer: string;
  tailorCounts: { [key: string]: number };
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
      // Fetch all tailor assignments
      const tailorAssignments = await getDocuments('tailorAssignments') as TailorAssignment[];
      
      // Get unique buyers from all tailor assignments
      const allBuyers = new Set<string>();
      tailorAssignments.forEach((assignment) => {
        allBuyers.add(assignment.buyer);
      });

      // Fetch samples
      const samples = await getDocuments('samples');

      // Initialize buyer data
      const buyerData: { [key: string]: BuyerData } = {};
      allBuyers.forEach(buyer => {
        buyerData[buyer] = {
          buyer,
          sampleCounts: { FIT: 0, PP: 0, GPT: 0, SMS: 0, Other: 0 },
          tailorsAssigned: 0
        };
      });

      // Process samples
      samples.forEach((sample: any) => {
        if (sample.sampleRequestDate === selectedDate && buyerData[sample.buyer]) {
          const sampleType = sample.typeOfSample.toUpperCase();
          if (sampleType in buyerData[sample.buyer].sampleCounts) {
            buyerData[sample.buyer].sampleCounts[sampleType as keyof SampleCount]++;
          } else {
            buyerData[sample.buyer].sampleCounts.Other++;
          }
        }
      });

      // Process tailor assignments for the selected date
      const assignmentForDate = tailorAssignments.find(assignment => assignment.date === selectedDate);
      if (assignmentForDate) {
        Object.entries(assignmentForDate.tailorCounts).forEach(([buyer, count]) => {
          if (buyerData[buyer]) {
            buyerData[buyer].tailorsAssigned = count;
          }
        });
      }

      setReportData(Object.values(buyerData));
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
    <div className="p-6">
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
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Buyer</th>
              <th className="border p-2">FIT</th>
              <th className="border p-2">PP</th>
              <th className="border p-2">GPT</th>
              <th className="border p-2">SMS</th>
              <th className="border p-2">Other</th>
              <th className="border p-2">Total Samples</th>
              <th className="border p-2">Tailors Assigned</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((data) => (
              <tr key={data.buyer}>
                <td className="border p-2">{data.buyer}</td>
                <td className="border p-2">{data.sampleCounts.FIT}</td>
                <td className="border p-2">{data.sampleCounts.PP}</td>
                <td className="border p-2">{data.sampleCounts.GPT}</td>
                <td className="border p-2">{data.sampleCounts.SMS}</td>
                <td className="border p-2">{data.sampleCounts.Other}</td>
                <td className="border p-2">
                  {Object.values(data.sampleCounts).reduce((a, b) => a + b, 0)}
                </td>
                <td className="border p-2">{data.tailorsAssigned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DailyTailorAllotmentReport;
