import React, { useState, useEffect } from 'react';
import { getDocuments } from '../lib/firebase/firebaseUtils';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Simple icon components to replace heroicons
const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

// Type definitions
type SampleType = string;

interface Sample {
  id: string;
  sampleId: string;
  buyerId: string;
  typeOfSample: string; // Changed from sampleType to match database
  fabricTrimsReceiptDate: string; // Changed from requiredCompletionDate
  requiredCompletionDate: string;
  status: string;
  noOfPieces: number;
  isArchived: boolean;
  // We'll need to derive sewnDate from other data
}

interface SamplingOutput {
  id: string;
  date: string;
  outputs: {
    [sampleId: string]: {
      SEW: number;
      // Other operations if needed
    };
  };
}

interface Buyer {
  id: string;
  buyerId: string;
  name: string;
}

interface YearlySummary {
  year: number;
  requested: number;
  sewn: number;
  byType: Record<SampleType, { requested: number; sewn: number }>;
  byBuyer: Record<string, {
    requested: number;
    sewn: number;
    byType: Record<SampleType, { requested: number; sewn: number }>;
  }>;
}

interface MonthlySummary extends YearlySummary {
  month: number;
}

interface DetailedSummary {
  sampleType: string;
  buyer: string;
  requested: number;
  sewn: number;
}

// View levels
type ViewLevel = 'yearly' | 'monthly' | 'detailed';

