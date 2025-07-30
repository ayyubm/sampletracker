'use client';

import { useState, useEffect, useMemo } from 'react';
import { getDocuments } from '../lib/firebase/firebaseUtils';
import { format } from 'date-fns';
import { Menu, ArrowUp, ArrowDown, Download } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../lib/hooks/useAuth';
import * as XLSX from 'xlsx';

interface Sample {
  id: string;
  sampleId: string;
  buyerId: string;
  buyer: string;
  style: string;
  typeOfSample: string;
  color: string;
  productCategory: string;
  fabricCategory: string;
  fabricTrimsReceiptDate: string;
  status: string;
  noOfPieces: number;
  isArchived: boolean;
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
}

interface QCData {
  sampleId: string;
  buyer: string;
  style: string;
  productCategory: string;
  sampleType: string;
  color: string;
  qtyInspected: number;
  qtyPass: number;
  qtyAlter: number;
  qtyAlterPass: number;
  qtyReject: number;
  remarks: string;
  qcName: string;
}

interface StoredSampleOutput {
  id?: string;
  date: string;
  buyerId: string;
  outputs: {
    [sampleId: string]: {
      CUT?: number;
      SEW?: number;
      FINISH?: number;
      inspected?: number;
      pass?: number;
      alter?: number;
      passAlter?: number;
      reject?: number;
      remark?: string;
      qcName?: string;
    };
  };
}

interface SortConfig {
  key: keyof QCData | null;
  direction: 'asc' | 'desc';
}

interface Filters {
  buyer: string;
  style: string;
  productCategory: string;
  sampleType: string;
  color: string;
  remarks: string;
  qcName: string;
}

