'use client';

import { useState, useEffect } from 'react';
import { getDocuments } from '../lib/firebase/firebaseUtils';
import { format, subDays } from 'date-fns';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { Button } from './ui/button';
import React from 'react';

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
}

interface Buyer {
  id: string;
  buyerId: string;
  name: string;
  tailorCounts?: {
    [date: string]: number;
  };
}

interface StoredSampleOutput {
  id?: string;
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

interface BuyerStatusData {
  buyerId: string;
  buyerName: string;
  openingBalance: {
    Proto: number;
    Fit: number;
    PP: number;
    GPT: number;
    SMS: number;
    Other: number;
    total: number;
  };
  newIndents: {
    Proto: number;
    Fit: number;
    PP: number;
    GPT: number;
    SMS: number;
    Other: number;
    total: number;
  };
  todaysOutput: number;
  totalBalance: number;
  tailorsAllotted: number;
}

interface DailySummary {
  totalOpeningBalance: number;
  totalNewIndents: number;
  totalOutput: number;
  totalBalance: number;
  totalTailors: number;
  outputPerTailor: number;
}

export default function DailySamplingStatus() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<BuyerStatusData[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary>({
    totalOpeningBalance: 0,
    totalNewIndents: 0,
    totalOutput: 0,
    totalBalance: 0,
    totalTailors: 0,
    outputPerTailor: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const buyers = await getDocuments('buyer') as Buyer[];
        const samples = await getDocuments('samples') as Sample[];
        const outputs = await getDocuments('dailySamplingOutputs') as StoredSampleOutput[];

        const previousDay = format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd');
        
        const buyerStatusData: BuyerStatusData[] = await Promise.all(
          buyers.map(async (buyer) => {
            // Initialize counters
            const status: BuyerStatusData = {
              buyerId: buyer.buyerId,
              buyerName: buyer.name,
              openingBalance: {
                Proto: 0, Fit: 0, PP: 0, GPT: 0, SMS: 0, Other: 0, total: 0
              },
              newIndents: {
                Proto: 0, Fit: 0, PP: 0, GPT: 0, SMS: 0, Other: 0, total: 0
              },
              todaysOutput: 0,
              totalBalance: 0,
              tailorsAllotted: buyer.tailorCounts?.[selectedDate] || 0
            };

            // Calculate opening balance and new indents
            samples.forEach(sample => {
              if (
                sample.buyerId === buyer.buyerId &&
                !sample.isArchived &&
                sample.status !== 'Garment Ready' &&
                sample.status !== 'Dispatched'
              ) {
                const count = Number(sample.noOfPieces) || 0;
                const sampleType = getSampleType(sample.typeOfSample);                
                if (sample.fabricTrimsReceiptDate && sample.fabricTrimsReceiptDate <= previousDay) {
                    status.openingBalance[sampleType] += count;
                    status.openingBalance.total += count;
                } 
                else if (sample.fabricTrimsReceiptDate === selectedDate) {
                    status.newIndents[sampleType] += count;
                    status.newIndents.total += count;
                }          
              }
            });

            // Calculate today's output
            const todaysOutput = outputs.find(
              output => output.date === selectedDate && output.buyerId === buyer.buyerId
            );

            if (todaysOutput) {
              status.todaysOutput = Object.values(todaysOutput.outputs)
                .reduce((sum, output) => sum + (output.SEW || 0), 0);
            }

            // Calculate total balance
            status.totalBalance = status.openingBalance.total + 
                                status.newIndents.total - 
                                status.todaysOutput;

            return status;
          })
        );

        const filteredStatusData = buyerStatusData.filter(data => 
          data.openingBalance.total > 0 || 
          data.newIndents.total > 0 || 
          data.todaysOutput > 0 ||
          data.tailorsAllotted > 0
        );

        setStatusData(filteredStatusData);

        // Calculate daily summary
        const summary = filteredStatusData.reduce((acc, buyer) => {
          acc.totalOpeningBalance += buyer.openingBalance.total;
          acc.totalNewIndents += buyer.newIndents.total;
          acc.totalOutput += buyer.todaysOutput;
          acc.totalTailors += buyer.tailorsAllotted;
          return acc;
        }, {
          totalOpeningBalance: 0,
          totalNewIndents: 0,
          totalOutput: 0,
          totalTailors: 0,
          totalBalance: 0,
          outputPerTailor: 0
        });

        summary.totalBalance = summary.totalOpeningBalance + summary.totalNewIndents - summary.totalOutput;
        summary.outputPerTailor = summary.totalTailors > 0 
          ? Number((summary.totalOutput / summary.totalTailors).toFixed(2))
          : 0;

        setDailySummary(summary);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  const getSampleType = (type: string): keyof BuyerStatusData['openingBalance'] => {
    type = type.toUpperCase();
    if (type === 'FIT') return 'Fit';
    if (type === 'PP') return 'PP';
    if (type === 'GPT') return 'GPT';
    if (type === 'SMS/SRS/PA/COLOUR RUN') return 'SMS';
    if (type === 'PROTO/COUNTER') return 'Proto';
    return 'Other';
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-none bg-white border-b-2 border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button onClick={() => setIsSidebarOpen(true)} className="mr-4">
                <Menu size={24} />
              </button>
              <h1 className="text-2xl font-bold">Daily Sampling Status</h1>
            </div>
            
            <div className="w-64">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border rounded-md p-2"
              />
            </div>
          </div>

          {/* Daily Summary Section */}
          <div className="bg-blue-50 rounded-lg p-4 shadow-md">
            <h2 className="text-lg font-semibold mb-4">Daily Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">Opening Balance</div>
                <div className="text-xl font-bold">{dailySummary.totalOpeningBalance}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">New Indents</div>
                <div className="text-xl font-bold">{dailySummary.totalNewIndents}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">Total Pending</div>
                <div className="text-xl font-bold text-orange-600">
                  {dailySummary.totalOpeningBalance + dailySummary.totalNewIndents}
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">Today's Output</div>
                <div className="text-xl font-bold text-green-600">{dailySummary.totalOutput}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">Total Balance</div>
                <div className="text-xl font-bold text-blue-600">{dailySummary.totalBalance}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">Total Tailors</div>
                <div className="text-xl font-bold">{dailySummary.totalTailors}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">Output per Tailor</div>
                <div className="text-xl font-bold text-purple-600">{dailySummary.outputPerTailor}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Buyer Section */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid gap-6">
          {statusData.map((buyer) => (
            <div key={buyer.buyerId} className="bg-white rounded-lg shadow-lg border-2 border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{buyer.buyerName}</h2>
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  {buyer.tailorsAllotted} Tailors
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Opening Balance</h3>
                  <div className="min-h-[96px] grid grid-cols-[120px,1fr] gap-y-1 text-sm">
                    {Object.entries(buyer.openingBalance).map(([type, count]) => (
                      type !== 'total' && count > 0 && (
                        <React.Fragment key={type}>
                          <span>{type}:</span>
                          <span className="text-right font-medium">{count}</span>
                        </React.Fragment>
                      )
                    ))}
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="grid grid-cols-[120px,1fr] text-sm font-medium">
                      <span>Total:</span>
                      <span className="text-right">{buyer.openingBalance.total}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">New Indents</h3>
                  <div className="min-h-[96px] grid grid-cols-[120px,1fr] gap-y-1 text-sm">
                    {Object.entries(buyer.newIndents).map(([type, count]) => (
                      type !== 'total' && count > 0 && (
                        <React.Fragment key={type}>
                          <span>{type}:</span>
                          <span className="text-right font-medium">{count}</span>
                        </React.Fragment>
                      )
                    ))}
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="grid grid-cols-[120px,1fr] text-sm font-medium">
                      <span>Total:</span>
                      <span className="text-right">{buyer.newIndents.total}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Summary</h3>
                  <div className="min-h-[96px] grid grid-cols-[120px,1fr] gap-y-1 text-sm">
                    <span>Total Pending:</span>
                    <span className="text-right font-medium">
                      {buyer.openingBalance.total + buyer.newIndents.total}
                    </span>
                    <span>Today's Output:</span>
                    <span className="text-right font-medium text-green-600">
                      {buyer.todaysOutput}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="grid grid-cols-[120px,1fr] text-sm font-medium">
                      <span>Balance:</span>
                      <span className="text-right text-blue-600">{buyer.totalBalance}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
} 