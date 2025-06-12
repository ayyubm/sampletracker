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
  id: string;
  sampleId: string;
  buyerId: string;
  style: string;
  typeOfSample: string;
  fabricTrimsReceiptDate: string;
  status: string;
  noOfPieces: number;
  isArchived: boolean;
  fabricCategory: string;
  changeTracking?: {
    archived?: {
      timestamp: string;
      name: string;
    };
  };
}

interface SamplingOutput {
  id: string;
  date: string;
  buyerId: string;
  outputs: {
    [sampleId: string]: {
      CUT: number;
      SEW: number;
      FINISH: number;
      ALTER: number;
      PASS: number;
      REJECT: number;
    };
  };
}

const DailyTailorAllotmentReport: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fabricCategoryFilter, setFabricCategoryFilter] = useState<'All' | 'Knit' | 'Woven'>('All');
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
  }, [user, loading, router, selectedDate, fabricCategoryFilter]);

  const fetchReportData = async () => {
    setDataLoading(true);
    setError(null);
    try {
      // Fetch buyers
      const buyers = await getDocuments('buyer');
      
      // Fetch samples
      const samples = await getDocuments('samples') as Sample[];

      // Fetch all sampling outputs
      const samplingOutputs = await getDocuments('dailySamplingOutputs') as SamplingOutput[];

      // Calculate total sewn pieces per sample
      const totalSewnPieces: { [sampleId: string]: number } = {};
      samplingOutputs.forEach(output => {
        if (output.date <= selectedDate) {
          Object.entries(output.outputs).forEach(([sampleId, sampleOutput]) => {
            totalSewnPieces[sampleId] = (totalSewnPieces[sampleId] || 0) + sampleOutput.SEW;
          });
        }
      });

      // Process sample counts
      const sampleCounts: { [buyerId: string]: SampleCount } = {};
      samples.forEach((sample) => {
        if (
          sample.fabricTrimsReceiptDate &&
          sample.fabricTrimsReceiptDate <= selectedDate &&
          ((sample.isArchived === undefined || sample.isArchived === false) || 
           (sample.changeTracking?.archived?.timestamp && 
            sample.changeTracking.archived.timestamp.split('T')[0] >= selectedDate)) &&
          (fabricCategoryFilter === 'All' || sample.fabricCategory === fabricCategoryFilter)
        ) {
          if (!sampleCounts[sample.buyerId]) {
            sampleCounts[sample.buyerId] = { FIT: 0, PP: 0, GPT: 0, SMS: 0, Other: 0 };
          }
          
          const sampleType = sample.typeOfSample.toUpperCase();
          const totalPieces = Number(sample.noOfPieces) || 0;
          const sewnPieces = totalSewnPieces[sample.sampleId] || 0;
          const remainingPieces = Math.max(0, totalPieces - sewnPieces);

          if (sampleType === 'SMS/SRS/PA/COLOUR RUN') {
            sampleCounts[sample.buyerId].SMS += remainingPieces;
          }
          else if (sampleType === 'FIT') {
            sampleCounts[sample.buyerId].FIT += remainingPieces;
          }
          else if (sampleType === 'PP') {
            sampleCounts[sample.buyerId].PP += remainingPieces;
          }
          else if (sampleType === 'GPT') {
            sampleCounts[sample.buyerId].GPT += remainingPieces;
          }
          else {
            sampleCounts[sample.buyerId].Other += remainingPieces;
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

  const calculateTotals = () => {
    return reportData.reduce(
      (totals, data) => ({
        FIT: totals.FIT + data.sampleCounts.FIT,
        PP: totals.PP + data.sampleCounts.PP,
        GPT: totals.GPT + data.sampleCounts.GPT,
        SMS: totals.SMS + data.sampleCounts.SMS,
        Other: totals.Other + data.sampleCounts.Other,
        totalSamples: totals.totalSamples + Object.values(data.sampleCounts).reduce((a, b) => a + b, 0),
        tailorsAssigned: totals.tailorsAssigned + data.tailorsAssigned,
      }),
      { FIT: 0, PP: 0, GPT: 0, SMS: 0, Other: 0, totalSamples: 0, tailorsAssigned: 0 }
    );
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
        <h1 className="text-2xl font-bold">Total Pending Samples Report</h1>
      </div>
      <div className="mb-4 flex items-center gap-6">
        <div className="flex items-center">
          <label htmlFor="date" className="mr-2">Select Date:</label>
          <input
            type="date"
            id="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded p-1"
          />
        </div>

        {/* Fabric Category Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">
            Fabric Category:
          </label>
          <div className="flex space-x-2">
            {(['All', 'Knit', 'Woven'] as const).map((category) => (
              <button
                key={category}
                onClick={() => setFabricCategoryFilter(category)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  fabricCategoryFilter === category
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
      {dataLoading && <p>Loading report data...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!dataLoading && !error && reportData.length === 0 && (
        <p>No data available for the selected date.</p>
      )}
      {reportData.length > 0 && (
        <div className="flex-grow overflow-auto relative">
          <table className="w-full border-collapse border table-fixed">
            <colgroup>
              <col className="w-[25%]" />
              <col className="w-[10.714%]" />
              <col className="w-[10.714%]" />
              <col className="w-[10.714%]" />
              <col className="w-[10.714%]" />
              <col className="w-[10.714%]" />
              <col className="w-[10.714%]" />
              <col className="w-[10.714%]" />
            </colgroup>
            <thead className="bg-gray-200 sticky top-0 z-10">
              <tr>
                <th className="border p-2 sticky left-0 bg-gray-200 z-20 text-center whitespace-nowrap">Buyer</th>
                <th className="border p-2 text-center whitespace-nowrap">FIT</th>
                <th className="border p-2 text-center whitespace-nowrap">PP</th>
                <th className="border p-2 text-center whitespace-nowrap">GPT</th>
                <th className="border p-2 text-center whitespace-nowrap">SMS</th>
                <th className="border p-2 text-center whitespace-nowrap">Other</th>
                <th className="border p-2 text-center whitespace-nowrap">Total Samples</th>
                <th className="border p-2 text-center whitespace-nowrap">Tailors Assigned</th>
              </tr>
            </thead>
            <tbody className="bg-white">
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
            <tfoot className="sticky bottom-0 bg-gray-100 font-bold shadow-md">
              <tr>
                <td className="border p-2 sticky left-0 bg-gray-100 text-center whitespace-nowrap">TOTAL</td>
                <td className="border p-2 text-center">{calculateTotals().FIT}</td>
                <td className="border p-2 text-center">{calculateTotals().PP}</td>
                <td className="border p-2 text-center">{calculateTotals().GPT}</td>
                <td className="border p-2 text-center">{calculateTotals().SMS}</td>
                <td className="border p-2 text-center">{calculateTotals().Other}</td>
                <td className="border p-2 text-center">{calculateTotals().totalSamples}</td>
                <td className="border p-2 text-center">{calculateTotals().tailorsAssigned}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default DailyTailorAllotmentReport;
