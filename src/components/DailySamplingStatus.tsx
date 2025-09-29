'use client';

import { useState, useEffect } from 'react';
import { getDocuments } from '../lib/firebase/firebaseUtils';
import { format, subDays } from 'date-fns';
import { Menu, Download } from 'lucide-react';
import Sidebar from './Sidebar';
import React from 'react';
import * as XLSX from 'xlsx';

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

interface Buyer {
  id: string;
  buyerId: string;
  name: string;
  tailorCounts?: {
    [date: string]: number;
  };
  tailorCountsKnit?: {
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
  tailorsAllottedWoven: number;
  tailorsAllottedKnit: number;
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
  const [fabricCategoryFilter, setFabricCategoryFilter] = useState<'All' | 'Knit' | 'Woven'>('All');
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
        
        // Create a set of existing sample IDs for quick lookup
        const existingSampleIds = new Set(samples.map(sample => sample.sampleId));
        
        // Calculate total sewn pieces per sample up to the previous day
        const totalSewnPieces: { [sampleId: string]: number } = {};
        outputs.forEach(output => {
          if (output.date < selectedDate) { // Only consider outputs before selected date
            Object.entries(output.outputs).forEach(([sampleId, sampleOutput]) => {
              // Only count outputs for samples that still exist
              if (existingSampleIds.has(sampleId)) {
                totalSewnPieces[sampleId] = (totalSewnPieces[sampleId] || 0) + (sampleOutput.SEW || 0);
              }
            });
          }
        });
        
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
              tailorsAllottedWoven: buyer.tailorCounts?.[selectedDate] || 0,
              tailorsAllottedKnit: buyer.tailorCountsKnit?.[selectedDate] || 0
            };

            // Calculate opening balance and new indents
            samples.forEach(sample => {
              if (
                sample.buyerId === buyer.buyerId && 
                ((sample.isArchived === undefined || sample.isArchived === false) || 
                 (sample.changeTracking?.archived?.timestamp && 
                  sample.changeTracking.archived.timestamp.split('T')[0] >= selectedDate)) &&
                (fabricCategoryFilter === 'All' || sample.fabricCategory === fabricCategoryFilter)
              ) {
                const totalPieces = Number(sample.noOfPieces) || 0;
                const sewnPieces = totalSewnPieces[sample.sampleId] || 0;
                const remainingPieces = Math.max(0, totalPieces - sewnPieces);
                
                if (remainingPieces > 0) { // Only count if there are remaining pieces
                  const sampleType = getSampleType(sample.typeOfSample);
                  
                  if (sample.fabricTrimsReceiptDate && sample.fabricTrimsReceiptDate <= previousDay) {
                    status.openingBalance[sampleType] += remainingPieces;
                    status.openingBalance.total += remainingPieces;
                  } 
                  else if (sample.fabricTrimsReceiptDate === selectedDate) {
                    status.newIndents[sampleType] += remainingPieces;
                    status.newIndents.total += remainingPieces;
                  }
                }
              }
            });

            // Calculate today's output
            const todaysOutput = outputs.find(
              output => output.date === selectedDate && output.buyerId === buyer.buyerId
            );

            if (todaysOutput) {
              status.todaysOutput = Object.entries(todaysOutput.outputs)
                .reduce((sum, [sampleId, output]) => {
                  // Only count outputs for samples that still exist and match fabric category filter
                  if (existingSampleIds.has(sampleId)) {
                    const sample = samples.find(s => s.sampleId === sampleId);
                    if (sample && (fabricCategoryFilter === 'All' || sample.fabricCategory === fabricCategoryFilter)) {
                      return sum + (output.SEW || 0);
                    }
                  }
                  return sum;
                }, 0);
            }

            // Calculate total balance
            status.totalBalance = status.openingBalance.total + 
                                status.newIndents.total - 
                                status.todaysOutput;