const MonthlySamplingReport: React.FC = () => {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('yearly');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlySummary[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlySummary[]>([]);
  const [detailedData, setDetailedData] = useState<DetailedSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [processedSamples, setProcessedSamples] = useState<any[]>([]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all required data
        const samplesData = await getDocuments('samples') as Sample[];
        const outputsData = await getDocuments('dailySamplingOutputs') as SamplingOutput[];
        const buyersData = await getDocuments('buyer') as Buyer[];
        
        setBuyers(buyersData);
        
        // Process samples to include required data
        const processed = samplesData.map(sample => {
          // Find the buyer name for this sample
          const buyer = buyersData.find(b => b.buyerId === sample.buyerId);
          const buyerName = buyer ? buyer.name : 'Unknown Buyer';
          
          // Calculate total sewn pieces for this sample
          const sewnPieces = outputsData.reduce((total, output) => {
            if (output.outputs[sample.sampleId]?.SEW) {
              return total + output.outputs[sample.sampleId].SEW;
            }
            return total;
          }, 0);
          
          // Find the latest date when the sample was sewn (if any)
          let lastSewnDate: string | null = null;
          outputsData.forEach(output => {
            if (output.outputs[sample.sampleId]?.SEW && output.outputs[sample.sampleId].SEW > 0) {
              const outputDate = new Date(output.date);
              if (!lastSewnDate || outputDate > new Date(lastSewnDate)) {
                lastSewnDate = output.date;
              }
            }
          });
          
          return {
            ...sample,
            buyer: buyerName,
            sewnDate: lastSewnDate,
            sewnPieces,
            requiredCompletionDate: sample.requiredCompletionDate, // Using this as the required date
            sampleType: sample.typeOfSample // Mapping to expected property
          };
        });
        
        setProcessedSamples(processed);
        
        // Now process the yearly data
        processYearlyData(processed);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load sampling data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Process data for yearly view
  const processYearlyData = (samples: any[]) => {
    // Process yearly data
    const yearMap = new Map<number, {
      requested: number;
      sewn: number;
      byType: Map<string, { requested: number; sewn: number }>;
      byBuyer: Map<string, {
        requested: number;
        sewn: number;
        byType: Map<string, { requested: number; sewn: number }>;
      }>;
    }>();

    samples.forEach(sample => {
      const reqDate = new Date(sample.requiredCompletionDate);
      const sewnDate = sample.sewnDate ? new Date(sample.sewnDate) : null;
      
      const reqYear = reqDate.getFullYear();
      const sewnYear = sewnDate ? sewnDate.getFullYear() : null;
      
      // Get the number of pieces for this sample
      const pieceCount = Number(sample.noOfPieces) || 0;
      const sewnPieceCount = Number(sample.sewnPieces) || 0;
      
      // Update requested counts with piece count
      if (!yearMap.has(reqYear)) {
        yearMap.set(reqYear, {
          requested: 0,
          sewn: 0,
          byType: new Map(),
          byBuyer: new Map()
        });
      }
      const yearData = yearMap.get(reqYear)!;
      yearData.requested += pieceCount;
      
      // Update by type
      if (!yearData.byType.has(sample.sampleType)) {
        yearData.byType.set(sample.sampleType, { requested: 0, sewn: 0 });
      }
      yearData.byType.get(sample.sampleType)!.requested += pieceCount;
      
      // Update by buyer
      if (!yearData.byBuyer.has(sample.buyer)) {
        yearData.byBuyer.set(sample.buyer, { 
          requested: 0, 
          sewn: 0, 
          byType: new Map() 
        });
      }
      const buyerData = yearData.byBuyer.get(sample.buyer)!;
      buyerData.requested += pieceCount;
      
      // Update by buyer and type
      if (!buyerData.byType.has(sample.sampleType)) {
        buyerData.byType.set(sample.sampleType, { requested: 0, sewn: 0 });
      }
      buyerData.byType.get(sample.sampleType)!.requested += pieceCount;
      
      // Update sewn counts if applicable
      if (sewnYear !== null && sewnPieceCount > 0) {
        if (!yearMap.has(sewnYear)) {
          yearMap.set(sewnYear, {
            requested: 0,
            sewn: 0,
            byType: new Map(),
            byBuyer: new Map()
          });
        }
        const sewnYearData = yearMap.get(sewnYear)!;
        sewnYearData.sewn += sewnPieceCount;
        
        // Update by type
        if (!sewnYearData.byType.has(sample.sampleType)) {
          sewnYearData.byType.set(sample.sampleType, { requested: 0, sewn: 0 });
        }
        sewnYearData.byType.get(sample.sampleType)!.sewn += sewnPieceCount;
        
        // Update by buyer
        if (!sewnYearData.byBuyer.has(sample.buyer)) {
          sewnYearData.byBuyer.set(sample.buyer, { 
            requested: 0, 
            sewn: 0, 
            byType: new Map() 
          });
        }
        const sewnBuyerData = sewnYearData.byBuyer.get(sample.buyer)!;
        sewnBuyerData.sewn += sewnPieceCount;
        
        // Update by buyer and type
        if (!sewnBuyerData.byType.has(sample.sampleType)) {
          sewnBuyerData.byType.set(sample.sampleType, { requested: 0, sewn: 0 });
        }
        sewnBuyerData.byType.get(sample.sampleType)!.sewn += sewnPieceCount;
      }
    });

    // Convert Map to array sorted by year
    const yearlySummary: YearlySummary[] = Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        requested: data.requested,
        sewn: data.sewn,
        byType: Object.fromEntries(data.byType.entries()),
        byBuyer: Object.fromEntries(
          Array.from(data.byBuyer.entries()).map(([buyer, buyerData]) => [
            buyer,
            {
              requested: buyerData.requested,
              sewn: buyerData.sewn,
              byType: Object.fromEntries(buyerData.byType.entries())
            }
          ])
        )
      }))
      .sort((a, b) => b.year - a.year); // Sort by year descending
    
    setYearlyData(yearlySummary);
  };

  // Generate monthly data when a year is selected
  useEffect(() => {
    if (!selectedYear || !processedSamples?.length) return;
    
    const monthMap = new Map<number, {
      requested: number;
      sewn: number;
      byType: Map<string, { requested: number; sewn: number }>;
      byBuyer: Map<string, {
        requested: number;
        sewn: number;
        byType: Map<string, { requested: number; sewn: number }>;
      }>;
    }>();

    // Initialize all months
    for (let i = 0; i < 12; i++) {
      monthMap.set(i, {
        requested: 0,
        sewn: 0,
        byType: new Map(),
        byBuyer: new Map()
      });
    }

    processedSamples.forEach(sample => {
      const reqDate = new Date(sample.requiredCompletionDate);
      const sewnDate = sample.sewnDate ? new Date(sample.sewnDate) : null;
      
      // Get the number of pieces for this sample
      const pieceCount = Number(sample.noOfPieces) || 0;
      const sewnPieceCount = Number(sample.sewnPieces) || 0;
      
      // Only process samples for the selected year
      if (reqDate.getFullYear() === selectedYear) {
        const reqMonth = reqDate.getMonth();
        
        // Update monthly data with piece count
        const monthData = monthMap.get(reqMonth)!;
        monthData.requested += pieceCount;
        
        // Update by type
        if (!monthData.byType.has(sample.sampleType)) {
          monthData.byType.set(sample.sampleType, { requested: 0, sewn: 0 });
        }
        monthData.byType.get(sample.sampleType)!.requested += pieceCount;
        
        // Update by buyer
        if (!monthData.byBuyer.has(sample.buyer)) {
          monthData.byBuyer.set(sample.buyer, { 
            requested: 0, 
            sewn: 0, 
            byType: new Map() 
          });
        }
        const buyerData = monthData.byBuyer.get(sample.buyer)!;
        buyerData.requested += pieceCount;
        
        // Update by buyer and type
        if (!buyerData.byType.has(sample.sampleType)) {
          buyerData.byType.set(sample.sampleType, { requested: 0, sewn: 0 });
        }
        buyerData.byType.get(sample.sampleType)!.requested += pieceCount;
      }
      
      // Update sewn count if applicable
      if (sewnDate && sewnDate.getFullYear() === selectedYear && sewnPieceCount > 0) {
        const sewnMonth = sewnDate.getMonth();
        
        const monthData = monthMap.get(sewnMonth)!;
        monthData.sewn += sewnPieceCount;
        
        // Update by type
        if (!monthData.byType.has(sample.sampleType)) {
          monthData.byType.set(sample.sampleType, { requested: 0, sewn: 0 });
        }
        monthData.byType.get(sample.sampleType)!.sewn += sewnPieceCount;
        
        // Update by buyer
        if (!monthData.byBuyer.has(sample.buyer)) {
          monthData.byBuyer.set(sample.buyer, { 
            requested: 0, 
            sewn: 0, 
            byType: new Map() 
          });
        }
        const buyerData = monthData.byBuyer.get(sample.buyer)!;
        buyerData.sewn += sewnPieceCount;
        
        // Update by buyer and type
        if (!buyerData.byType.has(sample.sampleType)) {
          buyerData.byType.set(sample.sampleType, { requested: 0, sewn: 0 });
        }
        buyerData.byType.get(sample.sampleType)!.sewn += sewnPieceCount;
      }
    });
    
    // Convert Map to array
    const monthlySummary: MonthlySummary[] = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        year: selectedYear,
        month,
        requested: data.requested,
        sewn: data.sewn,
        byType: Object.fromEntries(data.byType.entries()),
        byBuyer: Object.fromEntries(
          Array.from(data.byBuyer.entries()).map(([buyer, buyerData]) => [
            buyer,
            {
              requested: buyerData.requested,
              sewn: buyerData.sewn,
              byType: Object.fromEntries(buyerData.byType.entries())
            }
          ])
        )
      }))
      .filter(month => month.requested > 0 || month.sewn > 0)
      .sort((a, b) => a.month - b.month);
    
    setMonthlyData(monthlySummary);
  }, [selectedYear, processedSamples]);

  // Generate detailed data when a month is selected
  useEffect(() => {
    if (selectedYear === null || selectedMonth === null || !processedSamples?.length) return;
    
    // Create a map to track data by buyer first, then by sample type
    const buyerMap = new Map<string, Map<string, { requested: number; sewn: number }>>();
    
    processedSamples.forEach(sample => {
      const reqDate = new Date(sample.requiredCompletionDate);
      const sewnDate = sample.sewnDate ? new Date(sample.sewnDate) : null;
      
      // Get the number of pieces for this sample
      const pieceCount = Number(sample.noOfPieces) || 0;
      const sewnPieceCount = Number(sample.sewnPieces) || 0;
      
      // Only process samples for the selected year and month
      if (reqDate.getFullYear() === selectedYear && reqDate.getMonth() === selectedMonth) {
        if (!buyerMap.has(sample.buyer)) {
          buyerMap.set(sample.buyer, new Map());
        }
        
        const typeMap = buyerMap.get(sample.buyer)!;
        if (!typeMap.has(sample.sampleType)) {
          typeMap.set(sample.sampleType, { requested: 0, sewn: 0 });
        }
        
        typeMap.get(sample.sampleType)!.requested += pieceCount;
      }
      
      // Update sewn count if applicable
      if (sewnDate && 
          sewnDate.getFullYear() === selectedYear && 
          sewnDate.getMonth() === selectedMonth &&
          sewnPieceCount > 0) {
        
        if (!buyerMap.has(sample.buyer)) {
          buyerMap.set(sample.buyer, new Map());
        }
        
        const typeMap = buyerMap.get(sample.buyer)!;
        if (!typeMap.has(sample.sampleType)) {
          typeMap.set(sample.sampleType, { requested: 0, sewn: 0 });
        }
        
        typeMap.get(sample.sampleType)!.sewn += sewnPieceCount;
      }
    });
    
    // Convert Map to array
    const detailedSummary: DetailedSummary[] = [];
    buyerMap.forEach((typeMap, buyer) => {
      typeMap.forEach((counts, sampleType) => {
        detailedSummary.push({
          sampleType,
          buyer,
          requested: counts.requested,
          sewn: counts.sewn
        });
      });
    });
    
    // Sort by buyer first, then by sample type
    detailedSummary.sort((a, b) => {
      if (a.buyer !== b.buyer) {
        return a.buyer.localeCompare(b.buyer);
      }
      return a.sampleType.localeCompare(b.sampleType);
    });
    
    setDetailedData(detailedSummary);
  }, [selectedYear, selectedMonth, processedSamples]);

  // Handler functions
  const handleYearClick = (year: number) => {
    setSelectedYear(year);
    setSelectedMonth(null);
    setViewLevel('monthly');
  };
  
  const handleMonthClick = (month: number) => {
    setSelectedMonth(month);
    setViewLevel('detailed');
  };
  
  const handleBackClick = () => {
    if (viewLevel === 'detailed') {
      setViewLevel('monthly');
      setSelectedMonth(null);
    } else if (viewLevel === 'monthly') {
      setViewLevel('yearly');
      setSelectedYear(null);
    }
  };

  // Helper functions
  const getMonthName = (month: number): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
  };
  
  const calculateYearlyTotals = () => {
    return yearlyData.reduce(
      (totals, year) => ({
        requested: totals.requested + year.requested,
        sewn: totals.sewn + year.sewn
      }),
      { requested: 0, sewn: 0 }
    );
  };
  
  const calculateMonthlyTotals = () => {
    return monthlyData.reduce(
      (totals, month) => ({
        requested: totals.requested + month.requested,
        sewn: totals.sewn + month.sewn
      }),
      { requested: 0, sewn: 0 }
    );
  };
  
  const calculateDetailedTotals = () => {
    return detailedData.reduce(
      (totals, detail) => ({
        requested: totals.requested + detail.requested,
        sewn: totals.sewn + detail.sewn
      }),
      { requested: 0, sewn: 0 }
    );
  };
  
  const prepareYearlyChartData = () => {
    return yearlyData.map(year => ({
      name: year.year.toString(),
      Requested: year.requested,
      Sewn: year.sewn
    }));
  };
  
  const prepareMonthlyChartData = () => {
    return monthlyData.map(month => ({
      name: getMonthName(month.month),
      Requested: month.requested,
      Sewn: month.sewn
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-medium text-gray-700">Loading report data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl font-medium text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-6">
            <button onClick={() => setIsSidebarOpen(true)} className="mr-4">
              <Menu size={24} />
            </button>
            
            <h2 className="text-2xl font-bold text-gray-900">
              {viewLevel === 'yearly' ? 'Yearly Sampling Report' : 
               viewLevel === 'monthly' ? `Monthly Sampling Report for ${selectedYear}` : 
               `Sampling Details for ${getMonthName(selectedMonth!)} ${selectedYear}`}
            </h2>
            
            {viewLevel !== 'yearly' && (
              <button
                onClick={handleBackClick}
                className="ml-4 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowLeftIcon /> Back
              </button>
            )}
          </div>

          {/* Chart Section */}
          <div className="mb-8 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={viewLevel === 'yearly' ? prepareYearlyChartData() : prepareMonthlyChartData()}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Requested" fill="#8884d8" />
                <Bar dataKey="Sewn" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Yearly View */}
          {viewLevel === 'yearly' && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sewn</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {yearlyData.map((year) => (
                      <tr 
                        key={year.year} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleYearClick(year.year)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{year.year}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{year.requested}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{year.sewn}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {year.requested > 0 ? Math.round((year.sewn / year.requested) * 100) : 0}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button 
                            className="text-indigo-600 hover:text-indigo-900 flex items-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleYearClick(year.year);
                            }}
                          >
                            View Details
                            <ChevronRightIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{calculateYearlyTotals().requested}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{calculateYearlyTotals().sewn}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {calculateYearlyTotals().requested > 0 
                          ? Math.round((calculateYearlyTotals().sewn / calculateYearlyTotals().requested) * 100)
                          : 0}%
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sample Type Breakdown - Yearly View */}
              <div className="mt-8 px-6 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Breakdown by Buyer and Sample Type</h3>
                <div className="grid grid-cols-1 gap-6">
                  {yearlyData.map((year) => (
                    <div key={year.year} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-4 text-xl">{year.year}</h4>
                      
                      {Object.entries(year.byBuyer).map(([buyer, buyerData]) => (
                        <div key={buyer} className="mb-6">
                          <h5 className="text-lg font-bold text-indigo-800 mb-3 border-b border-indigo-200 pb-2 bg-indigo-50 px-3 py-2 rounded-t-md shadow-sm">
                            {buyer}
                          </h5>
                          <table className="min-w-full mb-3">
                            <thead>
                              <tr>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Type</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Requested</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Sewn</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Completion Rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(buyerData.byType).map(([type, data]) => (
                                <tr key={type}>
                                  <td className="py-1 text-sm text-gray-900 w-1/4">{type}</td>
                                  <td className="py-1 text-sm text-gray-500 w-1/4">{data.requested}</td>
                                  <td className="py-1 text-sm text-gray-500 w-1/4">{data.sewn}</td>
                                  <td className="py-1 text-sm text-gray-500 w-1/4">
                                    {data.requested > 0 ? Math.round((data.sewn / data.requested) * 100) : 0}%
                                  </td>
                                </tr>
                              ))}
                              <tr className="font-semibold border-t">
                                <td className="py-1 text-sm text-gray-900 w-1/4">Total</td>
                                <td className="py-1 text-sm text-gray-900 w-1/4">{buyerData.requested}</td>
                                <td className="py-1 text-sm text-gray-900 w-1/4">{buyerData.sewn}</td>
                                <td className="py-1 text-sm text-gray-900 w-1/4">
                                  {buyerData.requested > 0 ? Math.round((buyerData.sewn / buyerData.requested) * 100) : 0}%
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ))}
                      
                      {/* Year Total */}
                      <div className="mt-4 pt-2 border-t-2 border-gray-300">
                        <h5 className="font-medium text-gray-900 mb-2">Year Total</h5>
                        <table className="min-w-full">
                          <thead>
                            <tr>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Type</th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Requested</th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Sewn</th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Completion Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(year.byType).map(([type, data]) => (
                              <tr key={type}>
                                <td className="py-1 text-sm text-gray-900 w-1/4">{type}</td>
                                <td className="py-1 text-sm text-gray-500 w-1/4">{data.requested}</td>
                                <td className="py-1 text-sm text-gray-500 w-1/4">{data.sewn}</td>
                                <td className="py-1 text-sm text-gray-500 w-1/4">
                                  {data.requested > 0 ? Math.round((data.sewn / data.requested) * 100) : 0}%
                                </td>
                              </tr>
                            ))}
                            <tr className="font-semibold border-t">
                              <td className="py-1 text-sm text-gray-900 w-1/4">Total</td>
                              <td className="py-1 text-sm text-gray-900 w-1/4">{year.requested}</td>
                              <td className="py-1 text-sm text-gray-900 w-1/4">{year.sewn}</td>
                              <td className="py-1 text-sm text-gray-900 w-1/4">
                                {year.requested > 0 ? Math.round((year.sewn / year.requested) * 100) : 0}%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Monthly View */}
          {viewLevel === 'monthly' && selectedYear && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sewn</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyData.map((month) => (
                      <tr 
                        key={month.month} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleMonthClick(month.month)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getMonthName(month.month)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{month.requested}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{month.sewn}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {month.requested > 0 ? Math.round((month.sewn / month.requested) * 100) : 0}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button 
                            className="text-indigo-600 hover:text-indigo-900 flex items-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMonthClick(month.month);
                            }}
                          >
                            View Details
                            <ChevronRightIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Total</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{calculateMonthlyTotals().requested}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{calculateMonthlyTotals().sewn}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {calculateMonthlyTotals().requested > 0 
                          ? Math.round((calculateMonthlyTotals().sewn / calculateMonthlyTotals().requested) * 100)
                          : 0}%
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Sample Type Breakdown - Monthly View */}
              <div className="mt-8 px-6 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Breakdown by Buyer and Sample Type</h3>
                <div className="grid grid-cols-1 gap-6">
                  {monthlyData.map((month) => (
                    <div key={month.month} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-4 text-xl">{getMonthName(month.month)}</h4>
                      
                      {Object.entries(month.byBuyer).map(([buyer, buyerData]) => (
                        <div key={buyer} className="mb-6">
                          <h5 className="text-lg font-bold text-indigo-800 mb-3 border-b border-indigo-200 pb-2 bg-indigo-50 px-3 py-2 rounded-t-md shadow-sm">
                            {buyer}
                          </h5>
                          <table className="min-w-full mb-3">
                            <thead>
                              <tr>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Type</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Requested</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Sewn</th>
                                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Completion Rate</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(buyerData.byType).map(([type, data]) => (
                                <tr key={type}>
                                  <td className="py-1 text-sm text-gray-900 w-1/4">{type}</td>
                                  <td className="py-1 text-sm text-gray-500 w-1/4">{data.requested}</td>
                                  <td className="py-1 text-sm text-gray-500 w-1/4">{data.sewn}</td>
                                  <td className="py-1 text-sm text-gray-500 w-1/4">
                                    {data.requested > 0 ? Math.round((data.sewn / data.requested) * 100) : 0}%
                                  </td>
                                </tr>
                              ))}
                              <tr className="font-semibold border-t">
                                <td className="py-1 text-sm text-gray-900 w-1/4">Total</td>
                                <td className="py-1 text-sm text-gray-900 w-1/4">{buyerData.requested}</td>
                                <td className="py-1 text-sm text-gray-900 w-1/4">{buyerData.sewn}</td>
                                <td className="py-1 text-sm text-gray-900 w-1/4">
                                  {buyerData.requested > 0 ? Math.round((buyerData.sewn / buyerData.requested) * 100) : 0}%
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      ))}
                      
                      {/* Month Total */}
                      <div className="mt-4 pt-2 border-t-2 border-gray-300">
                        <h5 className="font-medium text-gray-900 mb-2">Month Total</h5>
                        <table className="min-w-full">
                          <thead>
                            <tr>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Type</th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Requested</th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Sewn</th>
                              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Completion Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(month.byType).map(([type, data]) => (
                              <tr key={type}>
                                <td className="py-1 text-sm text-gray-900 w-1/4">{type}</td>
                                <td className="py-1 text-sm text-gray-500 w-1/4">{data.requested}</td>
                                <td className="py-1 text-sm text-gray-500 w-1/4">{data.sewn}</td>
                                <td className="py-1 text-sm text-gray-500 w-1/4">
                                  {data.requested > 0 ? Math.round((data.sewn / data.requested) * 100) : 0}%
                                </td>
                              </tr>
                            ))}
                            <tr className="font-semibold border-t">
                              <td className="py-1 text-sm text-gray-900 w-1/4">Total</td>
                              <td className="py-1 text-sm text-gray-900 w-1/4">{month.requested}</td>
                              <td className="py-1 text-sm text-gray-900 w-1/4">{month.sewn}</td>
                              <td className="py-1 text-sm text-gray-900 w-1/4">
                                {month.requested > 0 ? Math.round((month.sewn / month.requested) * 100) : 0}%
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Detailed View */}
          {viewLevel === 'detailed' && selectedYear !== null && selectedMonth !== null && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sample Type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sewn</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      // Group by buyer for rendering
                      const buyerGroups: { [buyer: string]: DetailedSummary[] } = {};
                      detailedData.forEach(detail => {
                        if (!buyerGroups[detail.buyer]) {
                          buyerGroups[detail.buyer] = [];
                        }
                        buyerGroups[detail.buyer].push(detail);
                      });
                      
                      // Render rows with rowspan for buyers
                      return Object.entries(buyerGroups).map(([buyer, details]) => (
                        details.map((detail, idx) => (
                          <tr key={`${detail.buyer}-${detail.sampleType}`} className="hover:bg-gray-50">
                            {idx === 0 && (
                              <td 
                                className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" 
                                rowSpan={details.length}
                              >
                                {detail.buyer}
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{detail.sampleType}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{detail.requested}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{detail.sewn}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {detail.requested > 0 ? Math.round((detail.sewn / detail.requested) * 100) : 0}%
                            </td>
                          </tr>
                        ))
                      )).flat();
                    })()}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={2}>Total</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{calculateDetailedTotals().requested}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{calculateDetailedTotals().sewn}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {calculateDetailedTotals().requested > 0 
                          ? Math.round((calculateDetailedTotals().sewn / calculateDetailedTotals().requested) * 100) 
                          : 0}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary Cards */}
              <div className="mt-8 px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50 p-6 rounded-lg shadow-sm">
                  <div className="text-sm font-medium text-indigo-500">Total Requested</div>
                  <div className="mt-2 text-3xl font-bold text-indigo-900">{calculateDetailedTotals().requested}</div>
                </div>
                <div className="bg-green-50 p-6 rounded-lg shadow-sm">
                  <div className="text-sm font-medium text-green-500">Total Sewn</div>
                  <div className="mt-2 text-3xl font-bold text-green-900">{calculateDetailedTotals().sewn}</div>
                </div>
                <div className="bg-blue-50 p-6 rounded-lg shadow-sm">
                  <div className="text-sm font-medium text-blue-500">Completion Rate</div>
                  <div className="mt-2 text-3xl font-bold text-blue-900">
                    {calculateDetailedTotals().requested > 0 
                      ? Math.round((calculateDetailedTotals().sewn / calculateDetailedTotals().requested) * 100) 
                      : 0}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlySamplingReport;