export default function DailyQCStatus() {
  const { userData } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fabricCategoryFilter, setFabricCategoryFilter] = useState<'All' | 'Knit' | 'Woven'>('All');
  const [loading, setLoading] = useState(true);
  const [qcData, setQCData] = useState<QCData[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState<Filters>({
    buyer: '',
    style: '',
    productCategory: '',
    sampleType: '',
    color: '',
    remarks: '',
    qcName: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const buyers = await getDocuments('buyer') as Buyer[];
        const samples = await getDocuments('samples') as Sample[];
        const outputs = await getDocuments('dailySamplingOutputs') as StoredSampleOutput[];

        // Create buyer lookup
        const buyerLookup: { [key: string]: string } = {};
        buyers.forEach(buyer => {
          buyerLookup[buyer.buyerId] = buyer.name;
        });

        // Get QC data for the selected date
        const selectedDateOutputs = outputs.filter(output => output.date === selectedDate);
        
        const qcDataArray: QCData[] = [];

        selectedDateOutputs.forEach(output => {
          Object.entries(output.outputs).forEach(([sampleId, sampleOutput]) => {
            // Only include samples with QC data
            if (sampleOutput.inspected && sampleOutput.inspected > 0) {
              const sample = samples.find(s => s.sampleId === sampleId);
              if (sample && 
                  ((sample.isArchived === undefined || sample.isArchived === false) || 
                   (sample.changeTracking?.archived?.timestamp && 
                    sample.changeTracking.archived.timestamp.split('T')[0] >= selectedDate)) &&
                  (fabricCategoryFilter === 'All' || sample.fabricCategory === fabricCategoryFilter)) {
                
                qcDataArray.push({
                  sampleId: sampleId,
                  buyer: buyerLookup[sample.buyerId] || sample.buyerId,
                  style: sample.style,
                  productCategory: sample.productCategory || 'N/A',
                  sampleType: sample.typeOfSample,
                  color: sample.color,
                  qtyInspected: sampleOutput.inspected || 0,
                  qtyPass: sampleOutput.pass || 0,
                  qtyAlter: sampleOutput.alter || 0,
                  qtyAlterPass: sampleOutput.passAlter || 0,
                  qtyReject: sampleOutput.reject || 0,
                  remarks: sampleOutput.remark || '',
                  qcName: sampleOutput.qcName || ''
                });
              }
            }
          });
        });

        setQCData(qcDataArray);
      } catch (error) {
        console.error('Error fetching QC data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate, fabricCategoryFilter]);

  const handleSort = (key: keyof QCData) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      buyer: '',
      style: '',
      productCategory: '',
      sampleType: '',
      color: '',
      remarks: '',
      qcName: ''
    });
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = qcData.filter(item => {
      return (
        item.buyer.toLowerCase().includes(filters.buyer.toLowerCase()) &&
        item.style.toLowerCase().includes(filters.style.toLowerCase()) &&
        item.productCategory.toLowerCase().includes(filters.productCategory.toLowerCase()) &&
        item.sampleType.toLowerCase().includes(filters.sampleType.toLowerCase()) &&
        item.color.toLowerCase().includes(filters.color.toLowerCase()) &&
        item.remarks.toLowerCase().includes(filters.remarks.toLowerCase()) &&
        item.qcName.toLowerCase().includes(filters.qcName.toLowerCase())
      );
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortConfig.direction === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortConfig.direction === 'asc' 
            ? aVal - bVal
            : bVal - aVal;
        }
        
        return 0;
      });
    }

    return filtered;
  }, [qcData, filters, sortConfig]);

  const totalSummary = useMemo(() => {
    return filteredAndSortedData.reduce((acc, item) => ({
      qtyInspected: acc.qtyInspected + item.qtyInspected,
      qtyPass: acc.qtyPass + item.qtyPass,
      qtyAlter: acc.qtyAlter + item.qtyAlter,
      qtyAlterPass: acc.qtyAlterPass + item.qtyAlterPass,
      qtyReject: acc.qtyReject + item.qtyReject,
    }), {
      qtyInspected: 0,
      qtyPass: 0,
      qtyAlter: 0,
      qtyAlterPass: 0,
      qtyReject: 0,
    });
  }, [filteredAndSortedData]);

  const getSortIcon = (key: keyof QCData) => {
    if (sortConfig.key !== key) {
      return <span className="text-gray-400">↕</span>;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp size={14} className="text-blue-500" /> : 
      <ArrowDown size={14} className="text-blue-500" />;
  };

  const handleExcelDownload = () => {
    try {
      // Prepare main data
      const excelData: any[] = filteredAndSortedData.map(item => ({
        'Buyer': item.buyer,
        'Style': item.style,
        'Product Category': item.productCategory,
        'Sample Type': item.sampleType,
        'Color': item.color,
        'Qty Inspected': item.qtyInspected,
        'Qty Pass': item.qtyPass,
        'Qty Alter': item.qtyAlter,
        'Qty Alter Pass': item.qtyAlterPass,
        'Qty Reject': item.qtyReject,
        'Remarks': item.remarks,
        'QC Name': item.qcName
      }));

      // Add empty rows before summary
      excelData.push({
        'Buyer': '',
        'Style': '',
        'Product Category': '',
        'Sample Type': '',
        'Color': '',
        'Qty Inspected': '',
        'Qty Pass': '',
        'Qty Alter': '',
        'Qty Alter Pass': '',
        'Qty Reject': '',
        'Remarks': '',
        'QC Name': ''
      });

      excelData.push({
        'Buyer': '',
        'Style': '',
        'Product Category': '',
        'Sample Type': '',
        'Color': '',
        'Qty Inspected': '',
        'Qty Pass': '',
        'Qty Alter': '',
        'Qty Alter Pass': '',
        'Qty Reject': '',
        'Remarks': '',
        'QC Name': ''
      });

      // Add summary header
      excelData.push({
        'Buyer': 'QC SUMMARY',
        'Style': '',
        'Product Category': '',
        'Sample Type': '',
        'Color': '',
        'Qty Inspected': '',
        'Qty Pass': '',
        'Qty Alter': '',
        'Qty Alter Pass': '',
        'Qty Reject': '',
        'Remarks': '',
        'QC Name': ''
      });

      // Add summary data
      excelData.push({
        'Buyer': 'TOTALS',
        'Style': '',
        'Product Category': '',
        'Sample Type': '',
        'Color': '',
        'Qty Inspected': totalSummary.qtyInspected,
        'Qty Pass': totalSummary.qtyPass,
        'Qty Alter': totalSummary.qtyAlter,
        'Qty Alter Pass': totalSummary.qtyAlterPass,
        'Qty Reject': totalSummary.qtyReject,
        'Remarks': '',
        'QC Name': ''
      });

      // Calculate percentages
      const totalInspected = totalSummary.qtyInspected;
      const passRate = totalInspected > 0 ? ((totalSummary.qtyPass + totalSummary.qtyAlterPass) / totalInspected * 100).toFixed(1) : '0';
      const rejectRate = totalInspected > 0 ? (totalSummary.qtyReject / totalInspected * 100).toFixed(1) : '0';

      // Add percentage analysis
      excelData.push({
        'Buyer': '',
        'Style': '',
        'Product Category': '',
        'Sample Type': '',
        'Color': '',
        'Qty Inspected': '',
        'Qty Pass': '',
        'Qty Alter': '',
        'Qty Alter Pass': '',
        'Qty Reject': '',
        'Remarks': '',
        'QC Name': ''
      });

      excelData.push({
        'Buyer': 'QC PERFORMANCE',
        'Style': '',
        'Product Category': '',
        'Sample Type': '',
        'Color': '',
        'Qty Inspected': '',
        'Qty Pass': '',
        'Qty Alter': '',
        'Qty Alter Pass': '',
        'Qty Reject': '',
        'Remarks': '',
        'QC Name': ''
      });

      excelData.push({
        'Buyer': 'Overall Pass Rate',
        'Style': `${passRate}%`,
        'Product Category': '',
        'Sample Type': '',
        'Color': '',
        'Qty Inspected': '',
        'Qty Pass': '',
        'Qty Alter': '',
        'Qty Alter Pass': '',
        'Qty Reject': '',
        'Remarks': '',
        'QC Name': ''
      });

      excelData.push({
        'Buyer': 'Rejection Rate',
        'Style': `${rejectRate}%`,
        'Product Category': '',
        'Sample Type': '',
        'Color': '',
        'Qty Inspected': '',
        'Qty Pass': '',
        'Qty Alter': '',
        'Qty Alter Pass': '',
        'Qty Reject': '',
        'Remarks': '',
        'QC Name': ''
      });

      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Auto-size columns
      const colWidths = [
        { wch: 15 }, // Buyer
        { wch: 20 }, // Style
        { wch: 15 }, // Product Category
        { wch: 15 }, // Sample Type
        { wch: 12 }, // Color
        { wch: 12 }, // Qty Inspected
        { wch: 10 }, // Qty Pass
        { wch: 10 }, // Qty Alter
        { wch: 12 }, // Qty Alter Pass
        { wch: 10 }, // Qty Reject
        { wch: 25 }, // Remarks
        { wch: 15 }  // QC Name
      ];
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, 'Daily QC Status');

      // Save file
      const dateStr = format(new Date(selectedDate), 'yyyy-MM-dd');
      const fileName = `Daily_QC_Status_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);

    } catch (error) {
      console.error('Error generating Excel file:', error);
      alert('Error generating Excel file. Please try again.');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-none bg-white border-b-2 border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button onClick={() => setIsSidebarOpen(true)} className="mr-4">
                <Menu size={24} />
              </button>
              <h1 className="text-2xl font-bold">Daily QC Status</h1>
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
              
              <button
                onClick={clearAllFilters}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Clear All Filters
              </button>
              
              <button
                onClick={handleExcelDownload}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                disabled={filteredAndSortedData.length === 0}
              >
                <Download size={18} />
                <span>Download Excel</span>
              </button>
            </div>
          </div>

          {/* Summary Section */}
          <div className="bg-blue-50 rounded-lg p-4 shadow-md mb-6">
            <h2 className="text-lg font-semibold mb-4">QC Summary for {format(new Date(selectedDate), 'dd/MM/yyyy')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">Total Inspected</div>
                <div className="text-xl font-bold text-blue-600">{totalSummary.qtyInspected}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">Passed</div>
                <div className="text-xl font-bold text-green-600">{totalSummary.qtyPass}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">For Alter</div>
                <div className="text-xl font-bold text-yellow-600">{totalSummary.qtyAlter}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">Pass After Alter</div>
                <div className="text-xl font-bold text-blue-600">{totalSummary.qtyAlterPass}</div>
              </div>
              <div className="bg-white p-3 rounded-lg shadow">
                <div className="text-sm text-gray-500">Rejected</div>
                <div className="text-xl font-bold text-red-600">{totalSummary.qtyReject}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-lg shadow-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex flex-col space-y-1">
                      <button 
                        onClick={() => handleSort('buyer')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Buyer</span>
                        {getSortIcon('buyer')}
                      </button>
                      <input
                        type="text"
                        placeholder="Filter..."
                        value={filters.buyer}
                        onChange={(e) => handleFilterChange('buyer', e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex flex-col space-y-1">
                      <button 
                        onClick={() => handleSort('style')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Style</span>
                        {getSortIcon('style')}
                      </button>
                      <input
                        type="text"
                        placeholder="Filter..."
                        value={filters.style}
                        onChange={(e) => handleFilterChange('style', e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex flex-col space-y-1">
                      <button 
                        onClick={() => handleSort('productCategory')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Product Category</span>
                        {getSortIcon('productCategory')}
                      </button>
                      <input
                        type="text"
                        placeholder="Filter..."
                        value={filters.productCategory}
                        onChange={(e) => handleFilterChange('productCategory', e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex flex-col space-y-1">
                      <button 
                        onClick={() => handleSort('sampleType')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Sample Type</span>
                        {getSortIcon('sampleType')}
                      </button>
                      <input
                        type="text"
                        placeholder="Filter..."
                        value={filters.sampleType}
                        onChange={(e) => handleFilterChange('sampleType', e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex flex-col space-y-1">
                      <button 
                        onClick={() => handleSort('color')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Color</span>
                        {getSortIcon('color')}
                      </button>
                      <input
                        type="text"
                        placeholder="Filter..."
                        value={filters.color}
                        onChange={(e) => handleFilterChange('color', e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('qtyInspected')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Qty Inspected</span>
                      {getSortIcon('qtyInspected')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('qtyPass')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Qty Pass</span>
                      {getSortIcon('qtyPass')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('qtyAlter')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Qty Alter</span>
                      {getSortIcon('qtyAlter')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('qtyAlterPass')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Qty Alter Pass</span>
                      {getSortIcon('qtyAlterPass')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button 
                      onClick={() => handleSort('qtyReject')}
                      className="flex items-center space-x-1 hover:text-gray-700"
                    >
                      <span>Qty Reject</span>
                      {getSortIcon('qtyReject')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex flex-col space-y-1">
                      <button 
                        onClick={() => handleSort('remarks')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Remarks</span>
                        {getSortIcon('remarks')}
                      </button>
                      <input
                        type="text"
                        placeholder="Filter..."
                        value={filters.remarks}
                        onChange={(e) => handleFilterChange('remarks', e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex flex-col space-y-1">
                      <button 
                        onClick={() => handleSort('qcName')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>QC Name</span>
                        {getSortIcon('qcName')}
                      </button>
                      <input
                        type="text"
                        placeholder="Filter..."
                        value={filters.qcName}
                        onChange={(e) => handleFilterChange('qcName', e.target.value)}
                        className="w-full px-2 py-1 text-xs border rounded"
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedData.length > 0 ? (
                  filteredAndSortedData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.buyer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.style}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.productCategory}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.sampleType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.color}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">{item.qtyInspected}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-center font-medium">{item.qtyPass}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 text-center font-medium">{item.qtyAlter}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-center font-medium">{item.qtyAlterPass}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-center font-medium">{item.qtyReject}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={item.remarks}>{item.remarks}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.qcName}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="px-6 py-8 text-center text-gray-500">
                      No QC data found for the selected date and filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 