            return status;
          })
        );

        const filteredStatusData = buyerStatusData.filter(data => {
          // For specific fabric categories (Knit/Woven), hide buyers with 0 total pending
          if (fabricCategoryFilter === 'Knit' || fabricCategoryFilter === 'Woven') {
            const totalPending = data.openingBalance.total + data.newIndents.total;
            if (totalPending === 0) {
              return false;
            }
          }
          
          // Original filtering logic
          return data.openingBalance.total > 0 || 
                 data.newIndents.total > 0 || 
                 data.todaysOutput > 0 ||
                 data.tailorsAllottedWoven > 0 ||
                 data.tailorsAllottedKnit > 0;
        });

        setStatusData(filteredStatusData);

        // Calculate daily summary
        const summary = filteredStatusData.reduce((acc, buyer) => {
          acc.totalOpeningBalance += buyer.openingBalance.total;
          acc.totalNewIndents += buyer.newIndents.total;
          acc.totalOutput += buyer.todaysOutput;
          
          // Add tailors based on fabric category filter
          if (fabricCategoryFilter === 'All') {
            acc.totalTailors += buyer.tailorsAllottedWoven + buyer.tailorsAllottedKnit;
          } else if (fabricCategoryFilter === 'Woven') {
            acc.totalTailors += buyer.tailorsAllottedWoven;
          } else if (fabricCategoryFilter === 'Knit') {
            acc.totalTailors += buyer.tailorsAllottedKnit;
          }
          
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
  }, [selectedDate, fabricCategoryFilter]);

  const getSampleType = (type: string): keyof BuyerStatusData['openingBalance'] => {
    type = type.toUpperCase();
    if (type === 'FIT') return 'Fit';
    if (type === 'PP') return 'PP';
    if (type === 'GPT') return 'GPT';
    if (type === "SMS/SRS/PA/COLOUR RUN") return "SMS";
    if (type === 'PROTO/COUNTER') return 'Proto';
    return 'Other';
  };

  const downloadExcel = async () => {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Get fresh data for detailed breakdown
    const samples = await getDocuments('samples') as Sample[];
    const outputs = await getDocuments('dailySamplingOutputs') as StoredSampleOutput[];

    // Detailed Buyer Breakdown
    const detailedData = [
      [''],
      ['', 'Daily Sampling Status Report'],
      ['', 'Date:', selectedDate],
      ['', 'Fabric Category Filter:', fabricCategoryFilter],
      [''],
      [
        '',
        'Buyer',
        '',
        'Proto',
        'Fit',
        'PP',
        'GPT',
        'SMS',
        'Other',
        'Total Opening Balance',
        'New Indents',
        'Total',
        'Today\'s Output',
        'Total Balance',
        fabricCategoryFilter === 'All' ? 'Total Tailors' : 
        fabricCategoryFilter === 'Woven' ? 'Woven Tailors' : 'Knit Tailors'
      ],
      ['']
    ];

    // Calculate today's output by sample type for each buyer
    const todaysOutputBySampleType: { [buyerId: string]: { [sampleType: string]: number } } = {};
    
    outputs.forEach(output => {
      if (output.date === selectedDate) {
        if (!todaysOutputBySampleType[output.buyerId]) {
          todaysOutputBySampleType[output.buyerId] = {
            Proto: 0, Fit: 0, PP: 0, GPT: 0, SMS: 0, Other: 0
          };
        }
        
        Object.entries(output.outputs).forEach(([sampleId, sampleOutput]) => {
          const sample = samples.find(s => s.sampleId === sampleId);
          if (sample && 
              (fabricCategoryFilter === 'All' || sample.fabricCategory === fabricCategoryFilter)) {
            const sampleType = getSampleType(sample.typeOfSample);
            todaysOutputBySampleType[output.buyerId][sampleType] += (sampleOutput.SEW || 0);
          }
        });
      }
    });

    statusData.forEach(buyer => {
      const todaysOutputByType = todaysOutputBySampleType[buyer.buyerId] || {
        Proto: 0, Fit: 0, PP: 0, GPT: 0, SMS: 0, Other: 0
      };

      // Buyer header row
      detailedData.push(['', buyer.buyerName, '', '', '', '', '', '', '', '', '', '', '', '', '']);
      
      // Opening Balance row
      detailedData.push([
        '',
        '',
        'Opening Balance',
        buyer.openingBalance.Proto > 0 ? buyer.openingBalance.Proto.toString() : '',
        buyer.openingBalance.Fit > 0 ? buyer.openingBalance.Fit.toString() : '',
        buyer.openingBalance.PP > 0 ? buyer.openingBalance.PP.toString() : '',
        buyer.openingBalance.GPT > 0 ? buyer.openingBalance.GPT.toString() : '',
        buyer.openingBalance.SMS > 0 ? buyer.openingBalance.SMS.toString() : '',
        buyer.openingBalance.Other > 0 ? buyer.openingBalance.Other.toString() : '',
        buyer.openingBalance.total.toString(),
        '',
        '',
        '',
        '',
        ''
      ]);

      // New Indents row
      detailedData.push([
        '',
        '',
        'New Indents rcvd',
        buyer.newIndents.Proto > 0 ? buyer.newIndents.Proto.toString() : '',
        buyer.newIndents.Fit > 0 ? buyer.newIndents.Fit.toString() : '',
        buyer.newIndents.PP > 0 ? buyer.newIndents.PP.toString() : '',
        buyer.newIndents.GPT > 0 ? buyer.newIndents.GPT.toString() : '',
        buyer.newIndents.SMS > 0 ? buyer.newIndents.SMS.toString() : '',
        buyer.newIndents.Other > 0 ? buyer.newIndents.Other.toString() : '',
        '',
        buyer.newIndents.total.toString(),
        '',
        '',
        '',
        ''
      ]);

      // Total row
      const totalProto = buyer.openingBalance.Proto + buyer.newIndents.Proto;
      const totalFit = buyer.openingBalance.Fit + buyer.newIndents.Fit;
      const totalPP = buyer.openingBalance.PP + buyer.newIndents.PP;
      const totalGPT = buyer.openingBalance.GPT + buyer.newIndents.GPT;
      const totalSMS = buyer.openingBalance.SMS + buyer.newIndents.SMS;
      const totalOther = buyer.openingBalance.Other + buyer.newIndents.Other;
      const grandTotal = totalProto + totalFit + totalPP + totalGPT + totalSMS + totalOther;

      detailedData.push([
        '',
        '',
        'Total',
        totalProto > 0 ? totalProto.toString() : '',
        totalFit > 0 ? totalFit.toString() : '',
        totalPP > 0 ? totalPP.toString() : '',
        totalGPT > 0 ? totalGPT.toString() : '',
        totalSMS > 0 ? totalSMS.toString() : '',
        totalOther > 0 ? totalOther.toString() : '',
        '',
        '',
        grandTotal.toString(),
        '',
        '',
        ''
      ]);

      // Today's Output row
      const tailorCount = fabricCategoryFilter === 'All' 
        ? buyer.tailorsAllottedWoven + buyer.tailorsAllottedKnit
        : fabricCategoryFilter === 'Woven' 
        ? buyer.tailorsAllottedWoven 
        : buyer.tailorsAllottedKnit;
      
      detailedData.push([
        '',
        '',
        'Today\'s output',
        todaysOutputByType.Proto > 0 ? todaysOutputByType.Proto.toString() : '',
        todaysOutputByType.Fit > 0 ? todaysOutputByType.Fit.toString() : '',
        todaysOutputByType.PP > 0 ? todaysOutputByType.PP.toString() : '',
        todaysOutputByType.GPT > 0 ? todaysOutputByType.GPT.toString() : '',
        todaysOutputByType.SMS > 0 ? todaysOutputByType.SMS.toString() : '',
        todaysOutputByType.Other > 0 ? todaysOutputByType.Other.toString() : '',
        '',
        '',
        '',
        buyer.todaysOutput.toString(),
        '',
        tailorCount.toString()
      ]);

      // Total Balance row
      const balanceProto = totalProto - todaysOutputByType.Proto;
      const balanceFit = totalFit - todaysOutputByType.Fit;
      const balancePP = totalPP - todaysOutputByType.PP;
      const balanceGPT = totalGPT - todaysOutputByType.GPT;
      const balanceSMS = totalSMS - todaysOutputByType.SMS;
      const balanceOther = totalOther - todaysOutputByType.Other;

      detailedData.push([
        '',
        '',
        'Total balance',
        balanceProto > 0 ? balanceProto.toString() : '',
        balanceFit > 0 ? balanceFit.toString() : '',
        balancePP > 0 ? balancePP.toString() : '',
        balanceGPT > 0 ? balanceGPT.toString() : '',
        balanceSMS > 0 ? balanceSMS.toString() : '',
        balanceOther > 0 ? balanceOther.toString() : '',
        '',
        '',
        '',
        '',
        buyer.totalBalance.toString(),
        '',
        ''
      ]);

      // Empty row for spacing
      detailedData.push(['', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
    });

    // Calculate totals
    const totals = {
      openingBalance: { Proto: 0, Fit: 0, PP: 0, GPT: 0, SMS: 0, Other: 0, total: 0 },
      newIndents: { Proto: 0, Fit: 0, PP: 0, GPT: 0, SMS: 0, Other: 0, total: 0 },
      todaysOutput: { Proto: 0, Fit: 0, PP: 0, GPT: 0, SMS: 0, Other: 0, total: 0 },
      totalBalance: { Proto: 0, Fit: 0, PP: 0, GPT: 0, SMS: 0, Other: 0, total: 0 },
      totalTailors: 0
    };

    statusData.forEach(buyer => {
      const todaysOutputByType = todaysOutputBySampleType[buyer.buyerId] || {
        Proto: 0, Fit: 0, PP: 0, GPT: 0, SMS: 0, Other: 0
      };

      // Sum opening balances
      totals.openingBalance.Proto += buyer.openingBalance.Proto;
      totals.openingBalance.Fit += buyer.openingBalance.Fit;
      totals.openingBalance.PP += buyer.openingBalance.PP;
      totals.openingBalance.GPT += buyer.openingBalance.GPT;
      totals.openingBalance.SMS += buyer.openingBalance.SMS;
      totals.openingBalance.Other += buyer.openingBalance.Other;
      totals.openingBalance.total += buyer.openingBalance.total;

      // Sum new indents
      totals.newIndents.Proto += buyer.newIndents.Proto;
      totals.newIndents.Fit += buyer.newIndents.Fit;
      totals.newIndents.PP += buyer.newIndents.PP;
      totals.newIndents.GPT += buyer.newIndents.GPT;
      totals.newIndents.SMS += buyer.newIndents.SMS;
      totals.newIndents.Other += buyer.newIndents.Other;
      totals.newIndents.total += buyer.newIndents.total;

      // Sum today's output
      totals.todaysOutput.Proto += todaysOutputByType.Proto;
      totals.todaysOutput.Fit += todaysOutputByType.Fit;
      totals.todaysOutput.PP += todaysOutputByType.PP;
      totals.todaysOutput.GPT += todaysOutputByType.GPT;
      totals.todaysOutput.SMS += todaysOutputByType.SMS;
      totals.todaysOutput.Other += todaysOutputByType.Other;
      totals.todaysOutput.total += buyer.todaysOutput;

      // Sum total balances
      totals.totalBalance.Proto += (buyer.openingBalance.Proto + buyer.newIndents.Proto - todaysOutputByType.Proto);
      totals.totalBalance.Fit += (buyer.openingBalance.Fit + buyer.newIndents.Fit - todaysOutputByType.Fit);
      totals.totalBalance.PP += (buyer.openingBalance.PP + buyer.newIndents.PP - todaysOutputByType.PP);
      totals.totalBalance.GPT += (buyer.openingBalance.GPT + buyer.newIndents.GPT - todaysOutputByType.GPT);
      totals.totalBalance.SMS += (buyer.openingBalance.SMS + buyer.newIndents.SMS - todaysOutputByType.SMS);
      totals.totalBalance.Other += (buyer.openingBalance.Other + buyer.newIndents.Other - todaysOutputByType.Other);
      totals.totalBalance.total += buyer.totalBalance;

      // Sum tailors based on fabric category filter
      if (fabricCategoryFilter === 'All') {
        totals.totalTailors += buyer.tailorsAllottedWoven + buyer.tailorsAllottedKnit;
      } else if (fabricCategoryFilter === 'Woven') {
        totals.totalTailors += buyer.tailorsAllottedWoven;
      } else if (fabricCategoryFilter === 'Knit') {
        totals.totalTailors += buyer.tailorsAllottedKnit;
      }
    });

    // Add single totals row
    const grandTotal = totals.openingBalance.total + totals.newIndents.total;
    detailedData.push([
      '',
      'TOTALS',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      totals.openingBalance.total.toString(),
      totals.newIndents.total.toString(),
      grandTotal.toString(),
      totals.todaysOutput.total.toString(),
      totals.totalBalance.total.toString(),
      totals.totalTailors.toString()
    ]);

    const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
    
    // Apply formatting to all cells


    XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Daily Sampling Status');

    // Generate filename with date and fabric category
    const filename = `Daily_Sampling_Status_${selectedDate}_${fabricCategoryFilter}.xlsx`;

    // Download the file
    XLSX.writeFile(workbook, filename);
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
            
            <div className="flex items-center gap-4">
              <div>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border rounded-md p-2"
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

              {/* Download Excel Button */}
              <button
                onClick={downloadExcel}
                disabled={loading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
              >
                <Download size={18} />
                <span>Export Excel</span>
              </button>
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
                <div className="text-sm text-gray-500">Today&apos;s Output</div>
                <div className="text-xl font-bold text-green-600">{dailySummary.totalOutput}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">Total Balance</div>
                <div className="text-xl font-bold text-blue-600">{dailySummary.totalBalance}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">
                  {fabricCategoryFilter === 'All' ? 'Total Tailors' : 
                   fabricCategoryFilter === 'Woven' ? 'Woven Tailors' : 'Knit Tailors'}
                </div>
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
                <div className="flex gap-2">
                  {(() => {
                    let tailorCount = 0;
                    let tailorLabel = '';
                    
                    if (fabricCategoryFilter === 'All') {
                      tailorCount = buyer.tailorsAllottedWoven + buyer.tailorsAllottedKnit;
                      tailorLabel = 'Total Tailors';
                    } else if (fabricCategoryFilter === 'Woven') {
                      tailorCount = buyer.tailorsAllottedWoven;
                      tailorLabel = 'Woven Tailors';
                    } else if (fabricCategoryFilter === 'Knit') {
                      tailorCount = buyer.tailorsAllottedKnit;
                      tailorLabel = 'Knit Tailors';
                    }
                    
                    return tailorCount > 0 ? (
                      <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                        {tailorCount} {tailorLabel}
                      </div>
                    ) : null;
                  })()}
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
                    <span>Today&apos;s Output:</span>
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