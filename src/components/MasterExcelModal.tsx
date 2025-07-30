import React, { useState } from 'react';
import { getDocuments } from '../lib/firebase/firebaseUtils';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface MasterExcelModalProps {
  onClose: () => void;
  samples: any[];
}

interface ProductionOutput {
  CUT: number;
  SEW: number;
  FINISH: number;
  inspected?: number;
  pass?: number;
  alter?: number;
  passAlter?: number;
  reject?: number;
}

const MasterExcelModal: React.FC<MasterExcelModalProps> = ({ onClose, samples }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fabricCategory, setFabricCategory] = useState<'All' | 'Knit' | 'Woven'>('All');

  const calculateConsumption = (sample: any, outputs: any) => {
    const sampleOutputs = Object.values(outputs).reduce((acc: ProductionOutput, doc: any) => {
      const output = doc.outputs[sample.sampleId];
      if (output) {
        acc.CUT = (acc.CUT || 0) + (output.CUT || 0);
        acc.SEW = (acc.SEW || 0) + (output.SEW || 0);
        acc.FINISH = (acc.FINISH || 0) + (output.FINISH || 0);
        
        // Accumulate QC data
        acc.inspected = (acc.inspected || 0) + (output.inspected || 0);
        acc.pass = (acc.pass || 0) + (output.pass || 0);
        acc.alter = (acc.alter || 0) + (output.alter || 0);
        acc.passAlter = (acc.passAlter || 0) + (output.passAlter || 0);
        acc.reject = (acc.reject || 0) + (output.reject || 0);
      }
      return acc;
    }, {
      CUT: 0,
      SEW: 0,
      FINISH: 0,
      inspected: 0,
      pass: 0,
      alter: 0,
      passAlter: 0,
      reject: 0
    });

    const approvedConsumption = sample.noOfPieces && sample.requiredFabricQty
      ? (sample.requiredFabricQty / sample.noOfPieces).toFixed(2)
      : 0;

    const balFab = sample.balanceLeftoverFabric || 0;
    const actualConsumption = sampleOutputs.SEW && sample.totalFabricQtyRecieved
      ? ((sample.totalFabricQtyRecieved - balFab) / sampleOutputs.SEW).toFixed(2)
      : 0;

    return {
      ...sampleOutputs,
      approvedConsumption,
      actualConsumption
    };
  };

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      // Get all outputs
      const outputs = await getDocuments('dailySamplingOutputs');

      // Filter samples based on date range and fabric category
      let filteredSamples = samples;
      
      // Apply date range filter
      if (startDate && endDate) {
        filteredSamples = filteredSamples.filter(sample => {
          const sampleDate = new Date(sample.timestamp);
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // Include the entire end date
          return sampleDate >= start && sampleDate <= end;
        });
      }
      
      // Apply fabric category filter
      if (fabricCategory !== 'All') {
        filteredSamples = filteredSamples.filter(sample => 
          sample.fabricCategory === fabricCategory
        );
      }

      // Prepare data for Excel
      const excelData = filteredSamples.map(sample => {
        const productionData = calculateConsumption(sample, outputs);
        
        // Process remarks - concatenate all remarks into one string
        const remarksText = sample.remarks && Array.isArray(sample.remarks) 
          ? sample.remarks.map((remark: any) => {
              const date = format(new Date(remark.timestamp), 'dd/MM/yyyy HH:mm');
              return `[${date}] ${remark.user}: ${remark.text}`;
            }).join(' | ')
          : '';
        
        return {
          'Sample ID': sample.sampleId,
          'Timestamp': sample.timestamp,
          'Style': sample.style,
          'Buyer': sample.buyer,
          'Status': sample.status,
          'Pattern No': sample.patternNo,
          'Pattern Status': sample.patternStatus,
          'Type of Sample': sample.typeOfSample,
          'No. of Pieces': sample.noOfPieces,
          'Buyer Request Date': sample.buyerRequestDate,
          'Fabric and Trim Receipt Date': sample.fabricTrimsReceiptDate,
          'Required Completion Date': sample.requiredCompletionDate,
          'Expected Completion Date': sample.expectedCompletionDate,
          'Sample Dispatch Date': sample.SampleDispatchDate,
          'Priority No': sample.samplePriorityNo,
          'Season': sample.season,
          'Fabric Category': sample.fabricCategory,
          'Fabric Type': sample.typeOfFabric,
          'Color': sample.color,
          'Size': sample.size,
          'Wash Type': sample.washType,
          'Required Fabric Qty': sample.requiredFabricQty,
          'Received Fabric Qty': sample.totalFabricQtyRecieved,
          'Reject Fabric Qty': sample.fabricRejectQty,
          'Balance Leftover': sample.balanceLeftoverFabric,
          'Fabric Serial Numbers': sample.fabricSerialNumbers ? sample.fabricSerialNumbers.join(', ') : '',
          'Is Archived': sample.isArchived ? 'Yes' : 'No',
          // Production Outputs
          'CUT': productionData.CUT || 0,
          'SEW': productionData.SEW || 0,
          'FINISH': productionData.FINISH || 0,
          // QC Data
          'QC Inspected': productionData.inspected || 0,
          'QC Pass': productionData.pass || 0,
          'QC Alter': productionData.alter || 0,
          'QC Pass After Alter': productionData.passAlter || 0,
          'QC Reject': productionData.reject || 0,
          // Consumption
          'Approved Consumption (m/pc)': productionData.approvedConsumption,
          'Actual Consumption (m/pc)': productionData.actualConsumption,
          // Remarks (last column)
          'Remarks': remarksText
        };
      });

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Master Data');

      // Save file with filters in filename
      const date = new Date().toISOString().split('T')[0];
      let filename = `Master_Data_${date}`;
      
      if (startDate && endDate) {
        filename += `_${startDate}_to_${endDate}`;
      }
      
      if (fabricCategory !== 'All') {
        filename += `_${fabricCategory}`;
      }
      
      XLSX.writeFile(wb, `${filename}.xlsx`);
      
      onClose();
    } catch (error) {
      console.error('Error generating excel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">
            Download Master Data
          </h3>
          <p className="text-sm text-gray-500">
            Configure filters and download master data
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p>Preparing your download...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Filter Controls */}
            <div className="border-b pb-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Filters</h4>
              
              {/* Date Range Filter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Fabric Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fabric Category
                </label>
                <div className="flex space-x-2">
                  {(['All', 'Knit', 'Woven'] as const).map((category) => (
                    <button
                      key={category}
                      onClick={() => setFabricCategory(category)}
                      className={`px-4 py-2 text-sm rounded-md transition-colors ${
                        fabricCategory === category
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Summary */}
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Applied Filters:</span>
                  {startDate && endDate ? ` Date Range: ${startDate} to ${endDate}` : ' All Dates'}
                  {fabricCategory !== 'All' ? ` | Fabric Category: ${fabricCategory}` : ' | All Fabric Categories'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Download Excel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MasterExcelModal; 